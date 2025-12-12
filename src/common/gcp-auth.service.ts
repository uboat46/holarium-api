import { Injectable, Logger } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';

@Injectable()
export class GcpAuthService {
    private readonly logger = new Logger(GcpAuthService.name);
    private auth: GoogleAuth;
    private client: any;

    constructor() {
        this.auth = new GoogleAuth();
    }

    async getIdToken(targetAudience: string): Promise<string> {
        if (process.env.NODE_ENV === 'development') {
            this.logger.debug('Skipping ID token generation in development');
            return '';
        }

        try {
            if (!this.client) {
                this.client = await this.auth.getIdTokenClient(targetAudience);
            }
            // The IdTokenClient has a fetchIdToken method
            const token = await this.client.fetchIdToken(targetAudience);
            return token;
        } catch (error) {
            this.logger.error(`Failed to generate ID token for ${targetAudience}: ${error.message}`);
            // In production, this should probably throw, but we'll return empty string to avoid crashing if auth is optional
            // However, for secured services, it will fail anyway.
            throw error;
        }
    }
}
