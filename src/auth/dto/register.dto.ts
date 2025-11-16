import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(3, 32)
  username: string;

  @IsNotEmpty()
  @Length(8, 128)
  password: string;
}
