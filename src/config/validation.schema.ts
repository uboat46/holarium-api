import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().integer().min(1).default(10),
  DB_CONNECTION_TIMEOUT: Joi.number().integer().min(1000).default(5000),

  JWT_PRIVATE_KEY_PATH: Joi.string().default('keys/access-private.pem'),
  JWT_PUBLIC_KEY_PATH: Joi.string().default('keys/access-public.pem'),
  JWT_REFRESH_PRIVATE_KEY_PATH: Joi.string().default(
    'keys/refresh-private.pem',
  ),
  JWT_REFRESH_PUBLIC_KEY_PATH: Joi.string().default('keys/refresh-public.pem'),
  ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL: Joi.string().default('30d'),
  JWT_ISSUER: Joi.string().default('holarium'),
  JWT_AUDIENCE: Joi.string().default('holarium-clients'),

  BCRYPT_ROUNDS: Joi.number().integer().min(6).max(14).default(12),

  THROTTLE_TTL: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(60),

  AUTH_LOCKOUT_THRESHOLD: Joi.number().integer().min(1).default(5),
  AUTH_LOCKOUT_DURATION_MINUTES: Joi.number().integer().min(1).default(15),
  MAX_REFRESH_TOKENS_PER_USER: Joi.number().integer().min(1).default(5),
  TOKEN_REUSE_GRACE_PERIOD_SECONDS: Joi.number().integer().min(0).default(0),

  JWT_SECRET: Joi.string().optional(),
});
