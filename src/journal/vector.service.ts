import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VectorService {
    private readonly logger = new Logger(VectorService.name);
    private readonly ollamaHost: string;

    constructor(private readonly configService: ConfigService) {
        this.ollamaHost = this.configService.get<string>(
            'OLLAMA_HOST',
            'http://ollama:8080',
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
                    model: 'snowflake-arctic-embed2:568m',
                    prompt: text,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.embedding;
        } catch (error) {
            this.logger.error(`Failed to generate embedding: ${error.message}`);
            throw error;
        }
    }
}
