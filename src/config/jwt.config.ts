import { ConfigType, registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  // RSA key content loaded directly from environment variables
  privateKey: process.env.JWT_PRIVATE_KEY,
  publicKey: process.env.JWT_PUBLIC_KEY,
  refreshPrivateKey: process.env.JWT_REFRESH_PRIVATE_KEY,
  refreshPublicKey: process.env.JWT_REFRESH_PUBLIC_KEY,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '5m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
  issuer: process.env.JWT_ISSUER ?? 'holarium',
  audience: process.env.JWT_AUDIENCE ?? 'holarium-clients',
}));

export type JwtConfig = ConfigType<typeof jwtConfig>;
