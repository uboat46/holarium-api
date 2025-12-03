import { ConfigType, registerAs } from '@nestjs/config';

// Helper to fix newline formatting in env vars (converts literal "\n" to actual newlines)
const formatKey = (key: string | undefined) => {
  if (!key) return key;
  return key.replace(/\\n/g, '\n');
};

export const jwtConfig = registerAs('jwt', () => ({
  // RSA key content loaded directly from environment variables
  privateKey: formatKey(process.env.JWT_PRIVATE_KEY),
  publicKey: formatKey(process.env.JWT_PUBLIC_KEY),
  refreshPrivateKey: formatKey(process.env.JWT_REFRESH_PRIVATE_KEY),
  refreshPublicKey: formatKey(process.env.JWT_REFRESH_PUBLIC_KEY),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '5m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
  issuer: process.env.JWT_ISSUER ?? 'holarium',
  audience: process.env.JWT_AUDIENCE ?? 'holarium-clients',
}));

export type JwtConfig = ConfigType<typeof jwtConfig>;
