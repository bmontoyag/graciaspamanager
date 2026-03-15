import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus, PaymentMethod } from '@prisma/client';

class AppointmentServiceItemDto {
    @IsInt()
    serviceId: number;

    @IsInt()
    @IsOptional()
    workerId?: number;

    @IsOptional()
    @IsInt({ each: true })
    workerIds?: number[];

    @IsOptional()
    @IsNumber()
    cost?: number;

    @IsOptional()
    @IsInt()
    duration?: number;
}

export class CreateBatchAppointmentDto {
    @IsDateString()
    date: string; // ISO 8601 string for the FIRST service

    @IsEnum(AppointmentStatus)
    @IsOptional()
    status?: AppointmentStatus;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsInt()
    clientId: number;

    @ValidateNested({ each: true })
    @Type(() => AppointmentServiceItemDto)
    services: AppointmentServiceItemDto[];

    @IsOptional()
    @IsNumber()
    advanceAmount?: number;

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;
}
