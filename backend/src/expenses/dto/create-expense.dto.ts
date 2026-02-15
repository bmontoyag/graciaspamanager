import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExpenseDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsNumber()
    @IsOptional()
    workerId?: number;

    @IsDateString()
    @IsNotEmpty()
    date: string;
}
