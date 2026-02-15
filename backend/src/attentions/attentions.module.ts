import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttentionsService } from './attentions.service';
import { AttentionsController } from './attentions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AttentionsController],
  providers: [AttentionsService],
})
export class AttentionsModule { }
