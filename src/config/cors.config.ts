import { ConfigType, registerAs } from '@nestjs/config';

function parseList(value?: string, defaultValue: string[] = []) {
  if (!value) {
    return defaultValue;
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const corsConfig = registerAs('cors', () => {
  // No default origins - must be explicitly configured in production
  const defaultOrigins: string[] = [];

  return {
    origins: parseList(process.env.CORS_ALLOWED_ORIGINS, defaultOrigins),
    methods: parseList(process.env.CORS_ALLOWED_METHODS, [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]),
    allowedHeaders: parseList(process.env.CORS_ALLOWED_HEADERS, [
      'Authorization',
      'Content-Type',
    ]),
    exposedHeaders: parseList(process.env.CORS_EXPOSED_HEADERS, []),
    credentials: process.env.CORS_ALLOW_CREDENTIALS === 'true',
    maxAge: parseInt(process.env.CORS_MAX_AGE ?? '600', 10),
  };
});

export type CorsConfig = ConfigType<typeof corsConfig>;
