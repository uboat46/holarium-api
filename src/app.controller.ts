import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): string {
    return this.appService.getHello();
  }

  @Get('health/database')
  async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'healthy', connected: true };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error: `${error.message}`,
      };
    }
  }
}
