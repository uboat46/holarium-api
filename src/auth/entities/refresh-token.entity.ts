import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'refresh_tokens' })
@Index('refresh_tokens_user_id_idx', ['userId'])
@Index('refresh_tokens_family_idx', ['tokenFamilyId'])
@Index('refresh_tokens_token_hash_unique', ['tokenHash'], { unique: true })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 512 })
  tokenHash: string;

  @Column({ name: 'token_family_id', type: 'uuid' })
  tokenFamilyId: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  device?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  ip?: string | null;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({
    name: 'revoked_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  revokedAt?: Date | null;

  @Column({ name: 'rotated_from_id', type: 'uuid', nullable: true })
  rotatedFromId?: string | null;

  @ManyToOne(() => RefreshToken, (token) => token.rotatedChildren, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'rotated_from_id' })
  rotatedFrom?: RefreshToken | null;

  @OneToMany(() => RefreshToken, (token) => token.rotatedFrom)
  rotatedChildren: RefreshToken[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  markRevoked(date = new Date()): void {
    this.revokedAt = date;
  }
}
