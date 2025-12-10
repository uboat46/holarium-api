import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Log } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';
import { VectorService } from './vector.service';
import { LlmService } from './llm.service';

@Injectable()
export class JournalService {
    private readonly logger = new Logger(JournalService.name);

    constructor(
        @InjectRepository(Log)
        private readonly logRepository: Repository<Log>,
        @InjectRepository(Attribute)
        private readonly attributeRepository: Repository<Attribute>,
        private readonly vectorService: VectorService,
        private readonly llmService: LlmService,
        private readonly dataSource: DataSource,
    ) { }

    async createEntry(userId: string, content: string): Promise<Log> {
        this.logger.log(`Creating entry for user ${userId}`);

        // 1. Generate Embedding
        const embedding = await this.vectorService.generateEmbedding(content);

        // 2. Context Retrieval (RAG)
        const similarLogs = await this.vectorService.search(embedding, 3);
        const context = similarLogs.map((log) => log.content);
        this.logger.log(
            `Found similar logs: ${similarLogs.map((l) => l.id).join(', ')}`,
        );

        // 3. Analyze Content with LLM (with context)
        const analysis = await this.llmService.analyzeLog(content, context);

        // 4. Transactional Save
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Save Log
            const log = this.logRepository.create({
                content,
                embedding,
                metadata: {
                    sentiment: analysis.sentiment,
                    entities: analysis.entities,
                },
            });
            const savedLog = await queryRunner.manager.save(log);

            // Save Attributes
            const attributes = analysis.attributes.map((attr) => {
                return this.attributeRepository.create({
                    userId,
                    name: attr.name,
                    value: attr.value,
                    date: new Date(),
                });
            });
            await queryRunner.manager.save(attributes);

            await queryRunner.commitTransaction();
            this.logger.log(`Entry created successfully: ${savedLog.id}`);
            return savedLog;
        } catch (err) {
            this.logger.error(`Failed to create entry: ${err.message}`);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getStats(userId: string): Promise<any[]> {
        // Aggregate stats for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const stats = await this.attributeRepository
            .createQueryBuilder('attr')
            .select('attr.name', 'name')
            .addSelect('SUM(attr.value)', 'value')
            .where('attr.user_id = :userId', { userId })
            .andWhere('attr.date >= :date', { date: sevenDaysAgo })
            .groupBy('attr.name')
            .getRawMany();

        return stats.map((stat) => ({
            name: stat.name,
            value: parseInt(stat.value, 10),
        }));
    }
}
