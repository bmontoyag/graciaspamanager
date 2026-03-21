import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
    @IsString()
    @IsOptional()
    category?: string;

    @IsNumber()
    @IsOptional()
    typeId?: number;
}
