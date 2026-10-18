import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeviceTokenDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(4096)
    token: string;

    @IsOptional()
    @IsIn(['android', 'ios'])
    platform?: string;
}
