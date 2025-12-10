import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Summary, SummaryType } from './entities/summary.entity';
import { Log } from './entities/log.entity';
import { SummaryJob, JobStatus } from './entities/summary-job.entity';
import { SummaryJobBatch, BatchStatus } from './entities/summary-job-batch.entity';
import { LlmService } from './llm.service';
import { UsersService } from '../users/users.service';
import { CloudTasksService } from '../cloud-tasks/cloud-tasks.service';

@Injectable()
export class SummaryService {
    private readonly logger = new Logger(SummaryService.name);

    constructor(
        @InjectRepository(Summary)
        private readonly summaryRepository: Repository<Summary>,
        @InjectRepository(Log)
        private readonly logRepository: Repository<Log>,
        @InjectRepository(SummaryJob)
        private readonly summaryJobRepository: Repository<SummaryJob>,
        @InjectRepository(SummaryJobBatch)
        private readonly summaryJobBatchRepository: Repository<SummaryJobBatch>,
        private readonly llmService: LlmService,
        private readonly usersService: UsersService,
        private readonly cloudTasksService: CloudTasksService,
    ) { }

    async generateWeeklySummary(userId: string): Promise<Summary | null> {
        this.logger.log(`Generating weekly summary for user ${userId}`);

        // 0. Check if a summary already exists for this week (last 7 days)
        let summaryToUpdate = await this.summaryRepository.findOne({
            where: {
                userId,
                type: SummaryType.WEEKLY,
            },
            order: { createdAt: 'DESC' },
        });

        if (summaryToUpdate) {
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - summaryToUpdate.createdAt.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 7) {
                // It's an old summary, so we don't update it. We'll create a new one.
                summaryToUpdate = null;
            } else {
                this.logger.log(`Updating existing weekly summary for user ${userId}`);
            }
        }

        // 1. Fetch logs from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const logs = await this.logRepository.find({
            where: {
                createdAt: Between(sevenDaysAgo, new Date()),
            },
            order: { createdAt: 'ASC' },
        });

        if (logs.length === 0) {
            this.logger.warn('No logs found for the last 7 days');
            return null;
        }

        const logsContent = logs
            .map((log) => `[${log.createdAt.toISOString()}] ${log.content}`)
            .join('\n');

        // 2. Generate Summary with LLM
        // We'll reuse the LlmService but we might need a specific method or just use the analyzeLog
        // For now, let's create a specific prompt here and call the LLM directly if LlmService exposes a generic method,
        // OR we can add a summarize method to LlmService.
        // Let's add a generic 'chat' method to LlmService or just use a specialized prompt here.
        // Since LlmService is currently tailored for 'analyzeLog', let's extend it or just use a raw call here?
        // Better to extend LlmService. Let's assume we'll add `generateSummary` to LlmService.

        // Actually, let's just use the existing analyzeLog structure but we need text output, not JSON.
        // So we should add a generic `chat(systemPrompt, userMessage)` to LlmService.

        // For now, to keep it simple and within the current LlmService structure, 
        // I'll add a `generateSummary` method to LlmService in the next step.
        const summaryText = await this.llmService.generateSummary(logsContent);

        // 3. Save or Update Summary
        if (summaryToUpdate) {
            summaryToUpdate.content = summaryText;
            return this.summaryRepository.save(summaryToUpdate);
        } else {
            const summary = this.summaryRepository.create({
                userId,
                content: summaryText,
                period: 'Last 7 Days',
                type: SummaryType.WEEKLY,
            });
            return this.summaryRepository.save(summary);
        }
    }

    async initiateBatchSummaries() {
        this.logger.log('Initiating batch summary generation');

        // 1. Create a new Batch record
        const batch = this.summaryJobBatchRepository.create({
            status: BatchStatus.IN_PROGRESS,
        });
        await this.summaryJobBatchRepository.save(batch);

        // 2. Start with the first batch (using UUID 0 as the starting point)
        await this.cloudTasksService.createTask(
            {
                batchId: batch.id,
                lastId: '00000000-0000-0000-0000-000000000000',
                limit: 100
            },
            '/api/v1/journal/summary/batch-process',
        );

        return { message: 'Batch processing initiated', batchId: batch.id };
    }

    async processBatch(batchId: string, lastId: string, limit: number) {
        this.logger.log(`Processing batch: batchId=${batchId}, lastId=${lastId}, limit=${limit}`);

        // 1. Fetch users using Keyset Pagination
        const users = await this.usersService.findUsersDueForSummary(lastId, limit);

        if (users.length === 0) {
            this.logger.log('Batch processing complete: No more users');
            // Mark batch as completed
            await this.summaryJobBatchRepository.update(batchId, {
                status: BatchStatus.COMPLETED,
                completedAt: new Date(),
            });
            return;
        }

        // 2. Enqueue individual tasks for this batch
        for (const user of users) {
            // Create a Job record
            const job = this.summaryJobRepository.create({
                batchId,
                userId: user.id,
                status: JobStatus.PENDING,
            });
            await this.summaryJobRepository.save(job);

            // Enqueue task
            await this.cloudTasksService.createTask(
                { jobId: job.id, userId: user.id },
                '/api/v1/journal/summary/process',
            );
        }

        // 3. Recursively enqueue the next batch
        // We always try to fetch more if we got any results, or strictly if we got a full page.
        // Since we filter by 'due', the set might shrink if we were using offset, but with keyset we just move forward.
        const nextLastId = users[users.length - 1].id;
        await this.cloudTasksService.createTask(
            { batchId, lastId: nextLastId, limit },
            '/api/v1/journal/summary/batch-process',
        );
    }

    async processSummaryTask(jobId: string, userId: string) {
        this.logger.log(`Processing summary task: jobId=${jobId}, userId=${userId}`);

        // 1. Update Job to PROCESSING
        await this.summaryJobRepository.update(jobId, {
            status: JobStatus.PROCESSING,
        });

        try {
            // 2. Generate Summary
            await this.generateWeeklySummary(userId);

            // 3. Update User's lastSummaryAt
            await this.usersService.updateLastSummaryAt(userId);

            // 4. Update Job to COMPLETED
            await this.summaryJobRepository.update(jobId, {
                status: JobStatus.COMPLETED,
            });
        } catch (error) {
            this.logger.error(`Failed to process summary for user ${userId}: ${error.message}`);
            // 5. Update Job to FAILED
            await this.summaryJobRepository.update(jobId, {
                status: JobStatus.FAILED,
                errorMessage: error.message,
            });
        }
    }
}
