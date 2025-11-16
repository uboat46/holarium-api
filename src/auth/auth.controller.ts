import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { ActiveUserData } from './interfaces/active-user-data.interface';
import { TokenContext } from './interfaces/token-context.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.authService.register(registerDto, this.getContext(req));
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Body() _loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(req.user as User, this.getContext(req));
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.getContext(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser() user: ActiveUserData,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    return this.authService.logout(user, dto);
  }

  @UseGuards(JwtAuthGuard)
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
}
