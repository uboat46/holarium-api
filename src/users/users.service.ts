import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { AuthConfig } from '../config/auth.config';

@Injectable()
export class UsersService {
  private readonly lockoutThreshold: number;
  private readonly lockoutDurationMs: number;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    configService: ConfigService,
  ) {
    const authConfig = configService.getOrThrow<AuthConfig>('auth');
    this.lockoutThreshold = authConfig.lockoutThreshold;
    this.lockoutDurationMs = authConfig.lockoutDurationMinutes * 60 * 1000;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    await this.ensureUniqueEmailAndUsername(
      createUserDto.email,
      createUserDto.username,
    );
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(query?: QueryUserDto): Promise<User[]> {
    const qb = this.usersRepository.createQueryBuilder('user');

    if (query?.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query?.search) {
      qb.andWhere('(user.username ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.ensureUniqueEmail(updateUserDto.email);
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      await this.ensureUniqueUsername(updateUserDto.username);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async markSuccessfulLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
      lastFailedLoginAt: null,
      lockedUntil: null,
    });
  }

  async recordFailedLogin(userId: string): Promise<void> {
    const user = await this.findOne(userId);
    user.incrementFailedAttempts();

    if (user.failedLoginAttempts >= this.lockoutThreshold) {
      const lockUntil = new Date(Date.now() + this.lockoutDurationMs);
      user.lockUntil(lockUntil);
    }

    await this.usersRepository.save(user);
  }

  ensureAccountIsActive(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not active');
    }

    if (user.isLocked()) {
      throw new ForbiddenException('User account is locked');
    }
  }

  private async ensureUniqueEmail(email: string): Promise<void> {
    const exists = await this.usersRepository.exists({ where: { email } });
    if (exists) {
      throw new ConflictException('Email already in use');
    }
  }

  private async ensureUniqueUsername(username: string): Promise<void> {
    const exists = await this.usersRepository.exists({ where: { username } });
    if (exists) {
      throw new ConflictException('Username already in use');
    }
  }

  private async ensureUniqueEmailAndUsername(
    email: string,
    username: string,
  ): Promise<void> {
    const existing = await this.usersRepository.findOne({
      where: [{ email }, { username }],
    });

    if (!existing) {
      return;
    }

    if (existing.email === email) {
      throw new ConflictException('Email already in use');
    }
    if (existing.username === username) {
      throw new ConflictException('Username already in use');
    }
  }
}
