/**
 * Exception handling for Lennox S30 API
 */

export const ErrorCodes = {
  EC_AUTHENTICATE: 'AUTHENTICATE',
  EC_LOGIN: 'LOGIN',
  EC_LOGOUT: 'LOGOUT',
  EC_NEGOTIATE: 'NEGOTIATE',
  EC_SUBSCRIBE: 'SUBSCRIBE',
  EC_COMMS_ERROR: 'COMMS_ERROR',
  EC_HTTP_ERR: 'HTTP_ERROR',
  EC_UNAUTHORIZED: 'UNAUTHORIZED',
  EC_BAD_PARAMETERS: 'BAD_PARAMETERS',
  EC_PUBLISH_MESSAGE: 'PUBLISH_MESSAGE',
  EC_REQUEST_DATA_HELPER: 'REQUEST_DATA',
  EC_SETMODE_HELPER: 'SETMODE',
  EC_NO_SCHEDULE: 'NO_SCHEDULE',
  EC_EQUIPMENT_DNS: 'EQUIPMENT_DNS',
  EC_CONFIG_TIMEOUT: 'CONFIG_TIMEOUT',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class S30Exception extends Error {
  public readonly errorCode: ErrorCode;
  public readonly reference: number;

  constructor(message: string, errorCode: ErrorCode, reference: number = 0) {
    super(message);
    this.name = 'S30Exception';
    this.errorCode = errorCode;
    this.reference = reference;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, S30Exception);
    }
  }

  /**
   * Returns a formatted string representation of the exception
   */
  asString(): string {
    return `S30Exception: code=[${this.errorCode}] ref=[${this.reference}] message=[${this.message}]`;
  }

  /**
   * Creates an S30Exception from a communication error (fetch errors, timeouts, etc)
   */
  static fromCommError(error: Error, operation: string, url: string): S30Exception {
    const message = `${operation} failed: ${error.message} url=[${url}]`;
    return new S30Exception(message, ErrorCodes.EC_COMMS_ERROR, 1);
  }
}

