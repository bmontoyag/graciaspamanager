import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/** Usuario del token JWT (ver JwtStrategy.validate). */
interface Actor {
    userId: number | string;
    permissions?: string[];
}

interface ActivityMessage {
    title: string;
    body: string;
    /** Pantalla de la app que se abre al tocar la notificación. */
    route: string;
}

const money = (value: unknown) => `S/ ${Number(value ?? 0).toFixed(2)}`;

/**
 * Avisa a los administradores cuando un trabajador registra atenciones, citas, gastos o pagos.
 * Los registros hechos por un administrador no generan aviso.
 * El envío no bloquea la respuesta: los errores solo se registran en el log.
 */
@Injectable()
export class ActivityNotifier {
    private readonly logger = new Logger(ActivityNotifier.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) { }

    attentionsCreated(actor: Actor | undefined, attentionIds: number[]) {
        this.dispatch(actor, async (name) => {
            const attentions = await this.prisma.attention.findMany({
                where: { id: { in: attentionIds } },
                select: { totalCost: true, client: { select: { name: true } }, service: { select: { name: true } } },
            });
            if (attentions.length === 0) return null;
            const total = attentions.reduce((sum, a) => sum + Number(a.totalCost), 0);
            const services = attentions.map(a => a.service.name).join(', ');
            return {
                title: attentions.length > 1 ? `${attentions.length} nuevas atenciones` : 'Nueva atención',
                body: `${name} registró ${services} para ${attentions[0].client.name} (${money(total)}).`,
                route: '/attentions',
            };
        });
    }

    appointmentsCreated(actor: Actor | undefined, appointmentIds: number[], advanceAmount?: number) {
        this.dispatch(actor, async (name) => {
            const appointments = await this.prisma.appointment.findMany({
                where: { id: { in: appointmentIds } },
                orderBy: { date: 'asc' },
                select: { date: true, client: { select: { name: true } }, service: { select: { name: true } } },
            });
            if (appointments.length === 0) return null;
            const first = appointments[0];
            const when = first.date.toLocaleString('es-PE', {
                timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });
            const services = appointments.map(a => a.service.name).join(', ');
            const advance = advanceAmount && advanceAmount > 0 ? ` Adelanto: ${money(advanceAmount)}.` : '';
            return {
                title: advance ? 'Nueva cita con adelanto' : 'Nueva cita',
                body: `${name} agendó ${services} para ${first.client.name} el ${when}.${advance}`,
                route: '/calendar',
            };
        });
    }

    expenseCreated(actor: Actor | undefined, expenseId: number) {
        this.dispatch(actor, async (name) => {
            const expense = await this.prisma.expense.findUnique({
                where: { id: expenseId },
                select: { description: true, amount: true },
            });
            if (!expense) return null;
            return {
                title: 'Nuevo gasto',
                body: `${name} registró un gasto de ${money(expense.amount)}: ${expense.description}.`,
                route: '/expenses',
            };
        });
    }

    paymentRegistered(actor: Actor | undefined, appointmentId: number, amount: number) {
        this.dispatch(actor, async (name) => {
            const appointment = await this.prisma.appointment.findUnique({
                where: { id: appointmentId },
                select: { client: { select: { name: true } } },
            });
            if (!appointment) return null;
            return {
                title: 'Nuevo pago',
                body: `${name} registró un adelanto de ${money(amount)} de ${appointment.client.name}.`,
                route: '/calendar',
            };
        });
    }

    private dispatch(actor: Actor | undefined, build: (actorName: string) => Promise<ActivityMessage | null>) {
        if (!actor || !this.notifications.isEnabled || actor.permissions?.includes('all')) return;
        const actorId = Number(actor.userId);
        void (async () => {
            const admins = await this.prisma.user.findMany({
                where: { id: { not: actorId }, isActive: true, roles: { some: { role: { name: 'ADMIN' } } } },
                select: { id: true },
            });
            if (admins.length === 0) return;
            const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
            const message = await build(user?.name ?? 'Un trabajador');
            if (!message) return;
            await this.notifications.sendToUsers(admins.map(a => a.id), message.title, message.body, { route: message.route });
        })().catch(error => this.logger.error('No se pudo enviar la notificación de actividad', error));
    }
}
