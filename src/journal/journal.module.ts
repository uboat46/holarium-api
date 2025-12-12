import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { Log } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';
import { Summary } from './entities/summary.entity';
import { SummaryJob } from './entities/summary-job.entity';
import { SummaryJobBatch } from './entities/summary-job-batch.entity';
import { Prompt } from './entities/prompt.entity';
import { VectorService } from './vector.service';
import { LlmService } from './llm.service';
import { SummaryService } from './summary.service';
import { UsersModule } from '../users/users.module';
import { CloudTasksModule } from '../cloud-tasks/cloud-tasks.module';

import { GcpAuthService } from '../common/gcp-auth.service';
import { PromptService } from './prompt.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Log,
            Attribute,
            Summary,
            SummaryJob,
            SummaryJobBatch,
            Prompt,
        ]),
        UsersModule,
        CloudTasksModule,
    ],
    controllers: [JournalController],
    providers: [JournalService, VectorService, LlmService, SummaryService, PromptService, GcpAuthService],
})
export class JournalModule { }
