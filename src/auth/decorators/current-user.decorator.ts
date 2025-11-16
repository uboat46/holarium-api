import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

type RequestWithUser = {
  user?: ActiveUserData;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveUserData => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new Error('Current user not found in request context');
    }
    return request.user;
  },
);
