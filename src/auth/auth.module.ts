import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtConfig } from '../config/jwt.config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

function loadKey(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }

  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule.register({ session: false }),
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
        const privateKey = loadKey(jwtConfig.privateKeyPath);
        const publicKey = loadKey(jwtConfig.publicKeyPath);
        const useRsa = !!(privateKey && publicKey);
        const sharedSecret = process.env.JWT_SECRET ?? 'development-secret';
        const expiresIn = jwtConfig.accessTokenTtl as number | StringValue;

        return {
          privateKey: useRsa ? privateKey : undefined,
          publicKey: useRsa ? publicKey : undefined,
          secret: useRsa ? undefined : sharedSecret,
          signOptions: {
            algorithm: useRsa ? 'RS256' : 'HS512',
            expiresIn,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
          },
          verifyOptions: {
            algorithms: useRsa ? ['RS256'] : ['HS512'],
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
