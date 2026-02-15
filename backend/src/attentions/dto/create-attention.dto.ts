import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAttentionDto {
    @IsNumber()
    @IsNotEmpty()
    clientId: number;

    @IsNumber()
    @IsNotEmpty()
    serviceId: number;

    @IsArray()
    @IsNotEmpty()
    workerIds: number[]; // Handling multiple therapists

    @IsNumber()
    @IsNotEmpty()
    totalCost: number;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsDateString()
    @IsOptional()
    date?: string;

    @IsNumber()
    @IsOptional()
    appointmentId?: number;
}
