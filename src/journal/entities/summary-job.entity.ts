import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { SummaryJobBatch } from './summary-job-batch.entity';

export enum JobStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

@Entity('summary_jobs')
export class SummaryJob {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'batch_id' })
    batchId: string;

    @ManyToOne(() => SummaryJobBatch, (batch) => batch.jobs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'batch_id' })
    batch: SummaryJobBatch;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({
        type: 'enum',
        enum: JobStatus,
        default: JobStatus.PENDING,
    })
    status: JobStatus;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
