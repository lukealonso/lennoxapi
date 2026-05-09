/**
 * LennoxSystem - Represents a Lennox control system (S30/E30/M30/S40)
 */

import type { S30API } from './api';
import { LennoxZone } from './zone';
import {
  CallbackEntry,
  LennoxHome,
  LennoxSchedule,
  LennoxPeriod,
  LENNOX_ZONING_MODE_ZONED,
  LENNOX_MANUAL_MODE_SCHEDULE_START_INDEX,
  LENNOX_PARAMETER_SINGLE_SETPOINT_MODE,
  LENNOX_PRODUCT_TYPE_S40,
} from './types';

/**
 * LennoxSystem - Represents a Lennox HVAC system
 */
export class LennoxSystem {
  public readonly sysId: string;
  public api!: S30API;
  public home!: LennoxHome;
  public idx: number = 0;

  // Zone list
  public zones: LennoxZone[] = [];

  // Schedules
  private schedules: LennoxSchedule[] = [];

  // Callback system
  private callbacks: CallbackEntry[] = [];
  private dirty: boolean = false;
  private dirtyList: string[] = [];

  // System identification
  public name: string | null = null;
  public serialNumber: string | null = null;
  public productType: string | null = null;
  public temperatureUnit: string | null = null;

  // Outdoor conditions
  public outdoorTemperature: number | null = null;
  public outdoorTemperatureC: number | null = null;
  public outdoorTemperatureStatus: string | null = null;

  // Away mode
  public manualAwayMode: boolean | null = null;

  // Smart Away
  public saEnabled: boolean | null = null;
  public saReset: boolean | null = null;
  public saCancel: boolean | null = null;
  public saState: string | null = null;
  public saSetpointState: string | null = null;

  // Single setpoint (perfect temp) mode
  public singleSetpointMode: boolean = false;

  // Zoning
  public numberOfZones: number | null = null;
  public zoningMode: string | null = null;
  public centralMode: boolean | null = null;

  // Ventilation
  public ventilationMode: string | null = null;
  public ventilationRemainingTime: number | null = null;
  public ventilatingUntilTime: string | null = null;
  public ventilationUnitType: string | null = null;
  public ventilationControlMode: string | null = null;

  // Allergen defender
  public allergenDefender: boolean | null = null;

  // Circulation time (percentage, 15-45)
  public circulateTime: number | null = null;

  // Humidity settings
  public humidificationMode: string | null = null;
  public dehumidificationMode: string | null = null;
  public enhancedDehumidificationOvercoolingF: number | null = null;
  public enhancedDehumidificationOvercoolingC: number | null = null;
  public enhancedDehumidificationOvercoolingF_enable: boolean | null = null;
  public enhancedDehumidificationOvercoolingC_enable: boolean | null = null;
  public enhancedDehumidificationOvercoolingF_min: number | null = null;
  public enhancedDehumidificationOvercoolingF_max: number | null = null;
  public enhancedDehumidificationOvercoolingF_inc: number | null = null;
  public enhancedDehumidificationOvercoolingC_min: number | null = null;
  public enhancedDehumidificationOvercoolingC_max: number | null = null;
  public enhancedDehumidificationOvercoolingC_inc: number | null = null;

  // Equipment info
  public indoorUnitType: string | null = null;
  public outdoorUnitType: string | null = null;
  public humidifierType: string | null = null;
  public dehumidifierType: string | null = null;

  // System status
  public sysUpTime: number | null = null;
  public diagLevel: number | null = null;
  public softwareVersion: string | null = null;
  public relayServerConnected: boolean | null = null;
  public internetStatus: boolean | null = null;
  public cloudStatus: string | null = null;

  // Setpoint deadband
  public hspCspSeparation: number = 3;
  public hspCCspCSeparation: number = 1.5;

  // Equipment storage
  public equipment: Map<number, Record<string, unknown>> = new Map();

  constructor(sysId: string) {
    this.sysId = sysId;
  }

  /**
   * Update system with API and home references
   */
  update(api: S30API, home: LennoxHome, idx: number): void {
    this.api = api;
    this.home = home;
    this.idx = idx;
  }

  /**
   * Unique ID for this system
   */
  get uniqueId(): string {
    return this.serialNumber ?? this.sysId;
  }

  /**
   * Check if this is an S40 thermostat
   */
  get isS40(): boolean {
    return this.productType === LENNOX_PRODUCT_TYPE_S40;
  }

  /**
   * Register a callback for state changes
   */
  registerOnUpdateCallback(callback: () => void, match?: string[] | null): void {
    this.callbacks.push({ func: callback, match: match ?? null });
  }

  /**
   * Execute registered callbacks if dirty
   */
  executeOnUpdateCallbacks(): void {
    if (!this.dirty) return;

    for (const entry of this.callbacks) {
      let matches = false;
      if (!entry.match) {
        matches = true;
      } else {
        for (const m of entry.match) {
          if (this.dirtyList.includes(m)) {
            matches = true;
            break;
          }
        }
      }

      if (matches) {
        try {
          entry.func();
        } catch (error) {
          console.error('Callback execution failed:', error);
        }
      }
    }

    this.dirty = false;
    this.dirtyList = [];
  }

  /**
   * Update an attribute if it has changed
   */
  private attrUpdater<K extends keyof this>(obj: Record<string, unknown>, sourceKey: string, targetKey?: K): boolean {
    const key = targetKey ?? (sourceKey as unknown as K);
    if (sourceKey in obj) {
      const newValue = obj[sourceKey] as this[K];
      if (this[key] !== newValue) {
        this[key] = newValue;
        this.dirty = true;
        const keyStr = String(key);
        if (!this.dirtyList.includes(keyStr)) {
          this.dirtyList.push(keyStr);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Get a zone by ID
   */
  getZone(zoneId: number): LennoxZone | undefined {
    return this.zones.find(z => z.id === zoneId);
  }

  /**
   * Get or create a zone
   */
  getOrCreateZone(zoneId: number): LennoxZone {
    let zone = this.getZone(zoneId);
    if (!zone) {
      zone = new LennoxZone(this, zoneId);
      this.zones.push(zone);
    }
    return zone;
  }

  /**
   * Get a schedule by ID
   */
  getSchedule(scheduleId: number): LennoxSchedule | undefined {
    return this.schedules.find(s => s.id === scheduleId);
  }

  /**
   * Get a schedule by name
   */
  getScheduleByName(name: string): LennoxSchedule | undefined {
    return this.schedules.find(s => s.name === name);
  }

  /**
   * Get all schedules (excluding internal ones)
   */
  getSchedules(): LennoxSchedule[] {
    return this.schedules.filter(s => s.id < LENNOX_MANUAL_MODE_SCHEDULE_START_INDEX);
  }

  /**
   * Check if the system is in away mode (manual or smart)
   */
  getAwayMode(): boolean {
    return this.getManualAwayMode() || this.getSmartAwayMode();
  }

  /**
   * Check if manual away mode is active
   */
  getManualAwayMode(): boolean {
    return this.manualAwayMode === true;
  }

  /**
   * Check if smart away mode is active
   */
  getSmartAwayMode(): boolean {
    return this.saState === 'enabled active';
  }

  /**
   * Check if zoning is enabled
   */
  isZoningEnabled(): boolean {
    return this.zoningMode === LENNOX_ZONING_MODE_ZONED;
  }

  /**
   * Check if ventilation is supported
   */
  supportsVentilation(): boolean {
    return this.ventilationUnitType !== null && this.ventilationUnitType !== 'none';
  }

  /**
   * Check if configuration is complete (has name and at least one zone)
   */
  configComplete(): boolean {
    return this.name !== null && this.zones.length > 0;
  }

  /**
   * Process an incoming message
   */
  processMessage(data: Record<string, unknown>): void {
    // Process system configuration
    if ('system' in data) {
      this.processSystemMessage(data.system as Record<string, unknown>);
    }

    // Process zones
    if ('zones' in data) {
      this.processZonesMessage(data.zones as Record<string, unknown>[]);
    }

    // Process schedules
    if ('schedules' in data) {
      this.processSchedulesMessage(data.schedules as Record<string, unknown>[]);
    }

    // Process occupancy (away mode)
    if ('occupancy' in data) {
      this.processOccupancyMessage(data.occupancy as Record<string, unknown>);
    }

    // Process equipment
    if ('equipments' in data) {
      this.processEquipmentsMessage(data.equipments as Record<string, unknown>[]);
    }

    // Process devices (for product type)
    if ('devices' in data) {
      this.processDevicesMessage(data.devices as Record<string, unknown>[]);
    }

    // Execute callbacks
    this.executeOnUpdateCallbacks();

    // Execute zone callbacks
    for (const zone of this.zones) {
      zone.executeOnUpdateCallbacks();
    }
  }

  /**
   * Process system configuration message
   */
  private processSystemMessage(system: Record<string, unknown>): void {
    if ('config' in system) {
      const config = system.config as Record<string, unknown>;
      this.attrUpdater(config, 'name');
      this.attrUpdater(config, 'temperatureUnit');
      this.attrUpdater(config, 'allergenDefender');
      this.attrUpdater(config, 'circulateTime');
      this.attrUpdater(config, 'humidificationMode');
      this.attrUpdater(config, 'dehumidificationMode');
      this.attrUpdater(config, 'ventilationMode');

      // Enhanced dehumidification - can be either a number or an object
      if ('enhancedDehumidificationOvercoolingF' in config) {
        const edhF = config.enhancedDehumidificationOvercoolingF;
        if (typeof edhF === 'number') {
          this.enhancedDehumidificationOvercoolingF = edhF;
        } else if (typeof edhF === 'object' && edhF !== null) {
          const edhFObj = edhF as Record<string, unknown>;
          this.attrUpdater(edhFObj, 'enable', 'enhancedDehumidificationOvercoolingF_enable');
          this.attrUpdater(edhFObj, 'value', 'enhancedDehumidificationOvercoolingF');
          this.attrUpdater(edhFObj, 'min', 'enhancedDehumidificationOvercoolingF_min');
          this.attrUpdater(edhFObj, 'max', 'enhancedDehumidificationOvercoolingF_max');
          this.attrUpdater(edhFObj, 'inc', 'enhancedDehumidificationOvercoolingF_inc');
        }
      }
      if ('enhancedDehumidificationOvercoolingC' in config) {
        const edhC = config.enhancedDehumidificationOvercoolingC;
        if (typeof edhC === 'number') {
          this.enhancedDehumidificationOvercoolingC = edhC;
        } else if (typeof edhC === 'object' && edhC !== null) {
          const edhCObj = edhC as Record<string, unknown>;
          this.attrUpdater(edhCObj, 'enable', 'enhancedDehumidificationOvercoolingC_enable');
          this.attrUpdater(edhCObj, 'value', 'enhancedDehumidificationOvercoolingC');
          this.attrUpdater(edhCObj, 'min', 'enhancedDehumidificationOvercoolingC_min');
          this.attrUpdater(edhCObj, 'max', 'enhancedDehumidificationOvercoolingC_max');
          this.attrUpdater(edhCObj, 'inc', 'enhancedDehumidificationOvercoolingC_inc');
        }
      }

      // Zoning
      this.attrUpdater(config, 'centralMode');
      this.attrUpdater(config, 'numberOfZones');

      // Ventilation (can be in config or config.options)
      if ('ventilationConfig' in config) {
        const ventConfig = config.ventilationConfig as Record<string, unknown>;
        this.attrUpdater(ventConfig, 'unitType', 'ventilationUnitType');
        this.attrUpdater(ventConfig, 'controlMode', 'ventilationControlMode');
      }
      if ('options' in config) {
        const options = config.options as Record<string, unknown>;
        if ('ventilation' in options) {
          const ventOpts = options.ventilation as Record<string, unknown>;
          this.attrUpdater(ventOpts, 'unitType', 'ventilationUnitType');
          this.attrUpdater(ventOpts, 'controlMode', 'ventilationControlMode');
        }
        // Product type from options
        this.attrUpdater(options, 'productType');
        this.attrUpdater(options, 'indoorUnitType');
        this.attrUpdater(options, 'outdoorUnitType');
        this.attrUpdater(options, 'humidifierType');
        this.attrUpdater(options, 'dehumidifierType');
      }
    }

    if ('status' in system) {
      const status = system.status as Record<string, unknown>;
      this.attrUpdater(status, 'outdoorTemperature');
      this.attrUpdater(status, 'outdoorTemperatureC');
      this.attrUpdater(status, 'outdoorTemperatureStatus');
      this.attrUpdater(status, 'zoningMode');
      this.attrUpdater(status, 'ventilationRemainingTime');
      this.attrUpdater(status, 'ventilatingUntilTime');
    }

    // Registration/product info
    if ('registration' in system) {
      const reg = system.registration as Record<string, unknown>;
      this.attrUpdater(reg, 'serialNumber');
      this.attrUpdater(reg, 'productType');
    }

    // Humidity equipment
    if ('humidifierType' in system) {
      this.attrUpdater(system, 'humidifierType');
    }
    if ('dehumidifierType' in system) {
      this.attrUpdater(system, 'dehumidifierType');
    }
    if ('indoorUnitType' in system) {
      this.attrUpdater(system, 'indoorUnitType');
    }
    if ('outdoorUnitType' in system) {
      this.attrUpdater(system, 'outdoorUnitType');
    }
  }

  /**
   * Process zones message
   */
  private processZonesMessage(zones: Record<string, unknown>[]): void {
    for (const zoneData of zones) {
      if ('id' in zoneData) {
        const zoneId = zoneData.id as number;
        const zone = this.getOrCreateZone(zoneId);
        zone.processMessage(zoneData);
      }
    }
  }

  /**
   * Process schedules message
   */
  private processSchedulesMessage(schedules: Record<string, unknown>[]): void {
    for (const schedData of schedules) {
      if ('id' in schedData) {
        const scheduleId = schedData.id as number;
        let schedule = this.getSchedule(scheduleId);
        
        if (!schedule) {
          schedule = { id: scheduleId, name: '', periods: [] };
          this.schedules.push(schedule);
        }

        if ('schedule' in schedData) {
          const schedInfo = schedData.schedule as Record<string, unknown>;
          if ('name' in schedInfo) {
            schedule.name = schedInfo.name as string;
          }

          if ('periods' in schedInfo) {
            const periods = schedInfo.periods as Record<string, unknown>[];
            schedule.periods = [];
            for (const periodData of periods) {
              if ('id' in periodData && 'period' in periodData) {
                const periodId = periodData.id as number;
                const p = periodData.period as Record<string, unknown>;
                const period: LennoxPeriod = {
                  id: periodId,
                  enabled: p.enabled as boolean | undefined,
                  startTime: p.startTime as number | undefined,
                  hsp: p.hsp as number | undefined,
                  hspC: p.hspC as number | undefined,
                  csp: p.csp as number | undefined,
                  cspC: p.cspC as number | undefined,
                  sp: p.sp as number | undefined,
                  spC: p.spC as number | undefined,
                  husp: p.husp as number | undefined,
                  desp: p.desp as number | undefined,
                  fanMode: p.fanMode as string | undefined,
                  systemMode: p.systemMode as string | undefined,
                  humidityMode: p.humidityMode as string | undefined,
                };
                schedule.periods!.push(period);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Process occupancy message (away mode)
   */
  private processOccupancyMessage(occupancy: Record<string, unknown>): void {
    this.attrUpdater(occupancy, 'manualAway', 'manualAwayMode');

    if ('smartAway' in occupancy) {
      const smartAway = occupancy.smartAway as Record<string, unknown>;
      if ('config' in smartAway) {
        const config = smartAway.config as Record<string, unknown>;
        this.attrUpdater(config, 'enabled', 'saEnabled');
        this.attrUpdater(config, 'reset', 'saReset');
        this.attrUpdater(config, 'cancel', 'saCancel');
      }
      if ('status' in smartAway) {
        const status = smartAway.status as Record<string, unknown>;
        this.attrUpdater(status, 'state', 'saState');
        this.attrUpdater(status, 'setpointState', 'saSetpointState');
      }
    }
  }

  /**
   * Process equipments message
   */
  private processEquipmentsMessage(equipments: Record<string, unknown>[]): void {
    for (const equip of equipments) {
      if ('id' in equip) {
        const equipId = equip.id as number;
        this.equipment.set(equipId, equip);

        // Check for single setpoint mode parameter
        if ('equipment' in equip) {
          const equipData = equip.equipment as Record<string, unknown>;
          if ('parameters' in equipData) {
            const params = equipData.parameters as Array<{ id: number; parameter: Record<string, unknown> }>;
            for (const param of params) {
              // Parameters have structure: { id: N, parameter: { pid: ..., value: ... } }
              if ('parameter' in param) {
                const paramData = param.parameter;
                if (paramData.pid === LENNOX_PARAMETER_SINGLE_SETPOINT_MODE) {
                  const value = paramData.value as string;
                  this.singleSetpointMode = value === '1';
                  this.dirty = true;
                  if (!this.dirtyList.includes('singleSetpointMode')) {
                    this.dirtyList.push('singleSetpointMode');
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Process devices message
   */
  private processDevicesMessage(devices: Record<string, unknown>[]): void {
    for (const device of devices) {
      if ('device' in device) {
        const deviceData = device.device as Record<string, unknown>;
        this.attrUpdater(deviceData, 'sysUpTime');
        this.attrUpdater(deviceData, 'diagLevel');
        this.attrUpdater(deviceData, 'softwareVersion');
        this.attrUpdater(deviceData, 'productType');
        this.attrUpdater(deviceData, 'serialNumber');
      }
    }
  }

  // =========================================================================
  // Control Methods
  // =========================================================================

  /**
   * Set manual away mode
   */
  async setManualAwayMode(mode: boolean): Promise<void> {
    await this.api.setManualAwayMode(this.sysId, mode);
    this.processMessage({
      occupancy: {
        manualAway: mode,
      },
    });
  }

  /**
   * Cancel smart away mode
   */
  async cancelSmartAway(): Promise<void> {
    await this.api.cancelSmartAway(this.sysId);
    this.processMessage({
      occupancy: {
        smartAway: {
          config: {
            cancel: true,
          },
        },
      },
    });
  }

  /**
   * Enable or disable smart away
   */
  async enableSmartAway(mode: boolean): Promise<void> {
    await this.api.enableSmartAway(this.sysId, mode);
    this.processMessage({
      occupancy: {
        smartAway: {
          config: {
            enabled: mode,
          },
        },
      },
    });
  }

  /**
   * Turn ventilation on
   */
  async ventilationOn(): Promise<void> {
    await this.ventilationHelper('on');
  }

  /**
   * Turn ventilation off
   */
  async ventilationOff(): Promise<void> {
    await this.ventilationHelper('off');
  }

  /**
   * Set ventilation to installer mode
   */
  async ventilationInstaller(): Promise<void> {
    await this.ventilationHelper('installer');
  }

  /**
   * Helper for ventilation mode changes
   */
  private async ventilationHelper(mode: string): Promise<void> {
    const data = {
      system: {
        config: {
          ventilationMode: mode,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Set timed ventilation
   */
  async ventilationTimed(durationSecs: number): Promise<void> {
    const data = {
      system: {
        config: {
          ventilationRemainingTime: durationSecs,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Turn allergen defender on
   */
  async allergenDefenderOn(): Promise<void> {
    const data = {
      system: {
        config: {
          allergenDefender: true,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Turn allergen defender off
   */
  async allergenDefenderOff(): Promise<void> {
    const data = {
      system: {
        config: {
          allergenDefender: false,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Enable central mode (disable zoning)
   */
  async centralModeOn(): Promise<void> {
    const data = {
      system: {
        config: {
          centralMode: true,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Disable central mode (enable zoning)
   */
  async centralModeOff(): Promise<void> {
    const data = {
      system: {
        config: {
          centralMode: false,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Set fan circulation time (in minutes, converted to percentage)
   */
  async setCirculateTime(minutes: number): Promise<void> {
    // Convert minutes (9-27) to percentage (15-45)
    const percentage = Math.round((minutes / 60) * 100);
    const data = {
      system: {
        config: {
          circulateTime: percentage,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Set dehumidification mode
   */
  async setDehumidificationMode(mode: string): Promise<void> {
    const data = {
      system: {
        config: {
          dehumidificationMode: mode,
        },
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Set enhanced dehumidification overcooling
   */
  async setEnhancedDehumidificationOvercooling(options: { f?: number; c?: number }): Promise<void> {
    const config: Record<string, unknown> = {};
    
    if (options.f !== undefined) {
      config.enhancedDehumidificationOvercoolingF = { value: options.f };
    }
    if (options.c !== undefined) {
      config.enhancedDehumidificationOvercoolingC = { value: options.c };
    }

    const data = {
      system: {
        config,
      },
    };
    await this.api.publishMessage(this.sysId, data);
    this.processMessage(data);
  }

  /**
   * Set HVAC mode (delegates to zone)
   */
  async setHVACMode(mode: string, scheduleId: number): Promise<void> {
    await this.api.setHVACMode(this.sysId, mode, scheduleId);
  }

  /**
   * Set fan mode (delegates to zone)
   */
  async setFanMode(mode: string, scheduleId: number): Promise<void> {
    await this.api.setFanMode(this.sysId, mode, scheduleId);
  }

  /**
   * Set humidity mode (delegates to zone)
   */
  async setHumidityMode(mode: string, scheduleId: number): Promise<void> {
    await this.api.setHumidityMode(this.sysId, mode, scheduleId);
  }

  // =========================================================================
  // Temperature Conversion Utilities
  // =========================================================================

  /**
   * Round Fahrenheit to nearest integer
   */
  farenRound(f: number): number {
    return Math.round(f);
  }

  /**
   * Round Celsius to nearest 0.5
   */
  celsiusRound(c: number): number {
    return Math.round(c * 2) / 2;
  }

  /**
   * Convert Fahrenheit to Celsius
   */
  convertFtoC(tempF: number, noOffset: boolean = false): number {
    let tempC: number;
    if (noOffset) {
      tempC = tempF * (5.0 / 9.0);
    } else {
      tempC = (tempF - 32.0) * (5.0 / 9.0);
    }
    return this.celsiusRound(tempC);
  }

  /**
   * Convert Celsius to Fahrenheit
   */
  convertCtoF(tempC: number, noOffset: boolean = false): number {
    let tempF: number;
    if (noOffset) {
      tempF = tempC * (9.0 / 5.0);
    } else {
      tempF = (tempC * (9.0 / 5.0)) + 32.0;
    }
    return this.farenRound(tempF);
  }
}
