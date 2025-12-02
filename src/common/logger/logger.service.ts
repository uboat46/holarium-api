import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends ConsoleLogger {
  private static readonly SENSITIVE_KEYS = [
    'password',
    'token',
    'secret',
    'authorization',
    'cookie',
    'apikey',
    'api_key',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'bearer',
    'credential',
    'private',
    'key',
  ];

  private static readonly MASK = '[REDACTED]';

  log(message: unknown, ...optionalParams: unknown[]) {
    super.log(this.maskSensitiveData(message), ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    super.error(this.maskSensitiveData(message), ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    super.warn(this.maskSensitiveData(message), ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    super.debug(this.maskSensitiveData(message), ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    super.verbose(this.maskSensitiveData(message), ...optionalParams);
  }

  private maskSensitiveData(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.maskString(data);
    }

    if (typeof data === 'object' && data !== null) {
      return this.maskObject(data);
    }

    return data;
  }

  private maskString(str: string): string {
    let masked = str;

    // Mask JWT tokens (Bearer tokens)
    masked = masked.replace(
      /Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/gi,
      `Bearer ${AppLoggerService.MASK}`,
    );

    // Mask standalone JWT-like patterns
    masked = masked.replace(
      /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/g,
      AppLoggerService.MASK,
    );

    return masked;
  }

  private maskObject(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskSensitiveData(item));
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = AppLoggerService.SENSITIVE_KEYS.some(
        (sensitiveKey) =>
          lowerKey.includes(sensitiveKey) || lowerKey === sensitiveKey,
      );

      if (isSensitive) {
        masked[key] = AppLoggerService.MASK;
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskObject(value);
      } else if (typeof value === 'string') {
        masked[key] = this.maskString(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}
