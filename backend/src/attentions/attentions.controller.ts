import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AttentionsService } from './attentions.service';
import { CreateAttentionDto } from './dto/create-attention.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';

@Controller('attentions')
export class AttentionsController {
  constructor(private readonly attentionsService: AttentionsService) {}

  @Post()
  create(@Body() createAttentionDto: CreateAttentionDto) {
    return this.attentionsService.create(createAttentionDto);
  }

  @Get()
  findAll() {
    return this.attentionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attentionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAttentionDto: UpdateAttentionDto) {
    return this.attentionsService.update(+id, updateAttentionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attentionsService.remove(+id);
  }
}
