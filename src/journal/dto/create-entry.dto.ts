import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEntryDto {
    @IsString()
    @IsNotEmpty()
    content: string;
}
