import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { RolesGuard } from './guards/roles.guard';

function loadKey(path?: string, label?: string): string {
  if (!path) {
    throw new Error(
      `${label ?? 'JWT key'} path is missing. Ensure all RSA key env vars are set.`,
    );
  }

  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Unable to read key file at ${path}`);
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
        const privateKey = loadKey(
          jwtConfig.privateKeyPath,
          'JWT_PRIVATE_KEY_PATH',
        );
        const publicKey = loadKey(
          jwtConfig.publicKeyPath,
          'JWT_PUBLIC_KEY_PATH',
        );
        const expiresIn = jwtConfig.accessTokenTtl as number | StringValue;

        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
          },
          verifyOptions: {
            algorithms: ['RS256'],
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    LocalAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService],
})
export class AuthModule { }
