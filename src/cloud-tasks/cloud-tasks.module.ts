import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CloudTasksService } from './cloud-tasks.service';

@Global()
@Module({
    imports: [HttpModule],
    providers: [CloudTasksService],
    exports: [CloudTasksService],
})
export class CloudTasksModule { }
