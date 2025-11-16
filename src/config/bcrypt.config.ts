import { ConfigType, registerAs } from '@nestjs/config';

export const bcryptConfig = registerAs('bcrypt', () => ({
  rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
}));

export type BcryptConfig = ConfigType<typeof bcryptConfig>;
