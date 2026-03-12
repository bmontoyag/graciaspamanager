import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus, PaymentMethod } from '@prisma/client';

export class CreateAppointmentDto {
    @IsDateString()
    date: string; // ISO 8601 string

    @IsEnum(AppointmentStatus)
    @IsOptional()
    status?: AppointmentStatus;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsInt()
    clientId: number;

    @IsInt()
    workerId: number;

    @IsInt()
    serviceId: number;

    @IsOptional()
    @IsNumber()
    cost?: number;

    @IsOptional()
    @IsNumber()
    duration?: number;

    @IsOptional()
    @IsNumber()
    advanceAmount?: number;

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;
}
