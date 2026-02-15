import { Module } from '@nestjs/common';
import { BlockedSlotsService } from './blocked-slots.service';
import { BlockedSlotsController } from './blocked-slots.controller';

@Module({
  controllers: [BlockedSlotsController],
  providers: [BlockedSlotsService],
})
export class BlockedSlotsModule {}
