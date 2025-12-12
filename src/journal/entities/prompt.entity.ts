import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PromptType {
    ONBOARDING = 'ONBOARDING',
    DAILY = 'DAILY',
    CONTEXTUAL = 'CONTEXTUAL',
}

@Entity('prompts')
export class Prompt {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'content', type: 'text' })
    content: string;

    @Column({ name: 'type', type: 'enum', enum: PromptType, default: PromptType.DAILY })
    type: PromptType;

    @Column({ name: 'is_answered', type: 'boolean', default: false })
    isAnswered: boolean;

    @Column({ name: 'reference_log_id', type: 'uuid', nullable: true })
    referenceLogId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
