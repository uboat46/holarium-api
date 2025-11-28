import { IsEmail, IsNotEmpty, Length, IsString } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email: string;

  @IsNotEmpty()
  @Length(3, 32)
  @IsString()
  username: string;

  @IsNotEmpty()
  @Length(8, 128)
  @IsString()
  password: string;
}
