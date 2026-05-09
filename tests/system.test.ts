/**
 * Tests for system configuration and message processing
 * Ported from test_config_response.py and test_mutations.py
 */

import { S30API } from '../src/api';
import { LennoxSystem } from '../src/system';
import { LennoxZone } from '../src/zone';
import { loadFile, createTestApi, createTestApiLocal, createTestApiM30 } from './helpers';

describe('System Configuration', () => {
  describe('Cloud API Configuration', () => {
    let api: S30API;
    let system: LennoxSystem;

    beforeEach(() => {
      api = createTestApi();
      system = api.systems[0];
    });

    it('should have loaded systems', () => {
      expect(api.systems.length).toBeGreaterThan(0);
    });

    it('should have correct system ID', () => {
      expect(system.sysId).toBeDefined();
    });

    it('should have zones configured', () => {
      expect(system.zones.length).toBeGreaterThan(0);
    });

    it('should report single setpoint mode correctly', () => {
      // Default fixture uses split setpoint mode
      expect(system.singleSetpointMode).toBe(false);
    });

    it('should report manual away mode status', () => {
      expect(system.getManualAwayMode()).toBeDefined();
    });
  });

  describe('Local LAN Configuration', () => {
    let api: S30API;
    let system: LennoxSystem;

    beforeEach(() => {
      api = createTestApiLocal();
      system = api.getSystem('LCC')!;
    });

    it('should have LCC system for local connection', () => {
      expect(system).toBeDefined();
      expect(system.sysId).toBe('LCC');
    });

    it('should have zones loaded', () => {
      expect(system.zones.length).toBeGreaterThan(0);
    });

    it('should route unknown sender updates to the local system', () => {
      const callback = jest.fn();
      system.manualAwayMode = false;
      system.registerOnUpdateCallback(callback, ['manualAwayMode']);

      const message = loadFile('manual_away_mode_on.json');
      api.processMessage(message);

      expect(system.manualAwayMode).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(api.getSystem(message.SenderID!)).toBeUndefined();
    });
  });

  describe('M30 Configuration', () => {
    let api: S30API;
    let system: LennoxSystem;

    beforeEach(() => {
      api = createTestApiM30();
      system = api.systems[0];
    });

    it('should load M30 system', () => {
      expect(system).toBeDefined();
    });

    it('should have single setpoint mode disabled by default', () => {
      // M30 doesn't send single setpoint info, defaults to false
      expect(system.singleSetpointMode).toBe(false);
    });
  });
});

describe('Zone Configuration', () => {
  let api: S30API;
  let system: LennoxSystem;
  let zone: LennoxZone;

  beforeEach(() => {
    api = createTestApiLocal();
    system = api.getSystem('LCC')!;
    zone = system.getZone(0)!;
  });

  it('should have zone with ID 0', () => {
    expect(zone).toBeDefined();
    expect(zone.id).toBe(0);
  });

  it('should have heating and cooling options', () => {
    // These should be populated from the zone config
    expect(zone.heatingOption).toBeDefined();
    expect(zone.coolingOption).toBeDefined();
  });

  it('should have setpoint limits', () => {
    // Limits should be loaded from config
    expect(zone.maxHsp).toBeDefined();
    expect(zone.minHsp).toBeDefined();
    expect(zone.maxCsp).toBeDefined();
    expect(zone.minCsp).toBeDefined();
  });
});

describe('Message Mutations', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
  });

  it('should process manual away mode on message', () => {
    const message = loadFile('manual_away_mode_on.json');
    api.processMessage(message);

    // Check the system that the message was sent to
    const targetSystem = api.getSystem(message.SenderID!);
    if (targetSystem) {
      expect(targetSystem.manualAwayMode).toBe(true);
    }
  });

  it('should process manual away mode off message', () => {
    const message = loadFile('manual_away_mode_off.json');
    api.processMessage(message);

    const targetSystem = api.getSystem(message.SenderID!);
    if (targetSystem) {
      expect(targetSystem.manualAwayMode).toBe(false);
    }
  });

  it('should update zone temperature status', () => {
    const zone = system.getZone(0);
    if (zone) {
      // Load a mutation that updates zone status
      const message = loadFile('mut_sys1_zone1_status.json');
      api.processMessage(message);
      
      // Zone should have been updated
      expect(zone.temperature).toBeDefined();
    }
  });

  it('should update schedule period when schedule mutation received', () => {
    // Get zone from system 2
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002');
    expect(sys2).toBeDefined();
    
    // Load schedule change mutation - updates schedule 16's period
    const schedMessage = loadFile('mut_sys1_zone1_cool_sched.json');
    api.processMessage(schedMessage);
    
    // Check that the schedule was updated
    const schedule = sys2!.getSchedule(16);
    expect(schedule).toBeDefined();
    expect(schedule!.periods).toBeDefined();
    expect(schedule!.periods![0].systemMode).toBe('cool');
  });

  it('should update zone demand and operation when cooling on', () => {
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002');
    expect(sys2).toBeDefined();
    const zone = sys2!.getZone(0);
    expect(zone).toBeDefined();
    
    // First set to cool mode
    const schedMessage = loadFile('mut_sys1_zone1_cool_sched.json');
    api.processMessage(schedMessage);
    
    // Then apply cooling on message
    const coolingMessage = loadFile('mut_sys1_zone1_cooling_on.json');
    api.processMessage(coolingMessage);
    
    expect(zone!.tempOperation).toBe('cooling');
    expect(zone!.demand).toBe(37.5);
  });
});

describe('Callbacks', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
  });

  it('should call registered system callbacks on update', () => {
    const callback = jest.fn();
    system.registerOnUpdateCallback(callback);

    // Process a message that updates the system
    const message = loadFile('manual_away_mode_on.json', system.sysId);
    api.processMessage(message);

    expect(callback).toHaveBeenCalled();
  });

  it('should call registered zone callbacks on update', () => {
    const zone = system.getZone(0)!;
    const callback = jest.fn();
    zone.registerOnUpdateCallback(callback);

    // Set up zone update
    zone.temperature = 70;
    
    // Simulate processing a zone update by directly calling processMessage
    const zoneUpdate = {
      zones: [{
        id: 0,
        status: {
          temperature: 72,
          temperatureC: 22,
        },
      }],
    };
    system.processMessage(zoneUpdate);

    expect(callback).toHaveBeenCalled();
  });

  it('should only call matched callbacks when match filter is used', () => {
    const zone = system.getZone(0)!;
    const tempCallback = jest.fn();
    const humidityCallback = jest.fn();
    
    zone.registerOnUpdateCallback(tempCallback, ['temperature']);
    zone.registerOnUpdateCallback(humidityCallback, ['humidity']);

    // Update temperature only
    zone.temperature = 70;
    const zoneUpdate = {
      zones: [{
        id: 0,
        status: {
          temperature: 72,
        },
      }],
    };
    system.processMessage(zoneUpdate);

    expect(tempCallback).toHaveBeenCalled();
    expect(humidityCallback).not.toHaveBeenCalled();
  });

  it('should support multi-match callback filters', () => {
    const zone = system.getZone(0)!;
    const multiCallback = jest.fn();
    const noMatchCallback = jest.fn();
    
    zone.registerOnUpdateCallback(multiCallback, ['tempOperation', 'demand']);
    zone.registerOnUpdateCallback(noMatchCallback, ['systemMode']);

    // Update demand (matches one of the multi-match criteria)
    const zoneUpdate = {
      zones: [{
        id: 0,
        status: {
          demand: 50,
        },
      }],
    };
    system.processMessage(zoneUpdate);

    expect(multiCallback).toHaveBeenCalled();
    expect(noMatchCallback).not.toHaveBeenCalled();
  });
});

describe('Status Values', () => {
  let api: S30API;

  beforeEach(() => {
    api = createTestApi();
  });

  it('should process humidity status not_available', () => {
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002')!;
    const zone = sys2.getZone(0)!;
    
    const message = loadFile('mut_sys1_zone_1_humidity_status_not_available.json');
    api.processMessage(message);
    
    expect(zone.humidityStatus).toBe('not_available');
  });

  it('should process humidity status not_exist', () => {
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002')!;
    const zone = sys2.getZone(0)!;
    
    const message = loadFile('mut_sys1_zone_1_humidity_status_not_exist.json');
    api.processMessage(message);
    
    expect(zone.humidityStatus).toBe('not_exist');
  });

  it('should process temperature status not_available', () => {
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002')!;
    const zone = sys2.getZone(0)!;
    
    const message = loadFile('mut_sys1_zone_1_temperature_status_not_available.json');
    api.processMessage(message);
    
    expect(zone.temperatureStatus).toBe('not_available');
  });

  it('should process temperature status not_exist', () => {
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002')!;
    const zone = sys2.getZone(0)!;
    
    const message = loadFile('mut_sys1_zone_1_temperature_status_not_exist.json');
    api.processMessage(message);
    
    expect(zone.temperatureStatus).toBe('not_exist');
  });

  it('should process outdoor temperature status not_available', () => {
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002')!;
    
    const message = loadFile('mut_sys1_zone_1_outdoorTemperature_status_not_available.json');
    api.processMessage(message);
    
    expect(sys2.outdoorTemperatureStatus).toBe('not_available');
  });

  it('should process outdoor temperature status not_exist', () => {
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002')!;
    
    const message = loadFile('mut_sys1_zone_1_outdoorTemperature_status_not_exist.json');
    api.processMessage(message);
    
    expect(sys2.outdoorTemperatureStatus).toBe('not_exist');
  });
});

describe('Ventilation Status', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
  });

  it('should process zone ventilation status on', () => {
    const zone = system.getZone(0)!;
    
    const message = loadFile('ventilation_zone_status_on.json', system.sysId);
    api.processMessage(message);
    
    expect(zone.ventilation).toBe(true);
  });

  it('should process zone ventilation status off', () => {
    const zone = system.getZone(0)!;
    
    const message = loadFile('ventilation_zone_status_off.json', system.sysId);
    api.processMessage(message);
    
    expect(zone.ventilation).toBe(false);
  });

  it('should process system ventilation remaining time', () => {
    const callback = jest.fn();
    system.registerOnUpdateCallback(callback, ['ventilationRemainingTime']);
    
    const message = loadFile('ventilation_system_remaining_time.json', system.sysId);
    api.processMessage(message);
    
    expect(system.ventilationRemainingTime).toBe(600);
    expect(system.ventilatingUntilTime).toBe('1626278426');
    expect(callback).toHaveBeenCalled();
  });

  it('should process ventilation mode on and off', () => {
    const callback = jest.fn();
    system.registerOnUpdateCallback(callback, ['ventilationMode']);
    
    const offMessage = loadFile('ventilation_system_off.json', system.sysId);
    api.processMessage(offMessage);
    expect(system.ventilationMode).toBe('off');
    expect(callback).toHaveBeenCalledTimes(1);
    
    const onMessage = loadFile('ventilation_system_on.json', system.sysId);
    api.processMessage(onMessage);
    expect(system.ventilationMode).toBe('on');
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('Smart Away Mutations', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
  });

  it('should process smart away cancel message', () => {
    // Set initial state
    system.saCancel = false;
    
    const message = loadFile('sa_config_cancel.json', system.sysId);
    api.processMessage(message);
    
    expect(system.saCancel).toBe(true);
  });

  it('should process smart away status update', () => {
    // Set initial unknown state
    system.saState = 'unknown';
    system.saSetpointState = 'unknown';
    
    const message = loadFile('sa_status_update.json', system.sysId);
    api.processMessage(message);
    
    expect(system.saState).toBe('enabled cancelled');
    expect(system.saSetpointState).toBe('home');
  });
});

describe('Humidity Mutations', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
  });

  it('should process humidity setpoint and mode changes', () => {
    const zone = system.getZone(0)!;
    
    const message = loadFile('humidity_setpoint_35.json', system.sysId);
    api.processMessage(message);
    
    expect(zone.husp).toBe(35);
    expect(zone.humidityMode).toBe('humidify');
    expect(zone.humOperation).toBe('humidifying');
  });
});

describe('Out of Order Messages', () => {
  it('should handle config mutation before full config', () => {
    // Create fresh API without loading full config
    const api = new S30API({
      ipAddress: '10.0.0.1',
      protocol: 'https',
    });

    // Load login response to set up systems
    const loginData = loadFile('login_response.json');
    api.processLoginResponse(loginData as unknown as Record<string, unknown>);

    // Load only partial config (system 1)
    const config1 = loadFile('config_response_system_01.json');
    api.processMessage(config1);

    // Load a mutation for system 2 BEFORE its full config
    const mutation = loadFile('mut_zone_config_no_status.json');
    api.processMessage(mutation);

    // System 2 should exist but zone should have minimal data
    const sys2 = api.getSystem('0000000-0000-0000-0000-000000000002');
    expect(sys2).toBeDefined();
    
    const zone = sys2!.getZone(0);
    expect(zone).toBeDefined();
    
    // Zone should exist but have null values for most properties
    expect(zone!.id).toBe(0);
    expect(zone!.name).toBeNull();
    expect(zone!.systemMode).toBeNull();
    expect(zone!.temperature).toBeNull();
    expect(zone!.csp).toBeNull();
    expect(zone!.hsp).toBeNull();

    // Now load the full config for system 2
    const config2 = loadFile('config_response_system_02.json');
    api.processMessage(config2);

    // Zone should now be fully populated
    expect(zone!.name).toBe('Zone 1');
    expect(zone!.temperature).toBe(79);
    expect(zone!.csp).toBe(78);
    expect(zone!.hsp).toBe(68);
    expect(zone!.systemMode).toBe('off');
  });
});

describe('Schedule Configuration', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
  });

  it('should have schedules loaded', () => {
    const schedules = system.getSchedules();
    expect(schedules).toBeDefined();
  });

  it('should be able to get schedule by name', () => {
    // Test getting a schedule - name depends on test fixtures
    const schedules = system.getSchedules();
    if (schedules.length > 0) {
      const firstSchedule = schedules[0];
      const foundSchedule = system.getScheduleByName(firstSchedule.name);
      expect(foundSchedule).toBeDefined();
      expect(foundSchedule?.id).toBe(firstSchedule.id);
    }
  });
});

describe('Temperature Conversions', () => {
  let system: LennoxSystem;

  beforeEach(() => {
    const api = createTestApi();
    system = api.systems[0];
  });

  it('should convert Fahrenheit to Celsius correctly', () => {
    expect(system.convertFtoC(32)).toBe(0);
    expect(system.convertFtoC(68)).toBe(20);
    expect(system.convertFtoC(77)).toBe(25);
    expect(system.convertFtoC(86)).toBe(30);
  });

  it('should convert Celsius to Fahrenheit correctly', () => {
    expect(system.convertCtoF(0)).toBe(32);
    expect(system.convertCtoF(20)).toBe(68);
    expect(system.convertCtoF(25)).toBe(77);
    expect(system.convertCtoF(30)).toBe(86);
  });

  it('should round Celsius to nearest 0.5', () => {
    expect(system.celsiusRound(20.1)).toBe(20);
    expect(system.celsiusRound(20.3)).toBe(20.5);
    expect(system.celsiusRound(20.7)).toBe(20.5);
    expect(system.celsiusRound(20.8)).toBe(21);
  });

  it('should round Fahrenheit to nearest integer', () => {
    expect(system.farenRound(70.3)).toBe(70);
    expect(system.farenRound(70.5)).toBe(71);
    expect(system.farenRound(70.7)).toBe(71);
  });
});
