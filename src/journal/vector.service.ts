import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GcpAuthService } from '../common/gcp-auth.service';

@Injectable()
export class VectorService {
    private readonly logger = new Logger(VectorService.name);
    private readonly ollamaHost: string;
    private readonly model: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
        private readonly gcpAuthService: GcpAuthService,
    ) {
        this.ollamaHost = this.configService.get<string>(
            'OLLAMA_HOST',
            'http://ollama:8080',
        );
        this.model = this.configService.get<string>(
            'MODEL',
            'snowflake-arctic-embed2:568m',
        );
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const token = await this.gcpAuthService.getIdToken(this.ollamaHost);
            const headers: any = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.model,
                    prompt: text,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data.embedding;
        } catch (error) {
            this.logger.error(`Failed to generate embedding: ${error.message}`);
            throw error;
        }
    }

    async search(userId: string, embedding: number[], limit: number = 3, threshold: number = 0.25): Promise<any[]> {
        const embeddingString = JSON.stringify(embedding);
        return this.dataSource.query(
            `SELECT * FROM logs WHERE user_id = $1 AND embedding <=> $2 < $4 ORDER BY embedding <=> $2 LIMIT $3`,
            [userId, embeddingString, limit, threshold],
        );
    }
}
