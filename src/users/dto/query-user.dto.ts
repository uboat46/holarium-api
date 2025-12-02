import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class QueryUserDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
