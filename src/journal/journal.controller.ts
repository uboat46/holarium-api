import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Param,
} from '@nestjs/common';
import { JournalService } from './journal.service';
import { SummaryService } from './summary.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';

@Controller('journal')
@UseGuards(JwtAuthGuard)
export class JournalController {
    constructor(
        private readonly journalService: JournalService,
        private readonly summaryService: SummaryService,
    ) { }

    @Post('entry')
    async createEntry(
        @CurrentUser() user: ActiveUserData,
        @Body() createEntryDto: CreateEntryDto,
    ) {
        return this.journalService.createEntry(user.userId, createEntryDto.content);
    }

    @Get('stats')
    async getStats(@CurrentUser() user: ActiveUserData) {
        return this.journalService.getStats(user.userId);
    }

    @Post('summary/trigger')
    async triggerSummary(@CurrentUser() user: ActiveUserData) {
        return this.summaryService.generateWeeklySummary(user.userId);
    }

    @Get('entities')
    async getTopEntities(@CurrentUser() user: ActiveUserData) {
        return this.journalService.getTopEntities(user.userId);
    }

    @Get('entity/:name/stats')
    async getEntityStats(
        @CurrentUser() user: ActiveUserData,
        @Param('name') name: string,
    ) {
        return this.journalService.getEntityStats(user.userId, name);
    }

    // --- Cloud Tasks Orchestration ---

    @Public()
    @Post('summary/cron-trigger')
    async triggerBatchSummaries() {
        return this.summaryService.initiateBatchSummaries();
    }

    @Public()
    @Post('summary/batch-process')
    async processBatch(@Body() body: { batchId: string; lastId: string; limit: number }) {
        return this.summaryService.processBatch(body.batchId, body.lastId, body.limit);
    }

    @Public()
    @Post('summary/process')
    async processSummaryTask(@Body() body: { jobId: string; userId: string }) {
        return this.summaryService.processSummaryTask(body.jobId, body.userId);
    }
}
