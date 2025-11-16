/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = ActiveUserData>(
    err: unknown,
    user: TUser | false,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    if (err) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw err instanceof Error ? err : new Error(String(err));
    }
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
