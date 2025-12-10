import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum SummaryType {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
}

@Entity('summaries')
export class Summary {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text' })
    period: string; // e.g., "2023-W40" or "2023-10"

    @Column({
        type: 'enum',
        enum: SummaryType,
    })
    type: SummaryType;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;
}
