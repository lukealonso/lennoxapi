/**
 * Type definitions and constants for Lennox S30 API
 */

// HVAC Modes
export const LENNOX_HVAC_OFF = 'off';
export const LENNOX_HVAC_COOL = 'cool';
export const LENNOX_HVAC_HEAT = 'heat';
export const LENNOX_HVAC_HEAT_COOL = 'heat and cool';
export const LENNOX_HVAC_EMERGENCY_HEAT = 'emergency heat';

export const HVAC_MODES = new Set([
  LENNOX_HVAC_OFF,
  LENNOX_HVAC_COOL,
  LENNOX_HVAC_HEAT,
  LENNOX_HVAC_HEAT_COOL,
  LENNOX_HVAC_EMERGENCY_HEAT,
]);

export type HVACMode = typeof LENNOX_HVAC_OFF | typeof LENNOX_HVAC_COOL | typeof LENNOX_HVAC_HEAT | typeof LENNOX_HVAC_HEAT_COOL | typeof LENNOX_HVAC_EMERGENCY_HEAT;

// Fan Modes
export const FAN_MODE_ON = 'on';
export const FAN_MODE_AUTO = 'auto';
export const FAN_MODE_CIRCULATE = 'circulate';

export const FAN_MODES = new Set([FAN_MODE_ON, FAN_MODE_AUTO, FAN_MODE_CIRCULATE]);

export type FanMode = typeof FAN_MODE_ON | typeof FAN_MODE_AUTO | typeof FAN_MODE_CIRCULATE;

// Humidity Modes
export const LENNOX_HUMIDITY_MODE_OFF = 'off';
export const LENNOX_HUMIDITY_MODE_HUMIDIFY = 'humidify';
export const LENNOX_HUMIDITY_MODE_DEHUMIDIFY = 'dehumidify';
export const LENNOX_HUMIDITY_MODE_BOTH = 'both';

export const HUMIDITY_MODES = new Set([
  LENNOX_HUMIDITY_MODE_OFF,
  LENNOX_HUMIDITY_MODE_HUMIDIFY,
  LENNOX_HUMIDITY_MODE_DEHUMIDIFY,
  LENNOX_HUMIDITY_MODE_BOTH,
]);

export type HumidityMode = typeof LENNOX_HUMIDITY_MODE_OFF | typeof LENNOX_HUMIDITY_MODE_HUMIDIFY | typeof LENNOX_HUMIDITY_MODE_DEHUMIDIFY | typeof LENNOX_HUMIDITY_MODE_BOTH;

// Humidity Operation States
export const LENNOX_HUMID_OPERATION_OFF = 'off';
export const LENNOX_HUMID_OPERATION_DEHUMID = 'dehumidifying';
export const LENNOX_HUMID_OPERATION_HUMID = 'humidifying';
export const LENNOX_HUMID_OPERATION_WAITING = 'waiting';

// Temperature Operation States
export const LENNOX_TEMP_OPERATION_OFF = 'off';
export const LENNOX_TEMP_OPERATION_HEATING = 'heating';
export const LENNOX_TEMP_OPERATION_COOLING = 'cooling';

// Ventilation Modes
export const LENNOX_VENTILATION_MODE_ON = 'on';
export const LENNOX_VENTILATION_MODE_OFF = 'off';
export const LENNOX_VENTILATION_MODE_INSTALLER = 'installer';

export const VENTILATION_MODES = [
  LENNOX_VENTILATION_MODE_ON,
  LENNOX_VENTILATION_MODE_OFF,
  LENNOX_VENTILATION_MODE_INSTALLER,
] as const;

export type VentilationMode = typeof VENTILATION_MODES[number];

// Dehumidification Modes
export const LENNOX_DEHUMIDIFICATION_MODE_HIGH = 'high';
export const LENNOX_DEHUMIDIFICATION_MODE_MEDIUM = 'medium';
export const LENNOX_DEHUMIDIFICATION_MODE_AUTO = 'auto';

export const DEHUMIDIFICATION_MODES = new Set([
  LENNOX_DEHUMIDIFICATION_MODE_HIGH,
  LENNOX_DEHUMIDIFICATION_MODE_MEDIUM,
  LENNOX_DEHUMIDIFICATION_MODE_AUTO,
]);

export type DehumidificationMode = typeof LENNOX_DEHUMIDIFICATION_MODE_HIGH | typeof LENNOX_DEHUMIDIFICATION_MODE_MEDIUM | typeof LENNOX_DEHUMIDIFICATION_MODE_AUTO;

// Zoning Modes
export const LENNOX_ZONING_MODE_ZONED = 'zoned';
export const LENNOX_ZONING_MODE_CENTRAL = 'central';

// Status Values
export const LENNOX_STATUS_GOOD = 'good';
export const LENNOX_STATUS_NOT_EXIST = 'not_exist';
export const LENNOX_STATUS_NOT_AVAILABLE = 'not_available';
export const LENNOX_STATUS_ERROR = 'error';

export const LENNOX_BAD_STATUS = new Set([
  LENNOX_STATUS_NOT_EXIST,
  LENNOX_STATUS_NOT_AVAILABLE,
  LENNOX_STATUS_ERROR,
]);

// Smart Away States
export const LENNOX_SA_STATE_ENABLED_CANCELLED = 'enabled cancelled';
export const LENNOX_SA_STATE_ENABLED_ACTIVE = 'enabled active';
export const LENNOX_SA_STATE_ENABLED_INACTIVE = 'enabled inactive';
export const LENNOX_SA_STATE_DISABLED = 'disabled';

export const LENNOX_SA_SETPOINT_STATE_HOME = 'home';
export const LENNOX_SA_SETPOINT_STATE_TRANSITION = 'transition';
export const LENNOX_SA_SETPOINT_STATE_AWAY = 'away';

// Product Types
export const LENNOX_PRODUCT_TYPE_S40 = 'S40';
export const LENNOX_PRODUCT_TYPE_S30 = 'S30';

// Circulation Time Limits (percentage)
export const LENNOX_CIRCULATE_TIME_MIN = 15;
export const LENNOX_CIRCULATE_TIME_MAX = 45;

// Setpoint Separation Defaults
export const LENNOX_HSP_CSP_SEP_DEFAULT = 3;
export const LENNOX_HSPC_CSPC_SEP_DEFAULT = 1.5;

// Schedule Constants
export const LENNOX_MANUAL_MODE_SCHEDULE_START_INDEX = 16;

// Parameter IDs
export const LENNOX_PARAMETER_SINGLE_SETPOINT_MODE = 525;

// Callback types
export type UpdateCallback = () => void;

export interface CallbackEntry {
  func: UpdateCallback;
  match?: string[] | null;
}

// API Configuration
export interface S30APIConfig {
  ipAddress: string;
  appId?: string;
  protocol?: 'http' | 'https';
  timeout?: number;
  longPollDelay?: number;
}

// Message types
export interface LennoxMessage {
  MessageId?: string;
  SenderID?: string;
  TargetID?: string;
  MessageType?: string;
  Data?: Record<string, unknown>;
  AdditionalParameters?: Record<string, unknown>;
}

export interface RetrieveResponse {
  messages?: LennoxMessage[];
}

// Setpoint options
export interface SetpointOptions {
  hsp?: number;      // Heat setpoint Fahrenheit
  hspC?: number;     // Heat setpoint Celsius
  csp?: number;      // Cool setpoint Fahrenheit
  cspC?: number;     // Cool setpoint Celsius
  sp?: number;       // Single setpoint Fahrenheit (perfect temp mode)
  spC?: number;      // Single setpoint Celsius
}

export interface HumiditySetpointOptions {
  husp?: number;     // Humidity setpoint
  desp?: number;     // Dehumidification setpoint
}

// Schedule info
export interface LennoxSchedule {
  id: number;
  name: string;
  periods?: LennoxPeriod[];
}

export interface LennoxPeriod {
  id: number;
  enabled?: boolean;
  startTime?: number;
  hsp?: number;
  hspC?: number;
  csp?: number;
  cspC?: number;
  sp?: number;
  spC?: number;
  husp?: number;
  desp?: number;
  fanMode?: string;
  systemMode?: string;
  humidityMode?: string;
}

// Home structure (for API compatibility)
export interface LennoxHome {
  id: string;
  idx: number;
  name: string;
}

