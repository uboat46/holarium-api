import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

@Entity('logs')
export class Log {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'content', type: 'text' })
    content: string;

    @Column({
        name: 'embedding',
        type: 'varchar',
        nullable: true,
        transformer: {
            to: (value: number[]): string => JSON.stringify(value),
            from: (value: string): number[] => JSON.parse(value),
        },
    })
    embedding: number[];

    @Column({ name: 'metadata', type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ name: 'user_id', nullable: true })
    userId: string;

    @ManyToOne('User', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: any;
}
