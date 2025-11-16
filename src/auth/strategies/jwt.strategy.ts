import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { JwtConfig } from '../../config/jwt.config';
import { UsersService } from '../../users/users.service';

function loadKeyOrSecret(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }

  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtConfig = configService.getOrThrow<JwtConfig>('jwt');
    const publicKey = loadKeyOrSecret(jwtConfig.publicKeyPath);
    const sharedSecret = process.env.JWT_SECRET ?? 'development-secret';
    const secretOrKey = publicKey ?? sharedSecret;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      algorithms: publicKey ? ['RS256'] : ['HS512'],
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
