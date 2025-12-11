import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Log } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';
import { Summary } from './entities/summary.entity';
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
        @InjectRepository(Summary)
        private readonly summaryRepository: Repository<Summary>,
        private readonly vectorService: VectorService,
        private readonly llmService: LlmService,
        private readonly dataSource: DataSource,
    ) { }

    async createEntry(userId: string, content: string): Promise<Log> {
        this.logger.log(`Creating entry for user ${userId}`);

        // 1. Generate Embedding
        const embedding = await this.vectorService.generateEmbedding(content);

        // 2. Context Retrieval (RAG)
        const similarLogs = await this.vectorService.search(userId, embedding, 5);
        const context = similarLogs.map((log) => log.content);
        this.logger.log(
            `Found similar logs: ${similarLogs.map((l) => l.id).join(', ')}`,
        );

        // Fetch recent summaries (Macro-Context)
        const recentSummaries = await this.summaryRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 3,
        });
        const summaryContext = recentSummaries.map((s) => s.content);

        // 3. Analyze Content with LLM (with context)
        const analysis = await this.llmService.analyzeLog(content, context, summaryContext);

        // 4. Transactional Save
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Save Log
            const log = this.logRepository.create({
                userId,
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

    async getTopEntities(userId: string): Promise<string[]> {
        const result = await this.logRepository.query(
            `
      SELECT value, COUNT(*) as count
      FROM logs, jsonb_array_elements_text(metadata->'entities') as value
      WHERE metadata->'entities' IS NOT NULL
      AND user_id = $1
      GROUP BY value
      ORDER BY count DESC
      LIMIT 10
      `,
            [userId],
        );
        return result.map((row) => row.value);
    }

    async getEntityStats(userId: string, entityName: string): Promise<any[]> {
        const logs = await this.logRepository
            .createQueryBuilder('log')
            .where('log.userId = :userId', { userId })
            .andWhere('log.metadata @> :contains', {
                contains: JSON.stringify({ entities: [entityName] }),
            })
            .orderBy('log.createdAt', 'ASC')
            .getMany();

        return logs.map((log) => {
            const sentiment = log.metadata['sentiment'];
            let score = 0;
            if (sentiment === 'Positive') score = 1;
            if (sentiment === 'Negative') score = -1;

            return {
                date: log.createdAt,
                sentiment,
                score,
            };
        });
    }
}
