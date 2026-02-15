import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateConfigurationDto {
    @IsOptional()
    @IsString()
    primaryColor?: string;

    @IsOptional()
    @IsString()
    backgroundColor?: string;

    @IsOptional()
    @IsString()
    sidebarColor?: string;

    @IsOptional()
    @IsString()
    themeMode?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    loginBgUrl?: string;

    @IsOptional()
    @IsString()
    openTime?: string;

    @IsOptional()
    @IsString()
    closeTime?: string;

    @IsOptional()
    @IsNumber()
    appointmentBuffer?: number;

    @IsOptional()
    @IsBoolean()
    backupEnabled?: boolean;

    @IsOptional()
    @IsString()
    backupFrequency?: string;

    @IsOptional()
    @IsString()
    backupTime?: string;

    @IsOptional()
    @IsString()
    backupEmail?: string;
}
