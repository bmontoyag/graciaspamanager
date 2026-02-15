import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsNumber()
    @IsOptional()
    commissionPercentage?: number;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsOptional()
    @IsNumber({}, { each: true })
    roleIds?: number[];
}
