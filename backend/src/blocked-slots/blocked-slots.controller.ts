import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BlockedSlotsService } from './blocked-slots.service';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto';

@Controller('blocked-slots')
export class BlockedSlotsController {
  constructor(private readonly blockedSlotsService: BlockedSlotsService) {}

  @Post()
  create(@Body() createBlockedSlotDto: CreateBlockedSlotDto) {
    return this.blockedSlotsService.create(createBlockedSlotDto);
  }

  @Get()
  findAll() {
    return this.blockedSlotsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blockedSlotsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlockedSlotDto: UpdateBlockedSlotDto) {
    return this.blockedSlotsService.update(+id, updateBlockedSlotDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blockedSlotsService.remove(+id);
  }
}
