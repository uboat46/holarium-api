import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
} from '@nestjs/common';
import { JournalService } from './journal.service';
import { SummaryService } from './summary.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
}
