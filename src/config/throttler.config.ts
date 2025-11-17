import { ConfigType, registerAs } from '@nestjs/config';

export const throttlerConfig = registerAs('throttler', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000,
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
}));

export type ThrottlerConfig = ConfigType<typeof throttlerConfig>;
