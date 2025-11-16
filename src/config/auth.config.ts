import { ConfigType, registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  lockoutThreshold: parseInt(process.env.AUTH_LOCKOUT_THRESHOLD ?? '5', 10),
  lockoutDurationMinutes: parseInt(
    process.env.AUTH_LOCKOUT_DURATION_MINUTES ?? '15',
    10,
  ),
}));

export type AuthConfig = ConfigType<typeof authConfig>;
