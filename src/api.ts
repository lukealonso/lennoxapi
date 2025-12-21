/**
 * S30 API - Local LAN connection to Lennox thermostats
 */

import { Agent, fetch, Response } from 'undici';
import { S30Exception, ErrorCodes } from './exceptions';
import { LennoxSystem } from './system';
import {
  S30APIConfig,
  LennoxMessage,
  RetrieveResponse,
  LennoxHome,
} from './types';

// Default application ID prefix (matches Python implementation)
const APPLICATION_ID_PREFIX = 'mapp0793723676444670468270';

/**
 * S30API - Main API class for communicating with Lennox S30/E30/M30/S40 thermostats
 */
export class S30API {
  private readonly ipAddress: string;
  private readonly applicationId: string;
  private readonly protocol: 'http' | 'https';
  private readonly timeout: number;
  private readonly longPollDelay: number;
  private readonly dispatcher: Agent;

  // URL endpoints
  private readonly urlLogin: string;
  private readonly urlRetrieve: string;
  private readonly urlPublish: string;
  private readonly urlRequestData: string;
  private readonly urlLogout: string;

  // State
  private publishMessageId: number = 1;
  private homes: LennoxHome[] = [];
  public systems: LennoxSystem[] = [];

  constructor(config: S30APIConfig) {
    this.ipAddress = config.ipAddress;
    this.protocol = config.protocol ?? 'https';
    this.timeout = config.timeout ?? 300;
    this.longPollDelay = config.longPollDelay ?? 15;

    // Generate unique application ID if not provided
    if (config.appId) {
      this.applicationId = config.appId;
    } else {
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      this.applicationId = APPLICATION_ID_PREFIX.slice(0, -timestamp.length) + timestamp;
    }

    // Create dispatcher that bypasses SSL certificate validation
    // (Lennox thermostats use self-signed certificates)
    this.dispatcher = new Agent({
      connect: {
        rejectUnauthorized: false,
      },
    });

    // Initialize URLs
    this.urlLogin = `${this.protocol}://${this.ipAddress}/Endpoints/${this.applicationId}/Connect`;
    this.urlRetrieve = `${this.protocol}://${this.ipAddress}/Messages/${this.applicationId}/Retrieve`;
    this.urlPublish = `${this.protocol}://${this.ipAddress}/Messages/Publish`;
    this.urlRequestData = `${this.protocol}://${this.ipAddress}/Messages/RequestData`;
    this.urlLogout = `${this.protocol}://${this.ipAddress}/Endpoints/${this.applicationId}/Disconnect`;
  }

  /**
   * Returns the client ID for this connection
   */
  getClientId(): string {
    return this.applicationId;
  }

  /**
   * HTTP POST helper with SSL bypass
   */
  async post(url: string, body?: string | null): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ?? undefined,
        dispatcher: this.dispatcher,
      });
    } catch (error) {
      throw S30Exception.fromCommError(error as Error, 'POST', url);
    }
  }

  /**
   * HTTP GET helper with SSL bypass
   */
  async get(url: string): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'GET',
        dispatcher: this.dispatcher,
      });
    } catch (error) {
      throw S30Exception.fromCommError(error as Error, 'GET', url);
    }
  }

  /**
   * Connect to the local thermostat
   */
  async serverConnect(): Promise<void> {
    await this.login();
  }

  /**
   * Login to the local thermostat
   */
  async login(): Promise<void> {
    try {
      const response = await this.post(this.urlLogin);
      
      if (response.status !== 200 && response.status !== 204) {
        throw new S30Exception(
          `Login failed: response code [${response.status}] url=[${this.urlLogin}]`,
          ErrorCodes.EC_LOGIN,
          1
        );
      }

      // Setup local home and system structure
      this.setupLocalHomes();
    } catch (error) {
      if (error instanceof S30Exception) {
        throw error;
      }
      throw S30Exception.fromCommError(error as Error, 'login', this.urlLogin);
    }
  }

  /**
   * Setup home and system objects for local connection
   */
  private setupLocalHomes(): void {
    // Create a local home
    const home: LennoxHome = {
      id: 'local',
      idx: 0,
      name: 'local',
    };
    this.homes = [home];

    // Create a system with sysId "LCC" (Local Control Connection)
    const system = this.getOrCreateSystem('LCC');
    system.update(this, home, 0);
  }

  /**
   * Get or create a system by sysId
   */
  getOrCreateSystem(sysId: string): LennoxSystem {
    let system = this.systems.find(s => s.sysId === sysId);
    if (!system) {
      system = new LennoxSystem(sysId);
      this.systems.push(system);
    }
    return system;
  }

  /**
   * Get a system by sysId
   */
  getSystem(sysId: string): LennoxSystem | undefined {
    return this.systems.find(s => s.sysId === sysId);
  }

  /**
   * Logout from the thermostat
   */
  async logout(): Promise<void> {
    try {
      // S40 thermostats don't support logout
      const system = this.getSystem('LCC');
      if (system?.isS40) {
        return;
      }

      const response = await this.post(this.urlLogout);
      
      if (response.status !== 200 && response.status !== 204) {
        throw new S30Exception(
          `Logout failed: response code [${response.status}] url=[${this.urlLogout}]`,
          ErrorCodes.EC_LOGOUT,
          1
        );
      }
    } catch (error) {
      if (error instanceof S30Exception) {
        throw error;
      }
      throw S30Exception.fromCommError(error as Error, 'logout', this.urlLogout);
    }
  }

  /**
   * Shutdown the connection
   */
  async shutdown(): Promise<void> {
    await this.logout();
  }

  /**
   * Subscribe to system data by requesting initial data
   */
  async subscribe(system: LennoxSystem): Promise<void> {
    try {
      // Request first batch of data paths
      await this.requestDataHelper(
        system.sysId,
        '1;/systemControl;/systemController;/reminderSensors;/reminders;/alerts/active;/alerts/meta;/bleProvisionDB;/ble;/indoorAirQuality;/fwm;/rgw;/devices;/zones;/equipments;/schedules;/occupancy;/system'
      );

      // Request second batch of data paths
      await this.requestDataHelper(
        system.sysId,
        '1;/automatedTest;/zoneTestControl;/homes;/reminders;/algorithm;/historyReportFileDetails;/interfaces;/logs'
      );
    } catch (error) {
      if (error instanceof S30Exception) {
        throw error;
      }
      throw new S30Exception(
        `Subscribe failed for system [${system.sysId}]: ${(error as Error).message}`,
        ErrorCodes.EC_SUBSCRIBE,
        1
      );
    }
  }

  /**
   * Request data from the thermostat
   */
  async requestDataHelper(sysId: string, jsonPath: string): Promise<void> {
    const messageId = this.getNextMessageId();
    
    const message = {
      MessageType: 'RequestData',
      SenderID: this.applicationId,
      MessageID: messageId,
      TargetID: sysId,
      AdditionalParameters: {
        JSONPath: jsonPath,
      },
    };

    try {
      const response = await this.post(this.urlRequestData, JSON.stringify(message));
      const respText = await response.text();
      
      if (response.status !== 200 && response.status !== 204) {
        throw new S30Exception(
          `RequestData failed: status=[${response.status}] text=[${respText}]`,
          ErrorCodes.EC_REQUEST_DATA_HELPER,
          1
        );
      }
    } catch (error) {
      if (error instanceof S30Exception) {
        throw error;
      }
      throw S30Exception.fromCommError(error as Error, 'requestData', this.urlRequestData);
    }
  }

  /**
   * Poll for messages from the thermostat
   * Returns true if messages were received
   */
  async messagePump(): Promise<boolean> {
    // Use GET with query params like Python API
    const params = new URLSearchParams({
      Direction: 'Oldest-to-Newest',
      MessageCount: '10',
      StartTime: '1',
      LongPollingTimeout: String(this.longPollDelay),
    });
    const url = `${this.urlRetrieve}?${params.toString()}`;

    try {
      const response = await this.get(url);

      if (response.status === 204) {
        // No content - no messages
        return false;
      }

      if (response.status !== 200) {
        const text = await response.text();
        throw new S30Exception(
          `Retrieve failed: status=[${response.status}] text=[${text}]`,
          ErrorCodes.EC_HTTP_ERR,
          1
        );
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        return false;
      }
      
      const data = JSON.parse(text) as RetrieveResponse;
      
      if (!data.messages || data.messages.length === 0) {
        return false;
      }

      // Process each message
      for (const message of data.messages) {
        this.processMessage(message);
      }

      return true;
    } catch (error) {
      if (error instanceof S30Exception) {
        throw error;
      }
      throw S30Exception.fromCommError(error as Error, 'messagePump', url);
    }
  }

  /**
   * Process an incoming message and route to the appropriate system
   */
  processMessage(message: LennoxMessage): void {
    // Handle both SenderID and SenderId (case variations in API)
    const senderId = message.SenderID ?? (message as Record<string, unknown>).SenderId as string;
    
    
    if (!senderId) {
      return;
    }

    const system = this.getOrCreateSystem(senderId);
    
    if (message.Data) {
      system.processMessage(message.Data as Record<string, unknown>);
    }
  }

  /**
   * Process a cloud-style login response to set up homes and systems
   */
  processLoginResponse(data: Record<string, unknown>): void {
    // Process readyHomes structure from cloud login
    if ('readyHomes' in data) {
      const readyHomes = data.readyHomes as { homes: Array<{
        id: number;
        homeId: string;
        name: string;
        systems: Array<{ id: number; sysId: string }>;
      }> };

      for (const home of readyHomes.homes) {
        const lhome: LennoxHome = {
          id: home.homeId,
          idx: home.id,
          name: home.name,
        };
        this.homes.push(lhome);

        for (const sys of home.systems) {
          const system = this.getOrCreateSystem(sys.sysId);
          system.update(this, lhome, sys.id);
        }
      }
    }
  }

  /**
   * Get the next message ID
   */
  private getNextMessageId(): string {
    const id = this.publishMessageId;
    this.publishMessageId++;
    return id.toString();
  }

  /**
   * Publish a command message to the thermostat
   */
  async publishMessage(sysId: string, data: Record<string, unknown>): Promise<void> {
    const messageId = this.getNextMessageId();

    const message = {
      MessageType: 'Command',
      SenderID: this.applicationId,
      MessageID: messageId,
      TargetID: sysId,
      Data: data,
    };

    try {
      const response = await this.post(this.urlPublish, JSON.stringify(message));

      if (response.status !== 200 && response.status !== 204) {
        const text = await response.text();
        throw new S30Exception(
          `Publish failed: status=[${response.status}] text=[${text}]`,
          ErrorCodes.EC_PUBLISH_MESSAGE,
          1
        );
      }
    } catch (error) {
      if (error instanceof S30Exception) {
        throw error;
      }
      throw S30Exception.fromCommError(error as Error, 'publishMessage', this.urlPublish);
    }
  }

  /**
   * Helper to publish a message with raw string data (for compatibility with Python API tests)
   */
  async publishMessageHelper(sysId: string, dataString: string): Promise<void> {
    // Parse the data string which is in format: "Data":{...}
    const fullJson = `{${dataString}}`;
    const parsed = JSON.parse(fullJson);
    await this.publishMessage(sysId, parsed.Data);
  }

  /**
   * Set HVAC mode for a system
   */
  async setHVACMode(sysId: string, mode: string, scheduleId: number): Promise<void> {
    await this.setModeHelper(sysId, 'systemMode', mode, scheduleId);
  }

  /**
   * Set fan mode for a system
   */
  async setFanMode(sysId: string, mode: string, scheduleId: number): Promise<void> {
    await this.setModeHelper(sysId, 'fanMode', mode, scheduleId);
  }

  /**
   * Set humidity mode for a system
   */
  async setHumidityMode(sysId: string, mode: string, scheduleId: number): Promise<void> {
    await this.setModeHelper(sysId, 'humidityMode', mode, scheduleId);
  }

  /**
   * Helper for setting modes (HVAC, fan, humidity)
   */
  private async setModeHelper(sysId: string, modeTarget: string, mode: string, scheduleId: number): Promise<void> {
    const data = {
      schedules: [{
        id: scheduleId,
        schedule: {
          periods: [{
            id: 0,
            period: {
              [modeTarget]: mode,
            },
          }],
        },
      }],
    };

    await this.publishMessage(sysId, data);
  }

  /**
   * Set manual away mode
   */
  async setManualAwayMode(sysId: string, mode: boolean): Promise<void> {
    const data = {
      occupancy: {
        manualAway: mode,
      },
    };

    await this.publishMessage(sysId, data);
  }

  /**
   * Cancel smart away mode
   */
  async cancelSmartAway(sysId: string): Promise<void> {
    const data = {
      occupancy: {
        smartAway: {
          config: {
            cancel: true,
          },
        },
      },
    };

    await this.publishMessage(sysId, data);
  }

  /**
   * Enable or disable smart away
   */
  async enableSmartAway(sysId: string, mode: boolean): Promise<void> {
    const data = {
      occupancy: {
        smartAway: {
          config: {
            enabled: mode,
          },
        },
      },
    };

    await this.publishMessage(sysId, data);
  }
}

