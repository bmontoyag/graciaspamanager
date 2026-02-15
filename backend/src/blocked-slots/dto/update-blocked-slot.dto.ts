import { PartialType } from '@nestjs/swagger';
import { CreateBlockedSlotDto } from './create-blocked-slot.dto';

export class UpdateBlockedSlotDto extends PartialType(CreateBlockedSlotDto) {}
