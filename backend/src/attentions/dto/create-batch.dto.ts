import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceAttentionDto {
    @IsNumber()
    @IsNotEmpty()
    serviceId: number;

    @IsArray()
    @IsNotEmpty()
    workerIds: number[];

    @IsNumber()
    @IsNotEmpty()
    totalCost: number;
}

export class CreateBatchAttentionDto {
    @IsNumber()
    @IsNotEmpty()
    clientId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ServiceAttentionDto)
    services: ServiceAttentionDto[];

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
