import {
    IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min,
} from 'class-validator';
import { CorporateEventDayStatus, CorporateEventStatus, PaymentMethod, PaymentType } from '@prisma/client';
import { TIME_REGEX } from './quote.dto';

export class UpdateEventDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsEnum(CorporateEventStatus)
    @IsOptional()
    status?: CorporateEventStatus;

    @IsNumber()
    @Min(0)
    @IsOptional()
    agreedAmount?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class CreateEventDayDto {
    @IsDateString()
    date: string;

    @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm' })
    startTime: string;

    @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm' })
    endTime: string;
}

export class UpdateEventDayDto {
    @IsDateString()
    @IsOptional()
    date?: string;

    @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm' })
    @IsOptional()
    startTime?: string;

    @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm' })
    @IsOptional()
    endTime?: string;

    @IsEnum(CorporateEventDayStatus)
    @IsOptional()
    status?: CorporateEventDayStatus;

    @IsInt()
    @Min(0)
    @IsOptional()
    sessionsCount?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class AssignWorkerDto {
    @IsInt()
    workerId: number;

    @IsNumber()
    @Min(0)
    payAmount: number;
}

export class UpdateEventWorkerDto {
    @IsNumber()
    @Min(0)
    payAmount: number;
}

export class PayWorkerDto {
    @IsDateString()
    @IsOptional()
    date?: string;
}

export class CreateEventPaymentDto {
    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsDateString()
    date: string;

    @IsEnum(PaymentMethod)
    @IsOptional()
    method?: PaymentMethod;

    @IsEnum(PaymentType)
    @IsOptional()
    type?: PaymentType;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class CreateEventExpenseDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsDateString()
    date: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsInt()
    @IsOptional()
    typeId?: number;
}
