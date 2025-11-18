import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { JwtConfig } from '../../config/jwt.config';
import { UsersService } from '../../users/users.service';

function loadPublicKey(path?: string): string {
  if (!path) {
    throw new Error('JWT_PUBLIC_KEY_PATH must be configured.');
  }
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new Error(`Unable to read public key at ${path}`);
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
    const publicKey = loadPublicKey(jwtConfig.publicKeyPath);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
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
