import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppModule } from './app.module';
import { CorsConfig } from './config/cors.config';
import { AppLoggerService } from './common/logger/logger.service';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger with sensitive data masking
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);
  const configService = app.get(ConfigService);
  const corsConfig = configService.get<CorsConfig>('cors');

  console.log('==================== process.env.*', process.env);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter for stack trace sanitization
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  app.use(helmet());

  if (corsConfig) {
    const corsOptions: CorsOptions = {
      credentials: corsConfig.credentials,
      methods: corsConfig.methods,
      allowedHeaders: corsConfig.allowedHeaders,
      exposedHeaders: corsConfig.exposedHeaders,
      maxAge: corsConfig.maxAge,
      origin: (origin, callback) => {
        if (!origin || corsConfig.origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
    };
    app.enableCors(corsOptions);
  }

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);
}
bootstrap();
