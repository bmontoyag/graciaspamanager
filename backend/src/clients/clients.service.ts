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
    });
  }

  findOne(id: number) {
    return this.prisma.client.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
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
