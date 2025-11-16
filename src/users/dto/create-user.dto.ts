import { IsEmail, IsEnum, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(3, 32)
  username: string;

  @IsNotEmpty()
  @Length(8, 128)
  password: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
