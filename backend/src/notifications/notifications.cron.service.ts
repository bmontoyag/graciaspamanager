import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsCronService {
    private readonly logger = new Logger(NotificationsCronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

    // Se ejecuta cada minuto en el segundo 0
    @Cron(CronExpression.EVERY_MINUTE)
    async processNotificationQueue() {
        this.logger.debug('Revisando la cola de tareas de notificación...');
        const now = new Date();

        // 1. Encontrar todas las tareas PENDIENTES cuya hora de ejecución ya llegó o pasó
        const pendingTasks = await this.prisma.notificationTask.findMany({
            where: {
                status: 'PENDING',
                executeAt: {
                    lte: now, // Que la hora seteada sea menor o igual a AHORA
                },
            },
            take: 50, // Lote de hasta 50 para no ahogar si hay muchas retrasadas
        });

        if (pendingTasks.length === 0) return;

        this.logger.log(`Encontradas ${pendingTasks.length} tareas de notificación pendientes.`);

        for (const task of pendingTasks) {
            try {
                // Obtenemos el targetUser para no disparar vacíos
                const targetUser = await this.prisma.user.findUnique({
                    where: { id: task.targetUserId },
                    select: { pushToken: true }
                });

                if (!targetUser?.pushToken) {
                    this.logger.warn(`Usuario ${task.targetUserId} no tiene token, marcando como cancelada.`);
                    await this.prisma.notificationTask.update({
                        where: { id: task.id },
                        data: { status: 'CANCELLED' }
                    });
                    continue;
                }

                // Llamar a Expo Push y obtener resultado (simulado via notification.service)
                const success = await this.notificationsService.sendPushNotificationToUser(
                    task.targetUserId,
                    task.title,
                    task.body,
                    task.data
                );

                // Actualizar el estado del trabajo en base al resultado de Expo
                await this.prisma.notificationTask.update({
                    where: { id: task.id },
                    data: {
                        status: success ? 'SENT' : 'FAILED',
                    },
                });

            } catch (error) {
                this.logger.error(`Falló proceso de tarea ${task.id}`, error);
                await this.prisma.notificationTask.update({
                    where: { id: task.id },
                    data: { status: 'FAILED' }
                });
            }
        }
    }
}
