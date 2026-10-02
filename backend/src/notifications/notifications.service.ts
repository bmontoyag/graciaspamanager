import { Injectable } from '@nestjs/common';

/**
 * Punto de integración para notificaciones push.
 * La app móvil anterior (Expo) se retiró; la nueva app Flutter deberá conectar aquí su proveedor
 * (por ejemplo Firebase Cloud Messaging) y registrar el token en User.pushToken.
 */
@Injectable()
export class NotificationsService {
    /** Indica si hay un proveedor de push configurado. */
    get isEnabled(): boolean {
        return false;
    }

    async sendPushNotificationToUser(_userId: number, _title: string, _body: string, _data?: unknown): Promise<boolean> {
        return false;
    }
}
