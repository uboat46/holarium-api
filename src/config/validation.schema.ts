import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // Encryption key for device/IP data at rest (min 32 chars recommended)
  APP_ENCRYPTION_KEY: Joi.string().min(32).required(),

  // CORS_ALLOWED_ORIGINS is required in production to prevent misconfiguration
  CORS_ALLOWED_ORIGINS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required().messages({
      'string.empty': 'CORS_ALLOWED_ORIGINS is required in production',
      'any.required': 'CORS_ALLOWED_ORIGINS must be set in production',
    }),
    otherwise: Joi.string().optional(),
  }),

  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().integer().min(1).default(10),
  DB_CONNECTION_TIMEOUT: Joi.number().integer().min(1000).default(5000),

  // RSA key content (PEM format) loaded directly from environment variables
  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY: Joi.string().required(),
  JWT_REFRESH_PRIVATE_KEY: Joi.string().required(),
  JWT_REFRESH_PUBLIC_KEY: Joi.string().required(),
  ACCESS_TOKEN_TTL: Joi.string().default('5m'),
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

  CORS_ALLOWED_METHODS: Joi.string().optional(),
  CORS_ALLOWED_HEADERS: Joi.string().optional(),
  CORS_EXPOSED_HEADERS: Joi.string().optional(),
  CORS_ALLOW_CREDENTIALS: Joi.boolean().default(false),
  CORS_MAX_AGE: Joi.number().integer().min(0).default(600),
});
