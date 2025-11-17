import type { StringValue } from 'ms';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { User, UserStatus } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenContext } from './interfaces/token-context.interface';
import { AuthConfig } from '../config/auth.config';
import { JwtConfig } from '../config/jwt.config';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ActiveUserData } from './interfaces/active-user-data.interface';

type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly maxRefreshTokens: number;
  private readonly reuseDetectionWindowMs: number;
  private readonly refreshTokenTtlMs: number;
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    const authConfig = configService.getOrThrow<AuthConfig>('auth');
    this.jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
    this.maxRefreshTokens = authConfig.maxRefreshTokensPerUser;
    this.reuseDetectionWindowMs =
      authConfig.tokenReuseGracePeriodSeconds * 1000;
    this.refreshTokenTtlMs = this.parseDurationToMs(
      this.jwtConfig.refreshTokenTtl,
    );
  }

  async register(
    registerDto: RegisterDto,
    context: TokenContext,
  ): Promise<AuthResponse> {
    const user = await this.usersService.create({
      ...registerDto,
      status: UserStatus.ACTIVE,
    });
    return this.issueTokens(user, context);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await user.validatePassword(password))) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.usersService.ensureAccountIsActive(user);
    await this.usersService.markSuccessfulLogin(user.id);
    // remove password before attaching to request
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete (user as any).password;
    return user;
  }

  async login(user: User, context: TokenContext): Promise<AuthResponse> {
    return this.issueTokens(user, context);
  }

  async refresh(
    refreshToken: string,
    context: TokenContext,
  ): Promise<AuthResponse> {
    const { user, token } = await this.validateRefreshToken(refreshToken);
    await this.revokeToken(token);
    return this.issueTokens(user, context, {
      familyId: token.tokenFamilyId,
      rotatedFromId: token.id,
    });
  }

  async logout(
    activeUser: ActiveUserData,
    logoutDto?: LogoutDto,
  ): Promise<void> {
    if (logoutDto?.allDevices) {
      await this.refreshTokenRepository.delete({ userId: activeUser.userId });
      return;
    }

    if (!logoutDto?.refreshToken) {
      throw new BadRequestException('refreshToken is required to logout');
    }

    await this.revokeRefreshToken(activeUser.userId, logoutDto.refreshToken);
  }

  async getProfile(userId: string): Promise<User> {
    return this.usersService.findOne(userId);
  }

  private async issueTokens(
    user: User,
    context: TokenContext,
    refreshOptions?: { familyId?: string; rotatedFromId?: string },
  ): Promise<AuthResponse> {
    const safeUser = this.sanitizeUser(user);

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user, context, refreshOptions),
    ]);

    return { user: safeUser, accessToken, refreshToken };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const expiresIn = this.jwtConfig.accessTokenTtl as number | StringValue;
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  private async generateRefreshToken(
    user: User,
    context: TokenContext,
    options?: { familyId?: string; rotatedFromId?: string },
  ): Promise<string> {
    const plainToken = randomBytes(64).toString('base64url');
    const tokenHash = this.hashToken(plainToken);

    const tokenFamilyId = options?.familyId ?? randomUUID();

    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    const tokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      tokenFamilyId,
      device: context.device ?? context.userAgent,
      ip: context.ip,
      expiresAt,
      rotatedFromId: options?.rotatedFromId,
    });

    await this.refreshTokenRepository.save(tokenEntity);
    await this.enforceRefreshTokenLimit(user.id);

    return plainToken;
  }

  private async enforceRefreshTokenLimit(userId: string): Promise<void> {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    if (tokens.length <= this.maxRefreshTokens) {
      return;
    }

    const overflow = tokens.length - this.maxRefreshTokens;
    const toRemove = tokens.slice(0, overflow);
    await this.refreshTokenRepository.remove(toRemove);
  }

  private async validateRefreshToken(refreshToken: string): Promise<{
    token: RefreshToken;
    user: User;
  }> {
    const tokenHash = this.hashToken(refreshToken);
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!token) {
      throw this.createInvalidRefreshTokenException();
    }

    if (token.revokedAt) {
      const withinReuseWindow =
        this.reuseDetectionWindowMs === 0 ||
        token.revokedAt.getTime() + this.reuseDetectionWindowMs > Date.now();
      if (withinReuseWindow) {
        await this.revokeFamily(token.tokenFamilyId);
      }
      throw this.createInvalidRefreshTokenException();
    }

    if (token.expiresAt.getTime() < Date.now()) {
      await this.revokeToken(token);
      throw this.createInvalidRefreshTokenException();
    }

    const user = token.user;
    this.usersService.ensureAccountIsActive(user);

    return { token, user };
  }

  private async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId },
    });
    if (!token) {
      throw this.createInvalidRefreshTokenException();
    }
    await this.revokeToken(token);
  }

  private async revokeToken(token: RefreshToken): Promise<void> {
    token.markRevoked();
    await this.refreshTokenRepository.save(token);
  }

  private async revokeFamily(tokenFamilyId: string): Promise<void> {
    const tokens = await this.refreshTokenRepository.find({
      where: { tokenFamilyId },
    });
    const now = new Date();
    tokens.forEach((token) => token.markRevoked(now));
    await this.refreshTokenRepository.save(tokens);
  }

  private hashToken(token: string): string {
    return createHash('sha512').update(token).digest('hex');
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      const asNumber = Number(duration);
      return Number.isFinite(asNumber)
        ? asNumber * 1000
        : 30 * 24 * 60 * 60 * 1000;
    }
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value * 1000;
    }
  }

  private sanitizeUser(user: User): User {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((user as any).password) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (user as any).password;
    }
    return user;
  }

  private createInvalidRefreshTokenException(): UnauthorizedException {
    return new UnauthorizedException('Invalid refresh token');
  }
}
