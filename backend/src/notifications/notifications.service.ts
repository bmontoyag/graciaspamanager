import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

/** Errores de FCM que indican que el token ya no sirve y debe borrarse. */
const STALE_TOKEN_ERRORS = ['registration-token-not-registered', 'invalid-registration-token'];

/**
 * Envío de notificaciones push con Firebase Cloud Messaging.
 * Se activa si existe FIREBASE_SERVICE_ACCOUNT_PATH (ruta al JSON de la cuenta de servicio de Firebase).
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
    private readonly logger = new Logger(NotificationsService.name);
    private messaging: Messaging | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    onModuleInit() {
        const path = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
        if (!path) {
            this.logger.warn('FIREBASE_SERVICE_ACCOUNT_PATH no está configurado: las notificaciones push están desactivadas.');
            return;
        }
        try {
            const app = getApps()[0] ?? initializeApp({ credential: cert(path) });
            this.messaging = getMessaging(app);
            this.logger.log('Notificaciones push activas (Firebase Cloud Messaging).');
        } catch (error) {
            this.logger.error(`No se pudo iniciar Firebase con ${path}`, error as Error);
        }
    }

    /** Indica si hay un proveedor de push configurado. */
    get isEnabled(): boolean {
        return this.messaging !== null;
    }

    /** Guarda el token del dispositivo; si estaba asociado a otro usuario, pasa al actual. */
    async registerDevice(userId: number, token: string, platform: string) {
        await this.prisma.deviceToken.upsert({
            where: { token },
            create: { token, platform, userId },
            update: { platform, userId },
        });
    }

    async unregisterDevice(userId: number, token: string) {
        await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
    }

    async sendPushNotificationToUser(userId: number, title: string, body: string, data?: unknown): Promise<boolean> {
        return (await this.sendToUsers([userId], title, body, data)) > 0;
    }

    /** Envía a todos los dispositivos de los usuarios. Devuelve cuántos envíos tuvieron éxito. */
    async sendToUsers(userIds: number[], title: string, body: string, data?: unknown): Promise<number> {
        if (!this.messaging || userIds.length === 0) return 0;
        const devices = await this.prisma.deviceToken.findMany({
            where: { userId: { in: userIds } },
            select: { token: true },
        });
        if (devices.length === 0) return 0;
        const tokens = devices.map(d => d.token);

        const response = await this.messaging.sendEachForMulticast({
            tokens,
            notification: { title, body },
            data: toStringMap(data),
            android: { priority: 'high', notification: { channelId: 'activity', sound: 'default' } },
            apns: { payload: { aps: { sound: 'default' } } },
        });

        const stale = response.responses
            .map((r, i) => (!r.success && STALE_TOKEN_ERRORS.some(code => r.error?.code?.endsWith(code)) ? tokens[i] : null))
            .filter((t): t is string => t !== null);
        if (stale.length > 0) {
            await this.prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
        }
        if (response.failureCount > stale.length) {
            const firstError = response.responses.find(r => !r.success)?.error;
            this.logger.warn(`Fallaron ${response.failureCount - stale.length} envíos push: ${firstError?.message}`);
        }
        return response.successCount;
    }
}

/** FCM solo acepta valores string en `data`. */
function toStringMap(data: unknown): Record<string, string> | undefined {
    if (!data || typeof data !== 'object') return undefined;
    return Object.fromEntries(
        Object.entries(data as Record<string, unknown>)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
    );
}
