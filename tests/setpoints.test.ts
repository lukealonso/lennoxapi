/**
 * Tests for temperature and humidity setpoints
 * Ported from test_setpoints.py
 */

import { S30API } from '../src/api';
import { LennoxSystem } from '../src/system';
import { LennoxZone } from '../src/zone';
import { createTestApi, createTestApiSingleSetpoint, extractPublishedData } from './helpers';

describe('Temperature Setpoints', () => {
  describe('Dual Setpoint Mode (split)', () => {
    let api: S30API;
    let system: LennoxSystem;
    let zone: LennoxZone;

    beforeEach(() => {
      api = createTestApi();
      system = api.systems[0];
      zone = system.getZone(0)!;
      
      // Set up zone with initial values
      zone.csp = 77;
      zone.cspC = 25.0;
      zone.hsp = 70;
      zone.hspC = 21.0;
      zone.desp = 50;
      zone.husp = 40;
      zone.humidityMode = 'off';
      zone.systemMode = 'heat and cool';
      zone.fanMode = 'auto';
    });

    it('should set heat setpoint in fahrenheit', async () => {
      expect(system.singleSetpointMode).toBe(false);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      const updateCallback = jest.fn();
      zone.registerOnUpdateCallback(updateCallback, ['hsp', 'hspC', 'csp', 'cspC']);
      
      await zone.performSetpoint({ hsp: 74 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      expect(schedules[0].id).toBe(zone.getManualModeScheduleId());
      
      const period = schedules[0].schedule.periods[0].period;
      expect(period.hsp).toBe(74);
      expect(period.hspC).toBe(23.5);
      // CSP should be maintained at current value since 77 > 74 + 3
      expect(period.csp).toBe(77);
      expect(period.cspC).toBe(25.0);
      expect(zone.hsp).toBe(74);
      expect(zone.hspC).toBe(23.5);
      expect(zone.csp).toBe(77);
      expect(zone.cspC).toBe(25.0);
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it('should adjust cool setpoint when heat setpoint is too close', async () => {
      expect(system.singleSetpointMode).toBe(false);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      await zone.performSetpoint({ hsp: 75 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      const period = schedules[0].schedule.periods[0].period;
      
      expect(period.hsp).toBe(75);
      expect(period.hspC).toBe(24);
      // CSP should be adjusted to maintain 3 degree separation
      expect(period.csp).toBe(78);
      expect(period.cspC).toBe(25.5);
    });

    it('should set heat setpoint in celsius', async () => {
      expect(system.singleSetpointMode).toBe(false);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      await zone.performSetpoint({ hspC: 23.5 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      const period = schedules[0].schedule.periods[0].period;
      
      expect(period.hsp).toBe(74);
      expect(period.hspC).toBe(23.5);
    });

    it('should set cool setpoint in fahrenheit', async () => {
      expect(system.singleSetpointMode).toBe(false);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      await zone.performSetpoint({ csp: 80 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      const period = schedules[0].schedule.periods[0].period;
      
      expect(period.csp).toBe(80);
      expect(period.cspC).toBe(26.5); // (80-32) * 5/9 = 26.67, rounds to 26.5 (nearest 0.5)
    });

    it('should adjust heat setpoint when cool setpoint is too close', async () => {
      expect(system.singleSetpointMode).toBe(false);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      await zone.performSetpoint({ csp: 72 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      const period = schedules[0].schedule.periods[0].period;
      
      expect(period.csp).toBe(72);
      // HSP should be adjusted to maintain 3 degree separation
      expect(period.hsp).toBe(69);
    });

    it('should set both heat and cool setpoints', async () => {
      expect(system.singleSetpointMode).toBe(false);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      await zone.performSetpoint({ hsp: 64, csp: 78 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      const period = schedules[0].schedule.periods[0].period;
      
      expect(period.hsp).toBe(64);
      expect(period.hspC).toBe(18);
      expect(period.csp).toBe(78);
      expect(period.cspC).toBe(25.5);
    });

    it('should use away mode schedule ID when in away mode', async () => {
      system.manualAwayMode = true;

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      await zone.performSetpoint({ hsp: 71 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      expect(schedules[0].id).toBe(zone.getAwayModeScheduleId());
    });

    it('should reject hsp and csp that violate separation (fahrenheit)', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      // 67 and 69 are only 2 degrees apart, need 3
      await expect(zone.performSetpoint({ hsp: 67, csp: 69 })).rejects.toThrow();
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('should reject hspC and cspC that violate separation (celsius)', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      // 18 and 19 are only 1 degree apart, need 1.5
      await expect(zone.performSetpoint({ hspC: 18, cspC: 19 })).rejects.toThrow();
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('should accept hsp and csp with valid separation', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      // 64 and 78 are 14 degrees apart, well above 3
      await zone.performSetpoint({ hsp: 64, csp: 78 });
      expect(publishSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Single Setpoint Mode (perfect temp)', () => {
    let api: S30API;
    let system: LennoxSystem;
    let zone: LennoxZone;

    beforeEach(() => {
      api = createTestApiSingleSetpoint();
      system = api.systems[0];
      zone = system.getZone(0)!;
      
      // Set up zone with initial values
      zone.sp = 72;
      zone.spC = 22.0;
      zone.desp = 50;
      zone.husp = 40;
      zone.humidityMode = 'off';
      zone.systemMode = 'heat and cool';
      zone.fanMode = 'auto';
    });

    it('should set single setpoint in fahrenheit', async () => {
      expect(system.singleSetpointMode).toBe(true);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      const updateCallback = jest.fn();
      zone.registerOnUpdateCallback(updateCallback, ['sp', 'spC']);
      
      await zone.performSetpoint({ sp: 78 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      expect(schedules[0].id).toBe(zone.getManualModeScheduleId());
      
      const period = schedules[0].schedule.periods[0].period;
      expect(period.sp).toBe(78);
      expect(period.spC).toBe(25.5);
      expect(zone.sp).toBe(78);
      expect(zone.spC).toBe(25.5);
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it('should set single setpoint in celsius', async () => {
      expect(system.singleSetpointMode).toBe(true);

      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      
      await zone.performSetpoint({ spC: 25.5 });
      
      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
      const period = schedules[0].schedule.periods[0].period;
      
      expect(period.sp).toBe(78);
      expect(period.spC).toBe(25.5);
    });
  });
});

describe('Humidity Setpoints', () => {
  let api: S30API;
  let system: LennoxSystem;
  let zone: LennoxZone;

  beforeEach(() => {
    api = createTestApiSingleSetpoint();
    system = api.systems[0];
    zone = system.getZone(0)!;
    
    // Set up zone with initial values
    zone.sp = 72;
    zone.spC = 22.0;
    zone.csp = 77;
    zone.cspC = 25.0;
    zone.hsp = 70;
    zone.hspC = 21.0;
    zone.desp = 50;
    zone.husp = 40;
    zone.humidityMode = 'off';
    zone.systemMode = 'heat and cool';
    zone.fanMode = 'auto';
    zone.maxHumSp = 45;
    zone.minHumSp = 15;
    zone.maxDehumSp = 60;
    zone.minDehumSp = 35;
  });

  it('should set humidify setpoint', async () => {
    zone.scheduleId = 1; // Set to a non-manual schedule

    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
    
    await zone.performHumidifySetpoint({ husp: 40 });
    
    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
    // Should always go to manual mode schedule
    expect(schedules[0].id).toBe(zone.getManualModeScheduleId());
    
    const period = schedules[0].schedule.periods[0].period;
    expect(period.husp).toBe(40);
  });

  it('should set dehumidify setpoint', async () => {
    zone.scheduleId = 1;

    const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
    
    await zone.performHumidifySetpoint({ desp: 55 });
    
    expect(publishSpy).toHaveBeenCalledTimes(1);
    const data = extractPublishedData(publishSpy as jest.Mock)!;
    
    const schedules = data.schedules as Array<{id: number; schedule: {periods: Array<{period: Record<string, unknown>}>}}>;
    const period = schedules[0].schedule.periods[0].period;
    expect(period.desp).toBe(55);
  });
});
