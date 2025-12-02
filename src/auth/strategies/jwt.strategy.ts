import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { JwtConfig } from '../../config/jwt.config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');

    if (!jwtConfig.publicKey) {
      throw new Error('JWT_PUBLIC_KEY must be set in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.publicKey,
      algorithms: ['RS256'],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  }

  async validate(payload: JwtPayload): Promise<ActiveUserData> {
    const user = await this.usersService.findOne(payload.sub);
    this.usersService.ensureAccountIsActive(user);
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
