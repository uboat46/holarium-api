import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import type { ActiveUserData } from './interfaces/active-user-data.interface';
import { TokenContext } from './interfaces/token-context.interface';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Throttle({ default: { limit: 3, ttl: 3600_000 } })
  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.authService.register(registerDto, this.getContext(req));
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('login')
  // the loginDto is not used, but it is required by the guard
  login(@Body() _loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(req.user as User, this.getContext(req));
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.getContext(req));
  }

  @Post('logout')
  logout(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    return this.authService.logout(user, dto);
  }

  @Get('me')
  me(@CurrentUser() user: ActiveUserData) {
    return this.authService.getProfile(user.userId);
  }

  private getContext(request: Request): TokenContext {
    return {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      device: (request.headers['x-device-id'] as string) ?? null,
    };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('refresh/expired')
  async pruneExpiredTokens() {
    const deleted = await this.authService.removeExpiredRefreshTokens();
    return { deleted };
  }
}
