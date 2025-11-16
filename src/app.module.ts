import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import dataSource from './database/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/validation.schema';
import { appConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';
import { bcryptConfig } from './config/bcrypt.config';
import { ThrottlerConfig, throttlerConfig } from './config/throttler.config';
import { authConfig } from './config/auth.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, jwtConfig, bcryptConfig, throttlerConfig, authConfig],
      validationSchema,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttler =
          configService.getOrThrow<ThrottlerConfig>('throttler');
        return [
          {
            ttl: throttler.ttl,
            limit: throttler.limit,
          },
        ];
      },
    }),
    TypeOrmModule.forRoot(dataSource.options),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
