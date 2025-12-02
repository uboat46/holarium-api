import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { Throttle } from '@nestjs/throttler';

import { Public } from './auth/decorators/public.decorator';

@Public()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('health/database')
  async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'healthy', connected: true };
    } catch {
      // Don't expose error details to prevent information leakage
      return {
        status: 'unhealthy',
        connected: false,
      };
    }
  }
}
