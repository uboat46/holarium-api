import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Log, LogStatus } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';
import { Summary } from './entities/summary.entity';
import { Prompt } from './entities/prompt.entity';
import { VectorService } from './vector.service';
import { LlmService } from './llm.service';
import { CloudTasksService } from '../cloud-tasks/cloud-tasks.service';
import { TaskQueue } from '../cloud-tasks/enum/task-queue.enum';

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
        private readonly cloudTasksService: CloudTasksService,
    ) { }

    async createEntry(userId: string, content: string, promptId?: string): Promise<Log> {
        this.logger.log(`Creating pending entry for user ${userId}`);

        // 1. Save Log Early (Pending status)
        const log = this.logRepository.create({
            userId,
            content,
            status: LogStatus.PENDING,
            metadata: {
                promptId: promptId || null,
            },
        });
        const savedLog = await this.logRepository.save(log);

        // 2. Offload to Cloud Task
        await this.cloudTasksService.createTask(
            { logId: savedLog.id },
            '/api/v1/journal/entry/process',
            TaskQueue.OLLAMA_SERVICE_QUEUE
        );

        return savedLog;
    }

    async processLogEntry(logId: string) {
        this.logger.log(`Processing log entry ${logId}`);
        const log = await this.logRepository.findOne({ where: { id: logId } });
        if (!log) {
            this.logger.error(`Log ${logId} not found during processing`);
            return;
        }

        if (log.status === LogStatus.COMPLETED) {
            this.logger.warn(`Log ${logId} already processed`);
            return;
        }

        // Update status to PROCESSING
        await this.logRepository.update(logId, { status: LogStatus.PROCESSING });

        try {
            const userId = log.userId;
            const content = log.content;
            const promptId = log.metadata?.promptId;

            // 1. Generate Embedding
            const embedding = await this.vectorService.generateEmbedding(content);

            // 2. Context Retrieval (RAG)
            const similarLogs = await this.vectorService.search(userId, embedding, 5, 0.5);
            const context = similarLogs.map((log) => log.content);
            this.logger.log(`Found ${similarLogs.length} similar logs for context.`);

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
                // Update Log
                log.embedding = embedding;
                log.status = LogStatus.COMPLETED;
                log.metadata = {
                    ...log.metadata,
                    sentiment: analysis.sentiment,
                    entities: analysis.entities,
                };
                await queryRunner.manager.save(log);

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

                // Update Prompt if exists
                if (promptId) {
                    await queryRunner.manager.update(Prompt, promptId, {
                        isAnswered: true,
                        referenceLogId: log.id,
                    });
                }

                await queryRunner.commitTransaction();
                this.logger.log(`Entry processed successfully: ${log.id}`);
            } catch (err) {
                await queryRunner.rollbackTransaction();
                throw err;
            } finally {
                await queryRunner.release();
            }

        } catch (err) {
            this.logger.error(`Failed to process log ${logId}: ${err.message}`);
            await this.logRepository.update(logId, { status: LogStatus.FAILED });
            throw err;
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

    // async chat(userId: string, message: string, contextLogIds: string[] = []): Promise<string> {
    //     this.logger.log(`Chat request for user ${userId}`);

    //     // 1. Fetch Context
    //     let logContext: string[] = [];

    //     if (contextLogIds.length > 0) {
    //         // Fetch specific logs if requested
    //         const logs = await this.logRepository.find({
    //             where: {
    //                 id: In(contextLogIds),
    //                 userId: userId,
    //             }
    //         });
    //         logContext = logs.map(l => l.content);
    //     } else {
    //         // Semantic Search (RAG)
    //         const embedding = await this.vectorService.generateEmbedding(message);
    //         const similarLogs = await this.vectorService.search(userId, embedding, 3);
    //         logContext = similarLogs.map(l => l.content);
    //     }

    //     // 2. Fetch Stats Context
    //     const stats = await this.getStats(userId);

    //     // 3. Fetch Recent Summaries
    //     const recentSummaries = await this.summaryRepository.find({
    //         where: { userId },
    //         order: { createdAt: 'DESC' },
    //         take: 2,
    //     });
    //     const summaryContext = recentSummaries.map(s => s.content);

    //     // 4. Call LLM
    //     return this.llmService.chat(message, logContext, stats, summaryContext);
    // }
}


