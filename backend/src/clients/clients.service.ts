import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) { }

  async create(createClientDto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: createClientDto,
    });

    if (client.birthday) {
      await this.scheduleBirthdayNotification(client);
    }

    return client;
  }

  findAll() {
    return this.prisma.client.findMany({
      orderBy: { id: 'desc' },
      include: {
        attentions: {
          include: {
            service: true
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
  }

  findOne(id: number) {
    return this.prisma.client.findUnique({
      where: { id },
      include: {
        attentions: {
          include: {
            service: true,
            workers: {
              include: {
                worker: true,
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    });
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    if (updateClientDto.loyaltyPoints !== undefined) {
      const existingClient = await this.prisma.client.findUnique({ where: { id } });
      if (existingClient && updateClientDto.loyaltyPoints < existingClient.loyaltyPoints) {
        const pointsDeducted = existingClient.loyaltyPoints - updateClientDto.loyaltyPoints;

        // Use transaction to update points and log redemption
        return this.prisma.$transaction(async (tx) => {
          const client = await tx.client.update({
            where: { id },
            data: updateClientDto,
          });

          await tx.loyaltyRedemption.create({
            data: {
              clientId: id,
              points: pointsDeducted,
              notes: 'Canje de Fidelidad por Promoción (Dashboard)'
            }
          });

          if (updateClientDto.birthday) await this.scheduleBirthdayNotification(client);
          return client;
        });
      }
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });

    if (updateClientDto.birthday) {
      await this.scheduleBirthdayNotification(client);
    }

    return client;
  }

  remove(id: number) {
    return this.prisma.client.delete({
      where: { id },
    });
  }

  // --- Retroactive Sync ---
  async syncLoyaltyPoints() {
    // Busca todos los clientes con sus citas y canjes
    const clients = await this.prisma.client.findMany({
      include: { attentions: true, redemptions: true }
    });

    let updatedCount = 0;

    for (const client of clients) {
      // 1. Sumamos todos los puntos ganados (1 punto por atención)
      const earnedPoints = client.attentions.length;

      // 2. Sumamos todos los puntos que ya canjeó
      const spentPoints = client.redemptions.reduce((total, r) => total + r.points, 0);

      // 3. El balance real es la diferencia estricta (no puede ser negativo)
      const balance = Math.max(0, earnedPoints - spentPoints);

      // Si el balance real no coincide con lo actual, corregimos.
      if (client.loyaltyPoints !== balance) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: { loyaltyPoints: balance }
        });
        updatedCount++;
      }
    }

    return { message: 'Sincronización completa', updatedClients: updatedCount };
  }

  private async scheduleBirthdayNotification(client: any) {
    if (!client.birthday) return;

    // Borrar notificaciones de cumple previas de este cliente
    await this.prisma.notificationTask.deleteMany({
      where: {
        relatedClientId: client.id,
        type: 'BIRTHDAY_REMINDER'
      }
    });

    // Calcular proximo cumpleaños
    const today = new Date();
    const bday = new Date(client.birthday);

    let nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

    // Si ya pasó este año, es el próximo
    if (nextBday.getTime() < today.getTime()) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }

    // Restar 7 dias para la notificacion previa
    const notificationDate = new Date(nextBday.getTime() - 7 * 24 * 60 * 60000);

    // Setear a una hora prudente, ej: 9:00 AM
    notificationDate.setHours(9, 0, 0, 0);

    // Encontrar al admin/usuario principal para enviarle el push (asumimos id: 1 por defecto por ahora)
    // Idealmente, esto deberia ir a miembros con rol 'ADMIN' o al staff asignado
    const adminUser = await this.prisma.user.findFirst({
      orderBy: { id: 'asc' }
    });

    if (!adminUser) return;

    await this.prisma.notificationTask.create({
      data: {
        type: 'BIRTHDAY_REMINDER',
        executeAt: notificationDate,
        title: `Cumpleaños próximo: ${client.name}`,
        body: `El cumpleaños de ${client.name} es en 7 días. ¡Envíale una promoción!`,
        targetUserId: adminUser.id,
        relatedClientId: client.id,
      }
    });
  }
}
