import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';
import { Summary } from './entities/summary.entity';
import { VectorService } from './vector.service';
import { LlmService } from './llm.service';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Log, Attribute, Summary])],
    controllers: [JournalController],
    providers: [JournalService, VectorService, LlmService],
    exports: [JournalService, VectorService, LlmService],
})
export class JournalModule { }
