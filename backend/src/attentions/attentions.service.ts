import { Injectable } from '@nestjs/common';
import { CreateAttentionDto } from './dto/create-attention.dto';
import { CreateBatchAttentionDto } from './dto/create-batch.dto';
import { UpdateAttentionDto } from './dto/update-attention.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttentionsService {
  constructor(private prisma: PrismaService) { }

  async create(createAttentionDto: CreateAttentionDto) {
    // Asegurar que workerIds sean números siempre
    const workerIds = (createAttentionDto.workerIds || []).map(id => Number(id));
    const { workerIds: _, ...rest } = createAttentionDto;

    const totalCost = Number(rest.totalCost) || 0;
    const workerCounts = workerIds.length > 0 ? workerIds.length : 1;
    const splitCost = totalCost / workerCounts;

    console.log(`[CommissionDebug] CREANDO: Total=${totalCost}, Terapeutas=${workerIds.join(',')}, splitCost=${splitCost}`);

    // Obtener los porcentajes de comision de los terapeutas de forma segura
    const workersInfo = await this.prisma.user.findMany({
      where: { id: { in: workerIds } }
    });

    // Use a transaction to ensure both the attention is created and points are updated
    return this.prisma.$transaction(async (tx) => {
      const attention = await tx.attention.create({
        data: {
          ...rest,
          workers: {
            create: workerIds.map((workerId, index) => {
              const worker = workersInfo.find(w => Number(w.id) === Number(workerId));
              const pStr = worker?.commissionPercentage?.toString() || '50';
              const percentage = parseFloat(pStr) || 50;
              const commissionAmount = Number(splitCost) * (percentage / 100);

              console.log(`[CommissionDebug] -> Terapeuta ID ${workerId}: ${percentage}% de ${splitCost} = ${commissionAmount}`);

              return {
                workerId: Number(workerId),
                isPrimary: index === 0,
                commissionAmount: Number(commissionAmount.toFixed(2))
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

        // Vincular adelantos existentes
        await tx.payment.updateMany({
          where: {
            appointmentId: rest.appointmentId,
            type: 'ADVANCE',
            attentionId: null // Solo los que no han sido vinculados aún
          },
          data: {
            attentionId: attention.id
          }
        });
      }

      return attention;
    });
  }

  async createBatch(createBatchDto: CreateBatchAttentionDto) {
    const { services, clientId, appointmentId, ...rest } = createBatchDto;

    // Obtener los porcentajes de comision de todos los terapeutas involucrados
    const allWorkerIds = Array.from(new Set(services.flatMap(s => s.workerIds).map(Number)));
    const workersInfo = await this.prisma.user.findMany({
      where: { id: { in: allWorkerIds } }
    });

    return this.prisma.$transaction(async (tx) => {
      const attentions: any[] = [];

      for (const serviceData of services) {
        const workerIds = (serviceData.workerIds || []).map(id => Number(id));
        const totalCost = Number(serviceData.totalCost) || 0;
        const workerCounts = workerIds.length > 0 ? workerIds.length : 1;
        const splitCost = totalCost / workerCounts;

        const attention = await tx.attention.create({
          data: {
            clientId,
            serviceId: serviceData.serviceId,
            totalCost,
            appointmentId,
            ...rest,
            workers: {
              create: workerIds.map((workerId, index) => {
                const worker = workersInfo.find(w => Number(w.id) === Number(workerId));
                const pStr = worker?.commissionPercentage?.toString() || '50';
                const percentage = parseFloat(pStr) || 50;
                const commissionAmount = Number(splitCost) * (percentage / 100);

                return {
                  workerId: Number(workerId),
                  isPrimary: index === 0,
                  commissionAmount: Number(commissionAmount.toFixed(2))
                };
              })
            }
          },
        });
        attentions.push(attention);
      }

      // Increment loyalty points for the client once
      if (attentions.length > 0) {
        await tx.client.update({
          where: { id: clientId },
          data: { loyaltyPoints: { increment: 1 } }
        });
      }

      // Automatically mark the appointment as completed if linked
      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'COMPLETED' }
        });

        // Vincular adelantos existentes a la primera atención del lote
        if (attentions.length > 0) {
          await tx.payment.updateMany({
            where: {
              appointmentId: appointmentId,
              type: 'ADVANCE',
              attentionId: null
            },
            data: {
              attentionId: attentions[0].id
            }
          });
        }
      }

      return attentions;
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
    const { workerIds, serviceId, ...rest } = updateAttentionDto;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.attention.findUnique({ 
        where: { id },
        include: { workers: true }
      });

      if (!existing) throw new Error('Atención no encontrada');

      const finalWorkerIds = workerIds || existing.workers.map(w => w.workerId);
      const finalServiceId = serviceId || existing.serviceId;
      const finalTotalCost = Number(rest.totalCost !== undefined ? rest.totalCost : existing.totalCost);

      if (workerIds || serviceId || rest.totalCost !== undefined) {
        const workerCounts = finalWorkerIds.length > 0 ? finalWorkerIds.length : 1;
        const splitCost = finalTotalCost / workerCounts;

        const workersInfo = await tx.user.findMany({
          where: { id: { in: finalWorkerIds.map(Number) } }
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
            serviceId: finalServiceId,
            workers: {
              create: finalWorkerIds.map((workerId, index) => {
                const worker = workersInfo.find(w => Number(w.id) === Number(workerId));
                const pStr = worker?.commissionPercentage?.toString() || '50';
                const percentage = parseFloat(pStr) || 50;
                const commissionAmount = Number(splitCost) * (percentage / 100);

                return {
                  workerId: Number(workerId),
                  isPrimary: index === 0,
                  commissionAmount: Number(commissionAmount.toFixed(2))
                };
              })
            }
          }
        });
      } else {
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
