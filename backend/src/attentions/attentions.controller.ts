import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { AttentionsService } from './attentions.service';
import { CreateAttentionDto } from './dto/create-attention.dto';
import { CreateBatchAttentionDto } from './dto/create-batch.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ActivityNotifier } from '../notifications/activity-notifier.service';

@RequirePermissions('attentions')
@Controller('attentions')
export class AttentionsController {
  constructor(
    private readonly attentionsService: AttentionsService,
    private readonly activityNotifier: ActivityNotifier,
  ) {}

  @Post()
  async create(@Body() createAttentionDto: CreateAttentionDto, @Req() req) {
    const attention = await this.attentionsService.create(createAttentionDto);
    this.activityNotifier.attentionsCreated(req.user, [attention.id]);
    return attention;
  }

  @Post('batch')
  async createBatch(@Body() createBatchAttentionDto: CreateBatchAttentionDto, @Req() req) {
    const attentions = await this.attentionsService.createBatch(createBatchAttentionDto);
    this.activityNotifier.attentionsCreated(req.user, attentions.map(a => a.id));
    return attentions;
  }

  @RequirePermissions('attentions', 'daily_closing', 'reports')
  @Get()
  findAll() {
    return this.attentionsService.findAll();
  }

  @RequirePermissions('attentions', 'daily_closing', 'reports')
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
