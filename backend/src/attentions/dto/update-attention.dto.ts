import { PartialType } from '@nestjs/mapped-types';
import { CreateAttentionDto } from './create-attention.dto';

export class UpdateAttentionDto extends PartialType(CreateAttentionDto) {}
