import { Injectable } from '@nestjs/common';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlockedSlotsService {
  constructor(private prisma: PrismaService) { }

  create(createBlockedSlotDto: CreateBlockedSlotDto) {
    const { date, ...rest } = createBlockedSlotDto;
    return this.prisma.blockedSlot.create({
      data: {
        ...rest,
        date: new Date(date),
      },
    });
  }

  findAll() {
    return this.prisma.blockedSlot.findMany({
      orderBy: { date: 'asc' }
    });
  }

  findOne(id: number) {
    return this.prisma.blockedSlot.findUnique({
      where: { id }
    });
  }

  update(id: number, updateBlockedSlotDto: UpdateBlockedSlotDto) {
    const { date, ...rest } = updateBlockedSlotDto;
    return this.prisma.blockedSlot.update({
      where: { id },
      data: {
        ...rest,
        ...(date && { date: new Date(date) }),
      },
    });
  }

  remove(id: number) {
    return this.prisma.blockedSlot.delete({
      where: { id }
    });
  }
}
