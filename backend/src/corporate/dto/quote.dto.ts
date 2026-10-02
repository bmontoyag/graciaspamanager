import { Type } from 'class-transformer';
import {
    ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber,
    IsOptional, IsString, Matches, Min, ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CorporateQuoteStatus } from '@prisma/client';

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class QuoteDayDto {
    @IsDateString()
    date: string;

    @Matches(TIME_REGEX, { message: 'startTime debe tener formato HH:mm' })
    startTime: string;

    @Matches(TIME_REGEX, { message: 'endTime debe tener formato HH:mm' })
    endTime: string;
}

export class QuoteItemDto {
    @IsInt()
    @IsOptional()
    serviceId?: number;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @Min(0)
    quantity: number;

    @IsNumber()
    @Min(0)
    unitPrice: number;
}

export class QuoteConditionDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    text: string;
}

export class CreateQuoteDto {
    @IsInt()
    companyId: number;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    subtitle?: string;

    @IsDateString()
    issueDate: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    validityDays?: number;

    @IsString()
    @IsOptional()
    introduction?: string;

    @IsString()
    @IsOptional()
    serviceDescription?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    focusZones?: string[];

    @IsInt()
    @Min(1)
    @IsOptional()
    sessionDurationMin?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    therapistsCount?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    chairsCount?: number;

    @IsString()
    @IsOptional()
    modality?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    scopeItems?: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuoteConditionDto)
    @IsOptional()
    conditions?: QuoteConditionDto[];

    @IsBoolean()
    @IsOptional()
    showIssuerRuc?: boolean;

    @IsBoolean()
    @IsOptional()
    includeIgv?: boolean;

    @IsBoolean()
    @IsOptional()
    igvIncluded?: boolean;

    @IsNumber()
    @Min(0)
    @IsOptional()
    discount?: number;

    @IsBoolean()
    @IsOptional()
    showBreakdown?: boolean;

    @IsNumber()
    @Min(0)
    @IsOptional()
    therapistDayRate?: number;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'Debe registrar al menos una jornada.' })
    @ValidateNested({ each: true })
    @Type(() => QuoteDayDto)
    days: QuoteDayDto[];

    @IsArray()
    @ArrayMinSize(1, { message: 'Debe registrar al menos un concepto de cobro.' })
    @ValidateNested({ each: true })
    @Type(() => QuoteItemDto)
    items: QuoteItemDto[];
}

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) { }

export class UpdateQuoteStatusDto {
    @IsEnum(CorporateQuoteStatus)
    status: CorporateQuoteStatus;
}
