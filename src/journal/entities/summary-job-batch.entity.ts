import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { SummaryJob } from './summary-job.entity';

export enum BatchStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

@Entity('summary_job_batches')
export class SummaryJobBatch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: BatchStatus,
        default: BatchStatus.IN_PROGRESS,
    })
    status: BatchStatus;

    @OneToMany(() => SummaryJob, (job) => job.batch)
    jobs: SummaryJob[];

    @CreateDateColumn({ name: 'started_at', type: 'timestamp with time zone' })
    startedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
    completedAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
