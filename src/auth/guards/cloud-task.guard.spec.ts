import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CloudTaskGuard } from './cloud-task.guard';
import { Request } from 'express';

// Mock OAuth2Client
jest.mock('google-auth-library', () => {
    return {
        OAuth2Client: jest.fn().mockImplementation(() => {
            return {
                verifyIdToken: jest.fn().mockImplementation(async ({ idToken }) => {
                    if (idToken === 'valid-token') {
                        return {
                            getPayload: () => ({ email: 'service-account@test.iam.gserviceaccount.com' }),
                        };
                    }
                    throw new Error('Invalid token');
                }),
            };
        }),
    };
});

// Helper to create mock context
function createMockContext(headers: Record<string, string>): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({
                headers,
            }),
        }),
    } as unknown as ExecutionContext;
}

describe('CloudTaskGuard', () => {
    let guard: CloudTaskGuard;

    beforeEach(() => {
        guard = new CloudTaskGuard();
        process.env.NODE_ENV = 'production'; // Default to prod for strict checks
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should allow request with valid OIDC token', async () => {
        const context = createMockContext({ authorization: 'Bearer valid-token' });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should deny request with invalid OIDC token', async () => {
        const context = createMockContext({ authorization: 'Bearer invalid-token' });
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should deny request with missing authorization header', async () => {
        const context = createMockContext({});
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow request with local dev header in development mode', async () => {
        process.env.NODE_ENV = 'development';
        const context = createMockContext({ 'x-cloud-task-local': 'true' });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should deny request with local dev header in production mode', async () => {
        process.env.NODE_ENV = 'production';
        const context = createMockContext({ 'x-cloud-task-local': 'true' });
        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
});

