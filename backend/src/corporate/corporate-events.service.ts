import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getLimaMinutes, getMidnightLima, timeToMinutes, toCalendarDate } from '../common/utils/date-utils';
import {
    AssignWorkerDto, CreateEventDayDto, CreateEventExpenseDto, CreateEventPaymentDto,
    PayWorkerDto, UpdateEventDayDto, UpdateEventDto,
} from './dto/event.dto';

const round2 = (value: number) => Math.round(value * 100) / 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const EVENT_INCLUDE = {
    company: true,
    quote: { select: { id: true, code: true, includeIgv: true, igvAmount: true, therapistDayRate: true } },
    days: {
        orderBy: { date: 'asc' },
        include: {
            workers: {
                orderBy: { id: 'asc' },
                include: { worker: { select: { id: true, name: true, phoneNumber: true } } },
            },
        },
    },
    payments: { orderBy: { date: 'asc' } },
    expenses: { orderBy: { date: 'asc' }, include: { worker: { select: { id: true, name: true } } } },
} satisfies Prisma.CorporateEventInclude;

type EventWithRelations = Prisma.CorporateEventGetPayload<{ include: typeof EVENT_INCLUDE }>;

@Injectable()
export class CorporateEventsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const events = await this.prisma.corporateEvent.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                company: true,
                quote: { select: { id: true, code: true } },
                days: { orderBy: { date: 'asc' }, select: { id: true, date: true, status: true } },
                payments: { select: { amount: true } },
            },
        });

        return events.map(({ payments, ...event }) => {
            const totalPaid = round2(payments.reduce((sum, p) => sum + Number(p.amount), 0));
            return { ...event, totalPaid, balance: round2(Number(event.agreedAmount) - totalPaid) };
        });
    }

    async findOne(id: number) {
        const event = await this.prisma.corporateEvent.findUnique({ where: { id }, include: EVENT_INCLUDE });
        if (!event) throw new NotFoundException('Evento no encontrado');
        return { ...event, summary: this.buildSummary(event) };
    }

    async update(id: number, dto: UpdateEventDto) {
        await this.ensureEvent(id);
        await this.prisma.corporateEvent.update({ where: { id }, data: dto });
        return this.findOne(id);
    }

    async remove(id: number) {
        const event = await this.findOne(id);
        if (event.payments.length > 0) {
            throw new BadRequestException('El evento tiene pagos registrados. Elimínelos antes de borrar el evento.');
        }
        if (event.days.some(d => d.workers.some(w => w.isPaid))) {
            throw new BadRequestException('El evento tiene pagos a terapeutas registrados. Reviértalos antes de borrar el evento.');
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.expense.updateMany({ where: { corporateEventId: id }, data: { corporateEventId: null } });
            const deleted = await tx.corporateEvent.delete({ where: { id } });
            // La cotización vuelve a quedar disponible para convertirse
            if (event.quoteId) {
                await tx.corporateQuote.update({ where: { id: event.quoteId }, data: { status: 'ACCEPTED' } });
            }
            return deleted;
        });
    }

    // ---------- Jornadas ----------

    async addDay(eventId: number, dto: CreateEventDayDto) {
        await this.ensureEvent(eventId);
        this.validateTimeRange(dto.startTime, dto.endTime);
        await this.prisma.corporateEventDay.create({
            data: { eventId, date: toCalendarDate(dto.date), startTime: dto.startTime, endTime: dto.endTime },
        });
        return this.findOne(eventId);
    }

    async updateDay(dayId: number, dto: UpdateEventDayDto) {
        const day = await this.prisma.corporateEventDay.findUnique({ where: { id: dayId } });
        if (!day) throw new NotFoundException('Jornada no encontrada');
        this.validateTimeRange(dto.startTime ?? day.startTime, dto.endTime ?? day.endTime);

        const { date, ...rest } = dto;
        await this.prisma.corporateEventDay.update({
            where: { id: dayId },
            data: { ...rest, ...(date && { date: toCalendarDate(date) }) },
        });
        return this.findOne(day.eventId);
    }

    async removeDay(dayId: number) {
        const day = await this.prisma.corporateEventDay.findUnique({
            where: { id: dayId },
            include: { workers: true },
        });
        if (!day) throw new NotFoundException('Jornada no encontrada');
        if (day.workers.some(w => w.isPaid)) {
            throw new BadRequestException('La jornada tiene terapeutas pagadas. Revierta los pagos antes de eliminarla.');
        }
        await this.prisma.corporateEventDay.delete({ where: { id: dayId } });
        return this.findOne(day.eventId);
    }

    // ---------- Terapeutas ----------

    /**
     * Asigna una terapeuta a la jornada. No bloquea si tiene citas en el horario,
     * pero devuelve advertencias para que el usuario decida.
     */
    async assignWorker(dayId: number, dto: AssignWorkerDto) {
        const day = await this.prisma.corporateEventDay.findUnique({ where: { id: dayId } });
        if (!day) throw new NotFoundException('Jornada no encontrada');

        const existing = await this.prisma.corporateEventWorker.findUnique({
            where: { eventDayId_workerId: { eventDayId: dayId, workerId: dto.workerId } },
        });
        if (existing) throw new BadRequestException('La terapeuta ya está asignada a esta jornada.');

        const warnings = await this.findWorkerConflicts(dto.workerId, day);

        await this.prisma.corporateEventWorker.create({
            data: { eventDayId: dayId, workerId: dto.workerId, payAmount: dto.payAmount },
        });

        return { event: await this.findOne(day.eventId), warnings };
    }

    async updateWorker(assignmentId: number, payAmount: number) {
        const assignment = await this.getAssignment(assignmentId);
        if (assignment.isPaid) {
            throw new BadRequestException('El pago ya fue registrado. Reviértalo para modificar el monto.');
        }
        await this.prisma.corporateEventWorker.update({ where: { id: assignmentId }, data: { payAmount } });
        return this.findOne(assignment.eventDay.eventId);
    }

    async removeWorker(assignmentId: number) {
        const assignment = await this.getAssignment(assignmentId);
        if (assignment.isPaid) {
            throw new BadRequestException('El pago ya fue registrado. Reviértalo antes de quitar a la terapeuta.');
        }
        await this.prisma.corporateEventWorker.delete({ where: { id: assignmentId } });
        return this.findOne(assignment.eventDay.eventId);
    }

    /**
     * Registra el pago fijo de la jornada como gasto (categoría Salarios) vinculado al evento.
     */
    async payWorker(assignmentId: number, dto: PayWorkerDto) {
        const assignment = await this.getAssignment(assignmentId);
        if (assignment.isPaid) throw new BadRequestException('El pago ya fue registrado.');
        if (Number(assignment.payAmount) <= 0) {
            throw new BadRequestException('Defina el monto a pagar antes de registrar el pago.');
        }

        const { eventDay } = assignment;
        const dayLabel = eventDay.date.toISOString().slice(0, 10).split('-').reverse().join('/');

        await this.prisma.$transaction(async (tx) => {
            const expense = await tx.expense.create({
                data: {
                    description: `Pago evento corporativo: ${eventDay.event.title} (${eventDay.event.company.name}) - jornada ${dayLabel}`,
                    amount: assignment.payAmount,
                    category: 'Salarios',
                    workerId: assignment.workerId,
                    corporateEventId: eventDay.eventId,
                    date: dto.date ? toCalendarDate(dto.date) : eventDay.date,
                },
            });
            await tx.corporateEventWorker.update({
                where: { id: assignmentId },
                data: { isPaid: true, paidAt: new Date(), expenseId: expense.id },
            });
        });

        return this.findOne(eventDay.eventId);
    }

    async unpayWorker(assignmentId: number) {
        const assignment = await this.getAssignment(assignmentId);
        if (!assignment.isPaid) throw new BadRequestException('La terapeuta no tiene un pago registrado.');

        await this.prisma.$transaction(async (tx) => {
            if (assignment.expenseId) {
                await tx.expense.deleteMany({ where: { id: assignment.expenseId } });
            }
            await tx.corporateEventWorker.update({
                where: { id: assignmentId },
                data: { isPaid: false, paidAt: null, expenseId: null },
            });
        });

        return this.findOne(assignment.eventDay.eventId);
    }

    // ---------- Cobros a la empresa ----------

    async addPayment(eventId: number, dto: CreateEventPaymentDto) {
        await this.ensureEvent(eventId);
        await this.prisma.payment.create({
            data: {
                corporateEventId: eventId,
                amount: dto.amount,
                date: toCalendarDate(dto.date),
                method: dto.method ?? 'TRANSFER',
                type: dto.type ?? 'ADVANCE',
                notes: dto.notes,
            },
        });
        return this.findOne(eventId);
    }

    async removePayment(paymentId: number) {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment || !payment.corporateEventId) throw new NotFoundException('Pago corporativo no encontrado');
        await this.prisma.payment.delete({ where: { id: paymentId } });
        return this.findOne(payment.corporateEventId);
    }

    /**
     * Pagos corporativos en un rango de fechas, usados como "Ingresos corporativos" en reportes.
     */
    findPayments(from?: string, to?: string) {
        const where: Prisma.PaymentWhereInput = { corporateEventId: { not: null } };
        if (from || to) {
            where.date = {
                ...(from && { gte: getMidnightLima(toCalendarDate(from)) }),
                ...(to && { lt: new Date(getMidnightLima(toCalendarDate(to)).getTime() + DAY_MS) }),
            };
        }
        return this.prisma.payment.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                corporateEvent: { select: { id: true, title: true, company: { select: { id: true, name: true } } } },
            },
        });
    }

    // ---------- Gastos del evento ----------

    async addExpense(eventId: number, dto: CreateEventExpenseDto) {
        await this.ensureEvent(eventId);
        await this.prisma.expense.create({
            data: {
                description: dto.description,
                amount: dto.amount,
                category: dto.category,
                typeId: dto.typeId,
                date: toCalendarDate(dto.date),
                corporateEventId: eventId,
            },
        });
        return this.findOne(eventId);
    }

    async removeExpense(expenseId: number) {
        const expense = await this.prisma.expense.findUnique({ where: { id: expenseId } });
        if (!expense || !expense.corporateEventId) throw new NotFoundException('Gasto del evento no encontrado');

        const linkedAssignment = await this.prisma.corporateEventWorker.findFirst({ where: { expenseId } });
        if (linkedAssignment) {
            throw new BadRequestException('Este gasto corresponde al pago de una terapeuta. Use "Revertir pago".');
        }

        await this.prisma.expense.delete({ where: { id: expenseId } });
        return this.findOne(expense.corporateEventId);
    }

    // ---------- Calendario ----------

    async findCalendarDays(from?: string, to?: string) {
        const where: Prisma.CorporateEventDayWhereInput = {
            status: { not: 'CANCELLED' },
            event: { status: { not: 'CANCELLED' } },
        };
        if (from || to) {
            where.date = {
                ...(from && { gte: getMidnightLima(new Date(from)) }),
                ...(to && { lt: new Date(getMidnightLima(new Date(to)).getTime() + DAY_MS) }),
            };
        }
        return this.prisma.corporateEventDay.findMany({
            where,
            orderBy: { date: 'asc' },
            include: {
                event: { select: { id: true, title: true, location: true, company: { select: { name: true } } } },
                workers: { include: { worker: { select: { id: true, name: true } } } },
            },
        });
    }

    // ---------- Helpers ----------

    private buildSummary(event: EventWithRelations) {
        const agreedAmount = Number(event.agreedAmount);
        const totalPaid = round2(event.payments.reduce((sum, p) => sum + Number(p.amount), 0));
        const activeDays = event.days.filter(d => d.status !== 'CANCELLED');
        const assignments = activeDays.flatMap(d => d.workers);
        const therapistCost = round2(assignments.reduce((sum, w) => sum + Number(w.payAmount), 0));
        const therapistPaid = round2(assignments.filter(w => w.isPaid).reduce((sum, w) => sum + Number(w.payAmount), 0));
        const workerExpenseIds = new Set(event.days.flatMap(d => d.workers.map(w => w.expenseId)).filter(Boolean));
        const otherExpenses = round2(
            event.expenses.filter(e => !workerExpenseIds.has(e.id)).reduce((sum, e) => sum + Number(e.amount), 0),
        );

        return {
            agreedAmount,
            totalPaid,
            balance: round2(agreedAmount - totalPaid),
            therapistCost,
            therapistPaid,
            therapistPending: round2(therapistCost - therapistPaid),
            otherExpenses,
            estimatedMargin: round2(agreedAmount - therapistCost - otherExpenses),
            sessionsTotal: activeDays.reduce((sum, d) => sum + (d.sessionsCount || 0), 0),
        };
    }

    private async findWorkerConflicts(
        workerId: number,
        day: { id: number; date: Date; startTime: string; endTime: string },
    ) {
        const dayStart = getMidnightLima(day.date);
        const dayEnd = new Date(dayStart.getTime() + DAY_MS);
        const start = timeToMinutes(day.startTime);
        const end = timeToMinutes(day.endTime);
        const warnings: string[] = [];

        const appointments = await this.prisma.appointment.findMany({
            where: {
                date: { gte: dayStart, lt: dayEnd },
                status: { in: ['PENDING', 'CONFIRMED'] },
                OR: [{ workerId }, { workers: { some: { workerId } } }],
            },
            include: { client: { select: { name: true } } },
        });
        for (const app of appointments) {
            const appStart = getLimaMinutes(app.date);
            if (appStart < end && appStart + app.duration > start) {
                const hh = String(Math.floor(appStart / 60)).padStart(2, '0');
                const mm = String(appStart % 60).padStart(2, '0');
                warnings.push(`Tiene una cita a las ${hh}:${mm} con ${app.client?.name || 'un cliente'}.`);
            }
        }

        const otherDays = await this.prisma.corporateEventDay.findMany({
            where: {
                id: { not: day.id },
                date: { gte: dayStart, lt: dayEnd },
                status: { not: 'CANCELLED' },
                workers: { some: { workerId } },
            },
            include: { event: { select: { title: true } } },
        });
        for (const other of otherDays) {
            if (timeToMinutes(other.startTime) < end && timeToMinutes(other.endTime) > start) {
                warnings.push(`Ya está asignada al evento "${other.event.title}" (${other.startTime} - ${other.endTime}).`);
            }
        }

        return warnings;
    }

    private validateTimeRange(startTime: string, endTime: string) {
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
            throw new BadRequestException('La hora de fin debe ser mayor a la de inicio.');
        }
    }

    private async ensureEvent(id: number) {
        const event = await this.prisma.corporateEvent.findUnique({ where: { id }, select: { id: true } });
        if (!event) throw new NotFoundException('Evento no encontrado');
    }

    private async getAssignment(id: number) {
        const assignment = await this.prisma.corporateEventWorker.findUnique({
            where: { id },
            include: { eventDay: { include: { event: { include: { company: true } } } } },
        });
        if (!assignment) throw new NotFoundException('Asignación no encontrada');
        return assignment;
    }
}
