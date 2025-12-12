import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateEntryDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsUUID()
    promptId?: string;
}
