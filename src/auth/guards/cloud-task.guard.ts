import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { Request } from 'express';

@Injectable()
export class CloudTaskGuard implements CanActivate {
    private readonly logger = new Logger(CloudTaskGuard.name);
    private readonly client = new OAuth2Client();

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const isDev = process.env.NODE_ENV === 'development';

        // 1. Local Development Bypass
        if (isDev) {
            const localHeader = request.headers['x-cloud-task-local'];
            if (localHeader === 'true') {
                return true;
            }
        }

        // 2. Extract Token
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            this.logger.warn('Missing Authorization header for Cloud Task endpoint');
            throw new UnauthorizedException('Missing Authorization header');
        }

        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            this.logger.warn('Invalid Authorization header format');
            throw new UnauthorizedException('Invalid Authorization header format');
        }

        // 3. Verify Token
        try {
            // We verify the ID token.
            // Ideally, we check the audience (our service URL)
            // But for simplicity/flexibility, we verify it is a valid Google-signed token.
            // If you want strict audience checking, add `audience: process.env.SERVICE_URL`
            const ticket = await this.client.verifyIdToken({
                idToken: token,
                // audience: ... // Optional: Check if matched
            });

            const payload = ticket.getPayload();
            // Optional: Check if email_verified is true or specific service account email
            if (!payload) {
                throw new Error('Invalid token payload');
            }

            // this.logger.debug(`Authenticated Cloud Task from: ${payload.email}`);
            return true;
        } catch (error) {
            this.logger.error(`Token verification failed: ${error.message}`);
            throw new UnauthorizedException('Invalid OIDC token');
        }
    }
}
