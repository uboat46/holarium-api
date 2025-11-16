import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity({ name: 'users' })
@Index('users_email_unique', ['email'], { unique: true })
@Index('users_username_unique', ['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({
    name: 'last_login_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastLoginAt?: Date | null;

  @Column({
    name: 'last_failed_login_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastFailedLoginAt?: Date | null;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (!this.password) {
      return;
    }

    const alreadyHashed = this.password.startsWith('$2a$') || this.password.startsWith('$2b$');
    if (alreadyHashed) {
      return;
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
    this.password = await bcrypt.hash(this.password, rounds);
  }

  async validatePassword(plain: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return bcrypt.compare(plain, this.password);
  }

  markLoginSuccess(): void {
    this.failedLoginAttempts = 0;
    this.lastLoginAt = new Date();
    this.lastFailedLoginAt = null;
  }

  incrementFailedAttempts(): void {
    this.failedLoginAttempts += 1;
    this.lastFailedLoginAt = new Date();
  }
}
