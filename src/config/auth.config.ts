import { ConfigType, registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  lockoutThreshold: parseInt(process.env.AUTH_LOCKOUT_THRESHOLD ?? '5', 10),
  lockoutDurationMinutes: parseInt(
    process.env.AUTH_LOCKOUT_DURATION_MINUTES ?? '15',
    10,
  ),
  maxRefreshTokensPerUser: parseInt(
    process.env.MAX_REFRESH_TOKENS_PER_USER ?? '5',
    10,
  ),
  tokenReuseGracePeriodSeconds: parseInt(
    process.env.TOKEN_REUSE_GRACE_PERIOD_SECONDS ?? '0',
    10,
  ),
}));

export type AuthConfig = ConfigType<typeof authConfig>;
