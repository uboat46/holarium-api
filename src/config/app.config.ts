import { ConfigType, registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  encryptionKey: process.env.APP_ENCRYPTION_KEY,
}));

export type AppConfig = ConfigType<typeof appConfig>;
