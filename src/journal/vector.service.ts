import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class VectorService {
    private readonly logger = new Logger(VectorService.name);
    private readonly ollamaHost: string;
    private readonly model: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
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
            const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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

    async search(userId: string, embedding: number[], limit: number = 3): Promise<any[]> {
        const embeddingString = JSON.stringify(embedding);
        return this.dataSource.query(
            `SELECT * FROM logs WHERE user_id = $1 ORDER BY embedding <=> $2 LIMIT $3`,
            [userId, embeddingString, limit],
        );
    }
}
