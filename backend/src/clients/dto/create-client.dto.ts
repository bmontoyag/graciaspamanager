import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateClientDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsDateString()
    @IsOptional()
    birthday?: string;

    @IsNumber()
    @IsOptional()
    loyaltyPoints?: number;
}
