import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Summary, SummaryType } from './entities/summary.entity';
import { Log } from './entities/log.entity';
import { LlmService } from './llm.service';

@Injectable()
export class SummaryService {
    private readonly logger = new Logger(SummaryService.name);

    constructor(
        @InjectRepository(Summary)
        private readonly summaryRepository: Repository<Summary>,
        @InjectRepository(Log)
        private readonly logRepository: Repository<Log>,
        private readonly llmService: LlmService,
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
}
