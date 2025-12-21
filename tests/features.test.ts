/**
 * Tests for ventilation, fan, humidity, central mode, and circulation
 * Ported from test_ventilation.py, test_fan.py, test_humidity_modes.py,
 * test_centralmode.py, test_circulate_time.py
 */

import { S30API } from '../src/api';
import { LennoxSystem } from '../src/system';
import { LennoxZone } from '../src/zone';
import { createTestApi, createTestApiLocal, extractPublishedData, loadFile } from './helpers';

describe('Ventilation', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApiLocal();
    system = api.getSystem('LCC')!;
  });

  it('should turn ventilation on', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.ventilationOn();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    expect(data.system).toBeDefined();
    const sysConfig = (data.system as { config: { ventilationMode: string } }).config;
    expect(sysConfig.ventilationMode).toBe('on');
  });

  it('should turn ventilation off', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.ventilationOff();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { ventilationMode: string } }).config;
    expect(sysConfig.ventilationMode).toBe('off');
  });

  it('should set ventilation to installer mode', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.ventilationInstaller();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { ventilationMode: string } }).config;
    expect(sysConfig.ventilationMode).toBe('installer');
  });

  it('should set timed ventilation', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.ventilationTimed(3600); // 1 hour

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { ventilationRemainingTime: number } }).config;
    expect(sysConfig.ventilationRemainingTime).toBe(3600);
  });

  it('should process ventilation status messages', () => {
    const message = loadFile('ventilation_system_on.json', 'LCC');
    api.processMessage(message);
    
    // Check that ventilation mode was updated
    expect(system.ventilationMode).toBeDefined();
  });
});

describe('Allergen Defender', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApiLocal();
    system = api.getSystem('LCC')!;
  });

  it('should turn allergen defender on', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.allergenDefenderOn();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { allergenDefender: boolean } }).config;
    expect(sysConfig.allergenDefender).toBe(true);
  });

  it('should turn allergen defender off', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.allergenDefenderOff();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { allergenDefender: boolean } }).config;
    expect(sysConfig.allergenDefender).toBe(false);
  });
});

describe('Central Mode (Zoning)', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApiLocal();
    system = api.getSystem('LCC')!;
  });

  it('should enable central mode (disable zoning)', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.centralModeOn();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { centralMode: boolean } }).config;
    expect(sysConfig.centralMode).toBe(true);
  });

  it('should disable central mode (enable zoning)', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.centralModeOff();

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { centralMode: boolean } }).config;
    expect(sysConfig.centralMode).toBe(false);
  });

  it('should report zoning status correctly', () => {
    system.zoningMode = 'zoned';
    expect(system.isZoningEnabled()).toBe(true);

    system.zoningMode = 'central';
    expect(system.isZoningEnabled()).toBe(false);
  });
});

describe('Circulation Time', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApiLocal();
    system = api.getSystem('LCC')!;
  });

  it('should set circulation time', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    // 18 minutes = 30% (18/60 * 100)
    await system.setCirculateTime(18);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { circulateTime: number } }).config;
    expect(sysConfig.circulateTime).toBe(30);
  });
});

describe('Dehumidification', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApiLocal();
    system = api.getSystem('LCC')!;
  });

  it('should set dehumidification mode', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.setDehumidificationMode('high');

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = (data.system as { config: { dehumidificationMode: string } }).config;
    expect(sysConfig.dehumidificationMode).toBe('high');
  });

  it('should set enhanced dehumidification overcooling', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await system.setEnhancedDehumidificationOvercooling({ f: 2 });

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const sysConfig = data.system as { 
      config: { 
        enhancedDehumidificationOvercoolingF: { value: number } 
      } 
    };
    expect(sysConfig.config.enhancedDehumidificationOvercoolingF.value).toBe(2);
  });
});

describe('Fan Mode', () => {
  let api: S30API;
  let system: LennoxSystem;
  let zone: LennoxZone;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
    zone = system.getZone(0)!;
    
    // Set up zone
    zone.fanMode = 'auto';
    zone.systemMode = 'heat and cool';
    zone.csp = 77;
    zone.hsp = 70;
    zone.desp = 50;
    zone.husp = 40;
    zone.humidityMode = 'off';
  });

  it('should set fan mode to on', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setFanMode('on');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should set fan mode to auto', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setFanMode('auto');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should set fan mode to circulate', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setFanMode('circulate');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid fan mode', async () => {
    await expect(zone.setFanMode('invalid')).rejects.toThrow();
  });
});

describe('HVAC Mode', () => {
  let api: S30API;
  let system: LennoxSystem;
  let zone: LennoxZone;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
    zone = system.getZone(0)!;
    
    // Set up zone with heating and cooling options
    zone.heatingOption = true;
    zone.coolingOption = true;
    zone.fanMode = 'auto';
    zone.systemMode = 'heat and cool';
    zone.csp = 77;
    zone.hsp = 70;
    zone.desp = 50;
    zone.husp = 40;
    zone.humidityMode = 'off';
  });

  it('should set HVAC mode to off', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHVACMode('off');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should set HVAC mode to heat', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHVACMode('heat');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should set HVAC mode to cool', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHVACMode('cool');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should set HVAC mode to heat and cool', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHVACMode('heat and cool');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid HVAC mode', async () => {
    await expect(zone.setHVACMode('invalid')).rejects.toThrow();
  });

  it('should reject cool mode when cooling not available', async () => {
    zone.coolingOption = false;
    await expect(zone.setHVACMode('cool')).rejects.toThrow();
  });

  it('should reject heat mode when heating not available', async () => {
    zone.heatingOption = false;
    await expect(zone.setHVACMode('heat')).rejects.toThrow();
  });
});

describe('Humidity Mode', () => {
  let api: S30API;
  let system: LennoxSystem;
  let zone: LennoxZone;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
    zone = system.getZone(0)!;
    
    zone.fanMode = 'auto';
    zone.systemMode = 'heat and cool';
    zone.csp = 77;
    zone.hsp = 70;
    zone.desp = 50;
    zone.husp = 40;
    zone.humidityMode = 'off';
    zone.humidificationOption = true;
    zone.dehumidificationOption = true;
  });

  it('should set humidity mode to humidify when supported', async () => {
    zone.humidificationOption = true;
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHumidityMode('humidify');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject humidify mode when not supported', async () => {
    zone.humidificationOption = false;
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await expect(zone.setHumidityMode('humidify')).rejects.toThrow();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('should set humidity mode to dehumidify when supported', async () => {
    zone.dehumidificationOption = true;
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHumidityMode('dehumidify');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject dehumidify mode when not supported', async () => {
    zone.dehumidificationOption = false;
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await expect(zone.setHumidityMode('dehumidify')).rejects.toThrow();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('should set humidity mode to both when both supported', async () => {
    zone.humidificationOption = true;
    zone.dehumidificationOption = true;
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHumidityMode('both');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject both mode when humidification not supported', async () => {
    zone.humidificationOption = false;
    zone.dehumidificationOption = true;
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await expect(zone.setHumidityMode('both')).rejects.toThrow();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('should set humidity mode to off', async () => {
    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

    await zone.setHumidityMode('off');

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid humidity mode', async () => {
    await expect(zone.setHumidityMode('invalid')).rejects.toThrow();
  });
});

