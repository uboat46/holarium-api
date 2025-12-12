import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CloudTasksClient } from '@google-cloud/tasks';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CloudTasksService {
    private readonly logger = new Logger(CloudTasksService.name);
    private client: CloudTasksClient;

    constructor(private readonly httpService: HttpService) {
        if (process.env.NODE_ENV !== 'development') {
            this.client = new CloudTasksClient();
        }
    }

    async createTask(payload: any, endpoint: string, queueName?: string) {
        const isDev = process.env.NODE_ENV === 'development';

        if (isDev) {
            return this.createLocalTask(payload, endpoint);
        } else {
            return this.createCloudTask(payload, endpoint, queueName);
        }
    }

    private async createLocalTask(payload: any, endpoint: string) {
        // In Docker, we must call the internal port (usually 3000), not the external mapped port (8081)
        // We can assume localhost because we are calling ourselves
        const port = process.env.PORT || 3000;
        const url = `http://localhost:${port}${endpoint}`;

        this.logger.log(`[Local Dev] Simulating Cloud Task: POST ${url}`);

        try {
            // Fire and forget - we don't await the result to simulate async task queue behavior
            // However, for local debugging, sometimes it's better to await to see errors.
            // Let's await it but catch errors so it doesn't crash the caller.
            await firstValueFrom(this.httpService.post(url, payload));
            this.logger.log(`[Local Dev] Task executed successfully`);
        } catch (error) {
            this.logger.error(`[Local Dev] Task execution failed: ${error.message}`);
        }
    }

    private async createCloudTask(payload: any, endpoint: string, queueName?: string) {
        const project = process.env.GCP_PROJECT_ID;
        const queue = queueName || process.env.GCP_QUEUE_NAME;
        const location = process.env.GCP_LOCATION;
        const apiUrl = process.env.API_URL;

        if (!project || !queue || !location || !apiUrl) {
            throw new Error('Missing GCP Cloud Tasks configuration');
        }

        const parent = this.client.queuePath(project, location, queue);
        const url = `${apiUrl}${endpoint}`;

        const task = {
            httpRequest: {
                httpMethod: 'POST' as const,
                url,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: {
                    'Content-Type': 'application/json',
                },
                // Add OIDC token if needed for auth
                // oidcToken: {
                //   serviceAccountEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
                // },
            },
        };

        this.logger.log(`Enqueuing Cloud Task to ${url} (Queue: ${queue})`);
        const [response] = await this.client.createTask({ parent, task });
        this.logger.log(`Task created: ${response.name}`);
    }
}
