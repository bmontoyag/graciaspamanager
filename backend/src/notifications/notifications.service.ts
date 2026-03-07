import { Injectable } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
    private expo: Expo;

    constructor(private readonly prisma: PrismaService) {
        this.expo = new Expo();
    }

    /**
     * Envia una notificación a un usuario especifico buscándolo en la BD
     */
    async sendPushNotificationToUser(userId: number, title: string, body: string, data?: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true } as any,
        }) as any;

        if (!user || !user.pushToken) {
            console.log(`Usuario ${userId} no tiene un Push Token registrado.`);
            return false;
        }

        if (!Expo.isExpoPushToken(user.pushToken)) {
            console.error(`Token Invalido para usuario ${userId}: ${user.pushToken}`);
            return false;
        }

        const message: ExpoPushMessage = {
            to: user.pushToken,
            sound: 'default',
            title,
            body,
            data: data || {},
        };

        try {
            const tickets = await this.expo.sendPushNotificationsAsync([message]);
            console.log('Push ticket:', tickets);
            return true;
        } catch (error) {
            console.error('Error enviando push notification:', error);
            return false;
        }
    }
}
