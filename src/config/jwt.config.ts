import { ConfigType, registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH ?? 'keys/access-private.pem',
  publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH ?? 'keys/access-public.pem',
  refreshPrivateKeyPath:
    process.env.JWT_REFRESH_PRIVATE_KEY_PATH ?? 'keys/refresh-private.pem',
  refreshPublicKeyPath:
    process.env.JWT_REFRESH_PUBLIC_KEY_PATH ?? 'keys/refresh-public.pem',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
  issuer: process.env.JWT_ISSUER ?? 'holarium',
  audience: process.env.JWT_AUDIENCE ?? 'holarium-clients',
}));

export type JwtConfig = ConfigType<typeof jwtConfig>;
