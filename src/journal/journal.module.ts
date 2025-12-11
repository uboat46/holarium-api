import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Log } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';
import { Summary } from './entities/summary.entity';
import { SummaryJob } from './entities/summary-job.entity';
import { SummaryJobBatch } from './entities/summary-job-batch.entity';
import { VectorService } from './vector.service';
import { LlmService } from './llm.service';
import { JournalService } from './journal.service';
import { SummaryService } from './summary.service';
import { JournalController } from './journal.controller';
import { GcpAuthService } from '../common/gcp-auth.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Log, Attribute, Summary, SummaryJob, SummaryJobBatch]),
        UsersModule,
    ],
    controllers: [JournalController],
    providers: [JournalService, VectorService, LlmService, SummaryService, GcpAuthService],
    exports: [JournalService, VectorService, LlmService, SummaryService],
})
export class JournalModule { }
