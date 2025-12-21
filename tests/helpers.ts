/**
 * Test helpers for lennoxs30api tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { S30API } from '../src/api';
import { LennoxMessage } from '../src/types';

/**
 * Load a JSON file from the messages directory
 */
export function loadFile(name: string, sysId?: string): LennoxMessage {
  const filePath = path.join(__dirname, 'messages', name);
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content) as Record<string, unknown>;
  
  // Normalize SenderId to SenderID (API uses both)
  if ('SenderId' in data && !('SenderID' in data)) {
    data.SenderID = data.SenderId;
    delete data.SenderId;
  }
  
  if (sysId !== undefined) {
    data.SenderID = sysId;
  }
  
  return data as unknown as LennoxMessage;
}

/**
 * Create a test API instance with cloud-style login response loaded
 */
export function createTestApi(): S30API {
  const api = new S30API({
    ipAddress: '10.0.0.1',
    protocol: 'https',
  });

  // Load and process login response (sets up homes and systems)
  const loginData = loadFile('login_response.json');
  api.processLoginResponse(loginData as unknown as Record<string, unknown>);

  // Load config responses - use the SenderId from the files
  const config1 = loadFile('config_response_system_01.json');
  api.processMessage(config1);

  const config2 = loadFile('config_response_system_02.json');
  api.processMessage(config2);

  const config3 = loadFile('config_system_03_heatpump_and_furnace.json');
  api.processMessage(config3);

  // Load equipment with split setpoint mode
  const equipment = loadFile('equipments_lcc_splitsetpoint.json', '0000000-0000-0000-0000-000000000001');
  api.processMessage(equipment);

  return api;
}

/**
 * Create a test API instance with single setpoint mode
 */
export function createTestApiSingleSetpoint(): S30API {
  const api = new S30API({
    ipAddress: '10.0.0.1',
    protocol: 'https',
  });

  // Load and process login response
  const loginData = loadFile('login_response.json');
  api.processLoginResponse(loginData as unknown as Record<string, unknown>);

  // Load config responses
  const config1 = loadFile('config_response_system_01.json');
  api.processMessage(config1);

  const config2 = loadFile('config_response_system_02.json');
  api.processMessage(config2);

  const config3 = loadFile('config_system_03_heatpump_and_furnace.json');
  api.processMessage(config3);

  // Load equipment with single setpoint mode
  const equipment = loadFile('equipments_lcc_singlesetpoint.json', '0000000-0000-0000-0000-000000000001');
  api.processMessage(equipment);

  return api;
}

/**
 * Create a test API instance configured for local LAN connection
 */
export function createTestApiLocal(): S30API {
  const api = new S30API({
    ipAddress: '10.0.0.1',
    protocol: 'https',
  });

  // Setup local homes
  api['setupLocalHomes']();

  // Load system config
  const config = loadFile('system_04_furn_ac_zoning_config.json', 'LCC');
  api.processMessage(config);

  const equipment = loadFile('system_04_furn_ac_zoning_equipment.json', 'LCC');
  api.processMessage(equipment);

  const devices = loadFile('system_04_furn_ac_zoning_devices.json', 'LCC');
  api.processMessage(devices);

  const zones = loadFile('system_04_furn_ac_zoning_zones.json', 'LCC');
  api.processMessage(zones);

  return api;
}

/**
 * Create a test API instance with M30 configuration
 */
export function createTestApiM30(): S30API {
  const api = new S30API({
    ipAddress: '10.0.0.1',
    protocol: 'https',
  });

  // Setup local homes
  api['setupLocalHomes']();

  // Load M30 config
  const config = loadFile('m30_config_response.json');
  api.processMessage(config);

  const devices = loadFile('m30_device_response.json');
  api.processMessage(devices);

  return api;
}

/**
 * Extract the published data from a mock call
 */
export function extractPublishedData(mockFn: jest.Mock): Record<string, unknown> | null {
  if (mockFn.mock.calls.length === 0) {
    return null;
  }
  // publishMessage(sysId, data) - data is the second argument
  return mockFn.mock.calls[0][1] as Record<string, unknown>;
}

/**
 * Extract the sysId from a mock publish call
 */
export function extractPublishedSysId(mockFn: jest.Mock): string | null {
  if (mockFn.mock.calls.length === 0) {
    return null;
  }
  return mockFn.mock.calls[0][0] as string;
}

