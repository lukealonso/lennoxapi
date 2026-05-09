/**
 * LennoxZone - Represents a zone within a Lennox HVAC system
 */

import { S30Exception, ErrorCodes } from './exceptions';
import type { LennoxSystem } from './system';
import {
  CallbackEntry,
  SetpointOptions,
  HumiditySetpointOptions,
  LENNOX_HVAC_OFF,
  LENNOX_HVAC_COOL,
  LENNOX_HVAC_HEAT,
  LENNOX_HVAC_HEAT_COOL,
  LENNOX_HVAC_EMERGENCY_HEAT,
  HVAC_MODES,
  FAN_MODES,
  HUMIDITY_MODES,
  LENNOX_ZONING_MODE_ZONED,
  LENNOX_MANUAL_MODE_SCHEDULE_START_INDEX,
} from './types';

/**
 * LennoxZone - Represents a heating/cooling zone
 */
export class LennoxZone {
  public readonly system: LennoxSystem;
  public readonly id: number;

  // Callback system
  private callbacks: CallbackEntry[] = [];
  private dirty: boolean = false;
  private dirtyList: string[] = [];

  // Zone identification
  public name: string | null = null;

  // Temperature
  public temperature: number | null = null;
  public temperatureC: number | null = null;
  public temperatureStatus: string | null = null;

  // Humidity
  public humidity: number | null = null;
  public humidityStatus: string | null = null;

  // Operating state
  public systemMode: string | null = null;
  public tempOperation: string | null = null;
  public humOperation: string | null = null;

  // Fan
  public fanMode: string | null = null;
  public fan: boolean | null = null;  // Current fan state

  // Setpoints (Fahrenheit)
  public csp: number | null = null;  // Cool setpoint
  public hsp: number | null = null;  // Heat setpoint
  public sp: number | null = null;   // Single/perfect temp setpoint

  // Setpoints (Celsius)
  public cspC: number | null = null;
  public hspC: number | null = null;
  public spC: number | null = null;

  // Humidity setpoints
  public husp: number | null = null;  // Humidify setpoint
  public desp: number | null = null;  // Dehumidify setpoint
  public humidityMode: string | null = null;

  // Setpoint limits
  public maxCsp: number | null = null;
  public maxCspC: number | null = null;
  public minCsp: number | null = null;
  public minCspC: number | null = null;
  public maxHsp: number | null = null;
  public maxHspC: number | null = null;
  public minHsp: number | null = null;
  public minHspC: number | null = null;
  public maxHumSp: number | null = null;
  public minHumSp: number | null = null;
  public maxDehumSp: number | null = null;
  public minDehumSp: number | null = null;

  // Equipment options
  public heatingOption: boolean | null = null;
  public coolingOption: boolean | null = null;
  public humidificationOption: boolean | null = null;
  public dehumidificationOption: boolean | null = null;
  public emergencyHeatingOption: boolean | null = null;

  // Schedule
  public scheduleId: number | null = null;
  public scheduleHold: boolean | null = null;
  public overrideActive: boolean | null = null;

  // Additional status
  public damper: number | null = null;
  public demand: number | null = null;
  public ventilation: boolean | null = null;
  public heatCoast: boolean | null = null;
  public defrost: boolean | null = null;
  public balancePoint: string | null = null;
  public aux: boolean | null = null;
  public coolCoast: boolean | null = null;
  public ssr: boolean | null = null;
  public allergenDefender: boolean | null = null;

  constructor(system: LennoxSystem, zoneId: number) {
    this.system = system;
    this.id = zoneId;
  }

  /**
   * Unique ID for this zone
   */
  get uniqueId(): string {
    return `${this.system.uniqueId}_${this.id}_T`.replace(/-/g, '');
  }

  /**
   * Check if zone is active (not disabled)
   */
  isZoneActive(): boolean {
    return this.name !== null;
  }

  /**
   * Check if zone is disabled (only zone 0 enabled when not zoned)
   */
  get isZoneDisabled(): boolean {
    if (this.id === 0) return false;
    if (this.system.zoningMode === null) return false;
    return this.system.zoningMode !== LENNOX_ZONING_MODE_ZONED;
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
          console.error('Zone callback execution failed:', error);
        }
      }
    }

    this.dirty = false;
    this.dirtyList = [];
  }

  /**
   * Update an attribute if it has changed
   */
  private attrUpdater(obj: Record<string, unknown>, key: string, targetKey?: string): boolean {
    const target = targetKey ?? key;
    if (key in obj) {
      const newValue = obj[key];
      if ((this as unknown as Record<string, unknown>)[target] !== newValue) {
        (this as unknown as Record<string, unknown>)[target] = newValue;
        this.dirty = true;
        if (!this.dirtyList.includes(target)) {
          this.dirtyList.push(target);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Get the current temperature (Fahrenheit)
   */
  getTemperature(): number | null {
    return this.temperature;
  }

  /**
   * Get the current temperature (Celsius)
   */
  getTemperatureC(): number | null {
    return this.temperatureC;
  }

  /**
   * Get the current humidity
   */
  getHumidity(): number | null {
    return this.humidity;
  }

  /**
   * Get the current system mode
   */
  getSystemMode(): string | null {
    return this.systemMode;
  }

  /**
   * Get the current fan mode
   */
  getFanMode(): string | null {
    return this.fanMode;
  }

  /**
   * Get target temperature for single-setpoint or current mode
   */
  getTargetTemperatureF(): number | null {
    if (this.system.singleSetpointMode) {
      return this.sp;
    }
    if (this.systemMode === LENNOX_HVAC_COOL) {
      return this.csp;
    }
    if (this.systemMode === LENNOX_HVAC_HEAT || this.systemMode === LENNOX_HVAC_EMERGENCY_HEAT) {
      return this.hsp;
    }
    return null;
  }

  /**
   * Get target temperature (Celsius)
   */
  getTargetTemperatureC(): number | null {
    if (this.system.singleSetpointMode) {
      return this.spC;
    }
    if (this.systemMode === LENNOX_HVAC_COOL) {
      return this.cspC;
    }
    if (this.systemMode === LENNOX_HVAC_HEAT || this.systemMode === LENNOX_HVAC_EMERGENCY_HEAT) {
      return this.hspC;
    }
    return null;
  }

  /**
   * Check if zone is in manual mode
   */
  isZoneManualMode(): boolean {
    if (this.scheduleId === null) return false;
    return this.scheduleId >= LENNOX_MANUAL_MODE_SCHEDULE_START_INDEX;
  }

  /**
   * Check if zone has an active override
   */
  isZoneOverride(): boolean {
    return this.overrideActive === true;
  }

  /**
   * Get the manual mode schedule ID for this zone
   */
  getManualModeScheduleId(): number {
    return LENNOX_MANUAL_MODE_SCHEDULE_START_INDEX + this.id;
  }

  /**
   * Get the away mode schedule ID for this zone
   */
  getAwayModeScheduleId(): number {
    // Away schedule is at index 3 in Python implementation
    return 3;
  }

  /**
   * Process an incoming zone message
   */
  processMessage(data: Record<string, unknown>): void {
    // Config section
    if ('config' in data) {
      const config = data.config as Record<string, unknown>;
      this.attrUpdater(config, 'name');
      this.attrUpdater(config, 'heatingOption');
      this.attrUpdater(config, 'coolingOption');
      this.attrUpdater(config, 'humidificationOption');
      this.attrUpdater(config, 'dehumidificationOption');
      this.attrUpdater(config, 'emergencyHeatingOption');
      this.attrUpdater(config, 'maxHsp');
      this.attrUpdater(config, 'maxHspC');
      this.attrUpdater(config, 'minHsp');
      this.attrUpdater(config, 'minHspC');
      this.attrUpdater(config, 'maxCsp');
      this.attrUpdater(config, 'maxCspC');
      this.attrUpdater(config, 'minCsp');
      this.attrUpdater(config, 'minCspC');
      this.attrUpdater(config, 'maxHumSp');
      this.attrUpdater(config, 'minHumSp');
      this.attrUpdater(config, 'maxDehumSp');
      this.attrUpdater(config, 'minDehumSp');
      this.attrUpdater(config, 'scheduleId');
    }

    // Status section
    if ('status' in data) {
      const status = data.status as Record<string, unknown>;
      this.attrUpdater(status, 'temperature');
      this.attrUpdater(status, 'temperatureC');
      this.attrUpdater(status, 'temperatureStatus');
      this.attrUpdater(status, 'humidity');
      this.attrUpdater(status, 'humidityStatus');
      this.attrUpdater(status, 'tempOperation');
      this.attrUpdater(status, 'humOperation');
      this.attrUpdater(status, 'fan');
      this.attrUpdater(status, 'damper');
      this.attrUpdater(status, 'demand');
      this.attrUpdater(status, 'ventilation');
      this.attrUpdater(status, 'heatCoast');
      this.attrUpdater(status, 'defrost');
      this.attrUpdater(status, 'balancePoint');
      this.attrUpdater(status, 'aux');
      this.attrUpdater(status, 'coolCoast');
      this.attrUpdater(status, 'ssr');
      this.attrUpdater(status, 'allergenDefender');

      // Period status (current setpoints and modes)
      if ('period' in status) {
        const period = status.period as Record<string, unknown>;
        this.processPeriod(period);
      }
    }

    // Schedule hold
    if ('scheduleHold' in data) {
      const holdData = data.scheduleHold as Record<string, unknown>;
      this.attrUpdater(holdData, 'enabled', 'scheduleHold');
      this.attrUpdater(holdData, 'scheduleId');
      this.attrUpdater(holdData, 'overrideActive');
    }
  }

  /**
   * Process period data (current setpoints and modes)
   */
  private processPeriod(period: Record<string, unknown>): void {
    this.attrUpdater(period, 'systemMode');
    this.attrUpdater(period, 'fanMode');
    this.attrUpdater(period, 'humidityMode');
    this.attrUpdater(period, 'csp');
    this.attrUpdater(period, 'cspC');
    this.attrUpdater(period, 'hsp');
    this.attrUpdater(period, 'hspC');
    this.attrUpdater(period, 'sp');
    this.attrUpdater(period, 'spC');
    this.attrUpdater(period, 'husp');
    this.attrUpdater(period, 'desp');
    this.attrUpdater(period, 'startTime');
    this.attrUpdater(period, 'overrideActive');
  }

  // =========================================================================
  // Control Methods
  // =========================================================================

  /**
   * Validate setpoint options
   */
  private validateSetpoints(options: SetpointOptions): void {
    const { hsp, hspC, csp, cspC, sp, spC } = options;

    // In single setpoint mode, must use sp/spC
    if (this.system.singleSetpointMode) {
      if ((hsp !== undefined || hspC !== undefined || csp !== undefined || cspC !== undefined) &&
          sp === undefined && spC === undefined) {
        throw new S30Exception(
          'In single setpoint mode, must use sp/spC instead of hsp/csp',
          ErrorCodes.EC_BAD_PARAMETERS,
          1
        );
      }
      if (sp === undefined && spC === undefined) {
        throw new S30Exception(
          'In single setpoint mode, sp or spC must be specified',
          ErrorCodes.EC_BAD_PARAMETERS,
          2
        );
      }
    } else {
      // Not in single setpoint mode, can't use sp/spC
      if (sp !== undefined || spC !== undefined) {
        throw new S30Exception(
          'Not in single setpoint mode, cannot use sp/spC',
          ErrorCodes.EC_BAD_PARAMETERS,
          2
        );
      }
      // Must provide at least one setpoint
      if (hsp === undefined && hspC === undefined && csp === undefined && cspC === undefined) {
        throw new S30Exception(
          'At least one setpoint (hsp, hspC, csp, cspC) must be specified',
          ErrorCodes.EC_BAD_PARAMETERS,
          2
        );
      }
      // When both hsp and csp are provided, enforce separation
      if (hsp !== undefined && csp !== undefined) {
        const sep = this.system.hspCspSeparation;
        if (csp < hsp + sep) {
          throw new S30Exception(
            `hsp [${hsp}] and csp [${csp}] must be separated by [${sep}] degrees`,
            ErrorCodes.EC_BAD_PARAMETERS,
            3
          );
        }
      }
      // When both hspC and cspC are provided, enforce separation
      if (hspC !== undefined && cspC !== undefined) {
        const sepC = this.system.hspCCspCSeparation;
        if (cspC < hspC + sepC) {
          throw new S30Exception(
            `hspC [${hspC}] and cspC [${cspC}] must be separated by [${sepC}] degrees`,
            ErrorCodes.EC_BAD_PARAMETERS,
            3
          );
        }
      }
    }
  }

  /**
   * Get the schedule ID to use for setpoint changes
   */
  private getSetpointScheduleId(): number {
    if (this.system.getAwayMode()) {
      return this.getAwayModeScheduleId();
    }
    return this.getManualModeScheduleId();
  }

  /**
   * Build a period object with current values filled in
   */
  private buildPeriod(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
      desp: this.desp ?? 50,
      hsp: this.hsp ?? 70,
      hspC: this.hspC ?? 21,
      csp: this.csp ?? 75,
      cspC: this.cspC ?? 24,
      sp: this.sp ?? 72,
      spC: this.spC ?? 22,
      husp: this.husp ?? 40,
      humidityMode: this.humidityMode ?? 'off',
      systemMode: this.systemMode ?? 'off',
      fanMode: this.fanMode ?? 'auto',
      ...overrides,
    };
  }

  /**
   * Set temperature setpoints
   */
  async performSetpoint(options: SetpointOptions): Promise<void> {
    this.validateSetpoints(options);

    const scheduleId = this.getSetpointScheduleId();
    const { hsp: rHsp, hspC: rHspC, csp: rCsp, cspC: rCspC, sp: rSp, spC: rSpC } = options;

    let hsp: number | undefined;
    let hspC: number | undefined;
    let csp: number | undefined;
    let cspC: number | undefined;
    let sp: number | undefined;
    let spC: number | undefined;

    if (this.system.singleSetpointMode) {
      // Single setpoint mode
      if (rSp !== undefined) {
        sp = this.system.farenRound(rSp);
        spC = this.system.convertFtoC(sp);
      } else if (rSpC !== undefined) {
        spC = this.system.celsiusRound(rSpC);
        sp = this.system.convertCtoF(spC);
      }
    } else {
      // Dual setpoint mode
      const sep = this.system.hspCspSeparation;
      const sepC = this.system.hspCCspCSeparation;

      // Process heat setpoint
      if (rHsp !== undefined) {
        hsp = this.system.farenRound(rHsp);
        hspC = this.system.convertFtoC(hsp);
        // Ensure separation
        csp = this.csp ?? (hsp + sep);
        if (csp < hsp + sep) {
          csp = hsp + sep;
        }
        cspC = this.system.convertFtoC(csp);
      } else if (rHspC !== undefined) {
        hspC = this.system.celsiusRound(rHspC);
        hsp = this.system.convertCtoF(hspC);
        cspC = this.cspC ?? (hspC + sepC);
        if (cspC < hspC + sepC) {
          cspC = hspC + sepC;
        }
        csp = this.system.convertCtoF(cspC);
      }

      // Process cool setpoint
      if (rCsp !== undefined) {
        csp = this.system.farenRound(rCsp);
        cspC = this.system.convertFtoC(csp);
        // Ensure separation
        hsp = hsp ?? this.hsp ?? (csp - sep);
        if (hsp > csp - sep) {
          hsp = csp - sep;
        }
        hspC = this.system.convertFtoC(hsp);
      } else if (rCspC !== undefined) {
        cspC = this.system.celsiusRound(rCspC);
        csp = this.system.convertCtoF(cspC);
        hspC = hspC ?? this.hspC ?? (cspC - sepC);
        if (hspC > cspC - sepC) {
          hspC = cspC - sepC;
        }
        hsp = this.system.convertCtoF(hspC);
      }

      // If only one was set, fill in from current values
      if (hsp === undefined && csp !== undefined) {
        hsp = this.hsp ?? (csp - sep);
        hspC = this.hspC ?? this.system.convertFtoC(hsp);
      }
      if (csp === undefined && hsp !== undefined) {
        csp = this.csp ?? (hsp + sep);
        cspC = this.cspC ?? this.system.convertFtoC(csp);
      }
    }

    // Build the period update
    const periodUpdate: Record<string, unknown> = {};
    if (hsp !== undefined) periodUpdate.hsp = hsp;
    if (hspC !== undefined) periodUpdate.hspC = hspC;
    if (csp !== undefined) periodUpdate.csp = csp;
    if (cspC !== undefined) periodUpdate.cspC = cspC;
    if (sp !== undefined) periodUpdate.sp = sp;
    if (spC !== undefined) periodUpdate.spC = spC;

    const period = this.buildPeriod(periodUpdate);

    const data = {
      schedules: [{
        id: scheduleId,
        schedule: {
          periods: [{
            id: 0,
            period,
          }],
        },
      }],
    };

    await this.system.api.publishMessage(this.system.sysId, data);
    this.processPeriod(period);
    this.executeOnUpdateCallbacks();
  }

  /**
   * Set humidity setpoints
   */
  async performHumidifySetpoint(options: HumiditySetpointOptions): Promise<void> {
    const scheduleId = this.getSetpointScheduleId();
    const periodUpdate: Record<string, unknown> = {};

    if (options.husp !== undefined) {
      periodUpdate.husp = options.husp;
    }
    if (options.desp !== undefined) {
      periodUpdate.desp = options.desp;
    }

    const period = this.buildPeriod(periodUpdate);

    const data = {
      schedules: [{
        id: scheduleId,
        schedule: {
          periods: [{
            id: 0,
            period,
          }],
        },
      }],
    };

    await this.system.api.publishMessage(this.system.sysId, data);
    this.processPeriod(period);
    this.executeOnUpdateCallbacks();
  }

  /**
   * Set HVAC mode (off, heat, cool, heat and cool)
   */
  async setHVACMode(mode: string): Promise<void> {
    if (!HVAC_MODES.has(mode)) {
      throw new S30Exception(
        `Invalid HVAC mode: ${mode}. Must be one of: ${[...HVAC_MODES].join(', ')}`,
        ErrorCodes.EC_BAD_PARAMETERS,
        1
      );
    }

    // Validate mode against zone capabilities
    if (mode === LENNOX_HVAC_COOL && !this.coolingOption) {
      throw new S30Exception(
        `Zone ${this.id} does not support cooling`,
        ErrorCodes.EC_BAD_PARAMETERS,
        2
      );
    }
    if ((mode === LENNOX_HVAC_HEAT || mode === LENNOX_HVAC_EMERGENCY_HEAT) && !this.heatingOption) {
      throw new S30Exception(
        `Zone ${this.id} does not support heating`,
        ErrorCodes.EC_BAD_PARAMETERS,
        3
      );
    }
    if (mode === LENNOX_HVAC_HEAT_COOL && (!this.heatingOption || !this.coolingOption)) {
      throw new S30Exception(
        `Zone ${this.id} does not support heat and cool mode`,
        ErrorCodes.EC_BAD_PARAMETERS,
        4
      );
    }

    const scheduleId = this.getSetpointScheduleId();
    await this.system.setHVACMode(mode, scheduleId);
    this.processPeriod({ systemMode: mode });
    this.executeOnUpdateCallbacks();
  }

  /**
   * Set fan mode (on, auto, circulate)
   */
  async setFanMode(mode: string): Promise<void> {
    if (!FAN_MODES.has(mode)) {
      throw new S30Exception(
        `Invalid fan mode: ${mode}. Must be one of: ${[...FAN_MODES].join(', ')}`,
        ErrorCodes.EC_BAD_PARAMETERS,
        1
      );
    }

    const scheduleId = this.getSetpointScheduleId();
    await this.system.setFanMode(mode, scheduleId);
    this.processPeriod({ fanMode: mode });
    this.executeOnUpdateCallbacks();
  }

  /**
   * Set humidity mode (off, humidify, dehumidify, both)
   */
  async setHumidityMode(mode: string): Promise<void> {
    if (!HUMIDITY_MODES.has(mode)) {
      throw new S30Exception(
        `Invalid humidity mode: ${mode}. Must be one of: ${[...HUMIDITY_MODES].join(', ')}`,
        ErrorCodes.EC_BAD_PARAMETERS,
        1
      );
    }

    // Validate capabilities
    if (mode === 'humidify' && !this.humidificationOption) {
      throw new S30Exception(
        `Zone ${this.id} does not support humidification`,
        ErrorCodes.EC_BAD_PARAMETERS,
        2
      );
    }
    if (mode === 'dehumidify' && !this.dehumidificationOption) {
      throw new S30Exception(
        `Zone ${this.id} does not support dehumidification`,
        ErrorCodes.EC_BAD_PARAMETERS,
        2
      );
    }
    if (mode === 'both' && (!this.humidificationOption || !this.dehumidificationOption)) {
      throw new S30Exception(
        `Zone ${this.id} does not support both humidification and dehumidification`,
        ErrorCodes.EC_BAD_PARAMETERS,
        2
      );
    }

    const scheduleId = this.getSetpointScheduleId();
    await this.system.setHumidityMode(mode, scheduleId);
    this.processPeriod({ humidityMode: mode });
    this.executeOnUpdateCallbacks();
  }

  /**
   * Set schedule hold
   */
  async setScheduleHold(hold: boolean): Promise<void> {
    const data = {
      zones: [{
        id: this.id,
        scheduleHold: {
          enabled: hold,
        },
      }],
    };

    await this.system.api.publishMessage(this.system.sysId, data);
    this.processMessage(data.zones[0]);
    this.executeOnUpdateCallbacks();
  }

  /**
   * Set zone to manual mode
   */
  async setManualMode(): Promise<void> {
    const data = {
      zones: [{
        id: this.id,
        config: {
          scheduleId: this.getManualModeScheduleId(),
        },
      }],
    };

    await this.system.api.publishMessage(this.system.sysId, data);
    this.processMessage(data.zones[0]);
    this.executeOnUpdateCallbacks();
  }

  /**
   * Set zone to a named schedule
   */
  async setSchedule(scheduleName: string): Promise<void> {
    const schedule = this.system.getScheduleByName(scheduleName);
    if (!schedule) {
      throw new S30Exception(
        `Schedule not found: ${scheduleName}`,
        ErrorCodes.EC_NO_SCHEDULE,
        1
      );
    }

    const data = {
      zones: [{
        id: this.id,
        config: {
          scheduleId: schedule.id,
        },
      }],
    };

    await this.system.api.publishMessage(this.system.sysId, data);
    this.processMessage(data.zones[0]);
    this.executeOnUpdateCallbacks();
  }
}
