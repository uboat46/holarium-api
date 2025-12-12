import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt, PromptType } from './entities/prompt.entity';
import { LlmService, AnalysisResult } from './llm.service';
import { Log } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';

@Injectable()
export class PromptService {
    private readonly logger = new Logger(PromptService.name);

    constructor(
        @InjectRepository(Prompt)
        private readonly promptRepository: Repository<Prompt>,
        @InjectRepository(Log)
        private readonly logRepository: Repository<Log>,
        @InjectRepository(Attribute)
        private readonly attributeRepository: Repository<Attribute>,
        private readonly llmService: LlmService,
    ) { }

    async getOnboardingPrompts(userId: string): Promise<Prompt[]> {
        // Check if onboarding prompts already exist
        const existingPrompts = await this.promptRepository.find({
            where: { userId, type: PromptType.ONBOARDING },
            order: { createdAt: 'ASC' },
        });

        if (existingPrompts.length > 0) {
            return existingPrompts;
        }

        // Generate new onboarding prompts
        this.logger.log(`Generating onboarding prompts for user ${userId}`);
        const questions = await this.llmService.generateOnboardingQuestions();

        const prompts = questions.map((q) =>
            this.promptRepository.create({
                userId,
                content: q,
                type: PromptType.ONBOARDING,
            }),
        );

        return this.promptRepository.save(prompts);
    }

    async getDailyPrompt(userId: string): Promise<Prompt> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check for existing UNANSWERED daily prompt
        const existingPrompt = await this.promptRepository
            .createQueryBuilder('prompt')
            .where('prompt.userId = :userId', { userId })
            .andWhere('prompt.type = :type', { type: PromptType.DAILY })
            .andWhere('prompt.createdAt >= :today', { today })
            .andWhere('prompt.isAnswered = :isAnswered', { isAnswered: false })
            .getOne();

        if (existingPrompt) {
            return existingPrompt;
        }

        this.logger.log(`Generating daily prompt for user ${userId}`);

        // Use QueryBuilder for clearer date filtering on lastAnsweredPrompt
        const latestAnsweredForToday = await this.promptRepository.createQueryBuilder('prompt')
            .where('prompt.userId = :userId', { userId })
            .andWhere('prompt.type = :type', { type: PromptType.DAILY })
            .andWhere('prompt.isAnswered = :answered', { answered: true })
            .andWhere('prompt.createdAt >= :today', { today })
            .orderBy('prompt.createdAt', 'DESC')
            .getOne();

        let promptText: string;

        if (latestAnsweredForToday && latestAnsweredForToday.referenceLogId) {
            // Generate Follow-up
            this.logger.log(`Generating follow-up for prompt ${latestAnsweredForToday.id}`);
            const answerLog = await this.logRepository.findOne({ where: { id: latestAnsweredForToday.referenceLogId } });

            if (answerLog) {
                promptText = await this.llmService.generateFollowUpPrompt(latestAnsweredForToday.content, answerLog.content);
            } else {
                // Fallback if log missing
                promptText = await this.llmService.generateContextualPrompt([], []);
            }
        } else {
            // Generate standard contextual prompt
            // Fetch Context
            const recentLogs = await this.logRepository.find({
                where: { userId },
                order: { createdAt: 'DESC' },
                take: 5,
            });
            const logContext = recentLogs.map(l => l.content);

            // Fetch recent attributes (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentStats = await this.attributeRepository
                .createQueryBuilder('attr')
                .select('attr.name', 'name')
                .addSelect('SUM(attr.value)', 'value')
                .where('attr.user_id = :userId', { userId })
                .andWhere('attr.date >= :date', { date: sevenDaysAgo })
                .groupBy('attr.name')
                .getRawMany();

            promptText = await this.llmService.generateContextualPrompt(
                logContext,
                recentStats
            );
        }

        const newPrompt = this.promptRepository.create({
            userId,
            content: promptText,
            type: PromptType.DAILY,
        });

        return this.promptRepository.save(newPrompt);
    }
}
