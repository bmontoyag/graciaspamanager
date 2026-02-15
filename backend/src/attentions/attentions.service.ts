import { Injectable } from '@nestjs/common';
import { CreateAttentionDto } from './dto/create-attention.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttentionsService {
  constructor(private prisma: PrismaService) { }

  create(createAttentionDto: CreateAttentionDto) {
    const { workerIds, ...rest } = createAttentionDto;
    return this.prisma.attention.create({
      data: {
        ...rest,
        workers: {
          create: workerIds.map((workerId, index) => ({
            workerId,
            isPrimary: index === 0,
            commissionAmount: 0 // Logic for commission calculation can be added here
          }))
        }
      },
    });
  }

  findAll() {
    return this.prisma.attention.findMany({
      orderBy: { date: 'desc' },
      include: {
        client: true,
        workers: {
          include: {
            worker: true
          }
        },
        service: true,
        payments: true
      }
    });
  }

  findOne(id: number) {
    return this.prisma.attention.findUnique({
      where: { id },
      include: {
        client: true,
        workers: {
          include: {
            worker: true
          }
        },
        service: true
      }
    });
  }

  update(id: number, updateAttentionDto: UpdateAttentionDto) {
    return this.prisma.attention.update({
      where: { id },
      data: updateAttentionDto,
    });
  }

  async remove(id: number) {
    // Delete related AttentionWorker records first
    await this.prisma.attentionWorker.deleteMany({
      where: { attentionId: id }
    });

    // Then delete the attention
    return this.prisma.attention.delete({
      where: { id },
    });
  }
}
