/**
 * Tests for away mode functionality
 * Ported from test_set_away_mode.py
 */

import { S30API } from '../src/api';
import { LennoxSystem } from '../src/system';
import { createTestApi, extractPublishedData } from './helpers';

describe('Away Mode', () => {
  let api: S30API;
  let system: LennoxSystem;

  beforeEach(() => {
    api = createTestApi();
    system = api.systems[0];
  });

  describe('Manual Away Mode', () => {
    it('should set manual away mode to true', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      const updateCallback = jest.fn();
      system.manualAwayMode = false;
      system.registerOnUpdateCallback(updateCallback, ['manualAwayMode']);

      await system.setManualAwayMode(true);

      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      expect(data.occupancy).toBeDefined();
      const occupancy = data.occupancy as { manualAway: boolean };
      expect(occupancy.manualAway).toBe(true);
      expect(system.manualAwayMode).toBe(true);
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it('should set manual away mode to false', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();
      const updateCallback = jest.fn();
      system.manualAwayMode = true;
      system.registerOnUpdateCallback(updateCallback, ['manualAwayMode']);

      await system.setManualAwayMode(false);

      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      expect(data.occupancy).toBeDefined();
      const occupancy = data.occupancy as { manualAway: boolean };
      expect(occupancy.manualAway).toBe(false);
      expect(system.manualAwayMode).toBe(false);
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it('should report manual away mode status correctly', () => {
      system.manualAwayMode = false;
      expect(system.getManualAwayMode()).toBe(false);
      expect(system.getAwayMode()).toBe(false);

      system.manualAwayMode = true;
      expect(system.getManualAwayMode()).toBe(true);
      expect(system.getAwayMode()).toBe(true);
    });
  });

  describe('Smart Away', () => {
    beforeEach(() => {
      system.saEnabled = true;
    });

    it('should cancel smart away', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

      await system.cancelSmartAway();

      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      expect(data.occupancy).toBeDefined();
      const occupancy = data.occupancy as { 
        smartAway: { config: { cancel: boolean } } 
      };
      expect(occupancy.smartAway.config.cancel).toBe(true);
    });

    it('should enable smart away', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

      await system.enableSmartAway(true);

      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      expect(data.occupancy).toBeDefined();
      const occupancy = data.occupancy as { 
        smartAway: { config: { enabled: boolean } } 
      };
      expect(occupancy.smartAway.config.enabled).toBe(true);
    });

    it('should disable smart away', async () => {
      const publishSpy = jest.spyOn(api, 'publishMessage').mockResolvedValue();

      await system.enableSmartAway(false);

      expect(publishSpy).toHaveBeenCalledTimes(1);
      const data = extractPublishedData(publishSpy as jest.Mock)!;
      
      expect(data.occupancy).toBeDefined();
      const occupancy = data.occupancy as { 
        smartAway: { config: { enabled: boolean } } 
      };
      expect(occupancy.smartAway.config.enabled).toBe(false);
    });

    it('should report smart away state correctly', () => {
      system.saState = 'enabled inactive';
      expect(system.getSmartAwayMode()).toBe(false);

      system.saState = 'enabled active';
      expect(system.getSmartAwayMode()).toBe(true);
      expect(system.getAwayMode()).toBe(true);
    });
  });
});
