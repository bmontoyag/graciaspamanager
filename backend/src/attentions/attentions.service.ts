import { Injectable } from '@nestjs/common';
import { CreateAttentionDto } from './dto/create-attention.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttentionsService {
  constructor(private prisma: PrismaService) { }

  async create(createAttentionDto: CreateAttentionDto) {
    const { workerIds, ...rest } = createAttentionDto;

    // Obtener los porcentajes de comision de los terapeutas
    const workersInfo = await this.prisma.user.findMany({
      where: { id: { in: workerIds } }
    });

    const totalCost = Number(rest.totalCost) || 0;
    const splitCost = workerIds.length > 0 ? totalCost / workerIds.length : totalCost;

    // Use a transaction to ensure both the attention is created and points are updated
    return this.prisma.$transaction(async (tx) => {
      const attention = await tx.attention.create({
        data: {
          ...rest,
          workers: {
            create: workerIds.map((workerId, index) => {
              const worker = workersInfo.find(w => w.id === workerId);
              const percentage = worker ? Number(worker.commissionPercentage || 50) : 50;
              const commissionAmount = splitCost * (percentage / 100);

              return {
                workerId,
                isPrimary: index === 0,
                commissionAmount
              };
            })
          }
        },
      });

      // Increment loyalty points for the client
      await tx.client.update({
        where: { id: createAttentionDto.clientId },
        data: {
          loyaltyPoints: {
            increment: 1
          }
        }
      });

      // Automáticamente marcar la cita como completada si viene vinculada
      if (rest.appointmentId) {
        await tx.appointment.update({
          where: { id: rest.appointmentId },
          data: { status: 'COMPLETED' }
        });
      }

      return attention;
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

  async update(id: number, updateAttentionDto: UpdateAttentionDto) {
    const { workerIds, ...rest } = updateAttentionDto;

    return this.prisma.$transaction(async (tx) => {
      // If workerIds are provided, we update the relations
      if (workerIds && workerIds.length > 0) {
        // Necesitamos el costo total para recalcular.
        const totalCostStr = rest.totalCost !== undefined
          ? rest.totalCost
          : (await tx.attention.findUnique({ where: { id } }))?.totalCost;

        const totalCost = Number(totalCostStr) || 0;
        const splitCost = totalCost / workerIds.length;

        const workersInfo = await tx.user.findMany({
          where: { id: { in: workerIds } }
        });

        // Delete all old worker relations
        await tx.attentionWorker.deleteMany({
          where: { attentionId: id }
        });

        // Update attention and add new workers
        return tx.attention.update({
          where: { id },
          data: {
            ...rest,
            workers: {
              create: workerIds.map((workerId, index) => {
                const worker = workersInfo.find(w => w.id === workerId);
                const percentage = worker ? Number(worker.commissionPercentage || 50) : 50;
                const commissionAmount = splitCost * (percentage / 100);

                return {
                  workerId,
                  isPrimary: index === 0,
                  commissionAmount
                };
              })
            }
          }
        });
      } else {
        // If no workerIds passed, just update the main fields
        return tx.attention.update({
          where: { id },
          data: rest,
        });
      }
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // Get the attention to know which client to deduct points from
      const attention = await tx.attention.findUnique({
        where: { id }
      });

      // Delete related AttentionWorker records first
      await tx.attentionWorker.deleteMany({
        where: { attentionId: id }
      });

      // Delete the attention
      const deleted = await tx.attention.delete({
        where: { id },
      });

      // Deduct loyalty points from the client (preventing negative values)
      if (attention?.clientId) {
        const client = await tx.client.findUnique({
          where: { id: attention.clientId }
        });

        if (client && client.loyaltyPoints > 0) {
          await tx.client.update({
            where: { id: client.id },
            data: {
              loyaltyPoints: {
                decrement: 1
              }
            }
          });
        }
      }

      return deleted;
    });
  }
}
