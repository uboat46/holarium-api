import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './entities/log.entity';
import { Attribute } from './entities/attribute.entity';
import { Summary } from './entities/summary.entity';
import { VectorService } from './vector.service';

@Module({
    imports: [TypeOrmModule.forFeature([Log, Attribute, Summary])],
    controllers: [],
    providers: [VectorService],
    exports: [VectorService],
})
export class JournalModule { }
