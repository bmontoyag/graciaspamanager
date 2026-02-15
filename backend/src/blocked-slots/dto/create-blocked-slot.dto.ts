import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class CreateBlockedSlotDto {
    @IsDateString()
    date: string;

    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:mm format' })
    startTime: string;

    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:mm format' })
    endTime: string;

    @IsString()
    @IsOptional()
    reason?: string;
}
