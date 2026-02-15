import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsOptional()
    @IsNumber({}, { each: true })
    moduleIds?: number[];
}
