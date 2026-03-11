import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateBatchAppointmentDto } from './dto/create-batch-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AppointmentsService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigurationService
    ) { }

    async create(createAppointmentDto: CreateAppointmentDto) {
        const { date, duration, ...rest } = createAppointmentDto;
        const appointmentDate = new Date(date);
        const appointmentDuration = duration || 60;
        const appointmentEndDate = new Date(appointmentDate.getTime() + appointmentDuration * 60000);

        await this.validateAppointment(appointmentDate, appointmentEndDate, undefined, createAppointmentDto.workerId);

        const appointment = await this.prisma.appointment.create({
            data: {
                ...rest,
                date: appointmentDate,
                duration: appointmentDuration
            },
        });

        await this.scheduleAppointmentNotifications(appointment.id, appointmentDate, appointmentDuration, createAppointmentDto.workerId);

        return appointment;
    }

    async createBatch(createBatchDto: CreateBatchAppointmentDto) {
        const { date, clientId, status, notes, services } = createBatchDto;
        const initialDate = new Date(date);
        let currentStartTime = new Date(initialDate);

        return this.prisma.$transaction(async (tx) => {
            const createdAppointments: any[] = [];

            for (const serviceItem of services) {
                const duration = serviceItem.duration || 60;
                const currentEndTime = new Date(currentStartTime.getTime() + duration * 60000);
                
                // Validate availability for THIS worker in THIS segment
                await this.validateAppointment(
                    currentStartTime,
                    currentEndTime,
                    undefined,
                    serviceItem.workerId,
                    tx
                );

                const appointment = await tx.appointment.create({
                    data: {
                        date: new Date(currentStartTime),
                        status: status || 'PENDING',
                        notes: notes,
                        clientId: clientId,
                        serviceId: serviceItem.serviceId,
                        workerId: serviceItem.workerId,
                        cost: serviceItem.cost || 0,
                        duration: duration,
                    },
                    include: {
                        client: true,
                        service: true,
                        worker: true,
                    }
                });

                await this.scheduleAppointmentNotifications(appointment.id, currentStartTime, duration, serviceItem.workerId, tx);
                createdAppointments.push(appointment);

                // Advance time for the next service in the batch
                currentStartTime = new Date(currentEndTime.getTime());
            }

            return createdAppointments;
        });
    }

    findAll() {
        return this.prisma.appointment.findMany({
            include: {
                client: true,
                worker: true,
                service: true,
            },
            orderBy: {
                date: 'asc',
            }
        });
    }

    async findOne(id: number) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: {
                client: true,
                worker: true,
                service: true,
            },
        });
        if (!appointment) {
            throw new NotFoundException(`Appointment with ID ${id} not found`);
        }
        return appointment;
    }

    async update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
        const { date, duration, ...rest } = updateAppointmentDto;
        const existingAppointment = await this.findOne(id);

        let appointmentDate = existingAppointment.date;
        let appointmentDuration = existingAppointment.duration;

        if (date) appointmentDate = new Date(date);
        if (duration) appointmentDuration = duration;

        const appointmentEndDate = new Date(appointmentDate.getTime() + appointmentDuration * 60000);

        if (date || duration || updateAppointmentDto.workerId) {
            await this.validateAppointment(
                appointmentDate, 
                appointmentEndDate, 
                id, 
                updateAppointmentDto.workerId || existingAppointment.workerId
            );
        }

        const appointment = await this.prisma.appointment.update({
            where: { id },
            data: {
                ...rest,
                ...(date && { date: appointmentDate }),
                ...(duration && { duration: appointmentDuration }),
            },
        });

        if (date || duration || updateAppointmentDto.workerId) {
            await this.scheduleAppointmentNotifications(appointment.id, appointmentDate, appointmentDuration, appointment.workerId);
        }

        return appointment;
    }

    async remove(id: number) {
        return this.prisma.appointment.delete({
            where: { id },
        });
    }

    private async validateAppointment(
        startDate: Date, 
        endDate: Date, 
        excludeId?: number, 
        workerId?: number,
        tx?: Prisma.TransactionClient
    ) {
        const prismaClient = tx || this.prisma;
        const config = await prismaClient.configuration.findFirst();
        const openTime = config?.openTime || '09:00';
        const closeTime = config?.closeTime || '21:00';
        const bufferMinutes = config?.appointmentBuffer || 10;

        // 1. Business Hours Validation (Lima Timezone)
        const limaTimeStr = startDate.toLocaleTimeString("en-US", { timeZone: "America/Lima", hour12: false, hour: '2-digit', minute: '2-digit' });
        const limaEndTimeStr = endDate.toLocaleTimeString("en-US", { timeZone: "America/Lima", hour12: false, hour: '2-digit', minute: '2-digit' });

        if (limaTimeStr < openTime || limaEndTimeStr > closeTime) {
            throw new BadRequestException(`La cita debe estar dentro del horario de atención (${openTime} - ${closeTime}).`);
        }

        const limaDateString = startDate.toLocaleString("en-US", { timeZone: "America/Lima", day: 'numeric' });
        const limaEndDateString = endDate.toLocaleString("en-US", { timeZone: "America/Lima", day: 'numeric' });

        if (limaDateString !== limaEndDateString) {
            throw new BadRequestException(`La cita no puede terminar al día siguiente.`);
        }

        // 2. Overlaps & Buffer (Per Worker)
        if (workerId) {
            const bufferMs = bufferMinutes * 60000;
            const checkStart = new Date(startDate.getTime() - bufferMs);
            const checkEnd = new Date(endDate.getTime() + bufferMs);

            const dayStart = new Date(startDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(startDate);
            dayEnd.setHours(23, 59, 59, 999);

            const dayAppointments = await prismaClient.appointment.findMany({
                where: {
                    workerId: workerId,
                    date: {
                        gte: dayStart,
                        lte: dayEnd,
                    },
                    status: {
                        in: ['PENDING', 'CONFIRMED', 'COMPLETED']
                    },
                    id: excludeId ? { not: excludeId } : undefined,
                }
            });

            for (const app of dayAppointments) {
                const appStart = new Date(app.date);
                const appEnd = new Date(appStart.getTime() + app.duration * 60000);

                // Overlap check including buffer
                if (startDate < new Date(appEnd.getTime() + bufferMs) && endDate > new Date(appStart.getTime() - bufferMs)) {
                    throw new BadRequestException(`El terapeuta ya tiene una cita ocupada (incluyendo margen de ${bufferMinutes} min) entre ${appStart.toLocaleTimeString()} y ${appEnd.toLocaleTimeString()}`);
                }
            }
        }

        // 3. Blocked Slots
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);

        const blockedSlots = await prismaClient.blockedSlot.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay }
            }
        });

        const [startH, startM] = limaTimeStr.split(':').map(Number);
        const appStartVal = startH * 60 + startM;
        const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
        const appEndVal = appStartVal + durationMinutes;

        for (const slot of blockedSlots) {
            const [bStartH, bStartM] = slot.startTime.split(':').map(Number);
            const [bEndH, bEndM] = slot.endTime.split(':').map(Number);
            const slotStartVal = bStartH * 60 + bStartM;
            const slotEndVal = bEndH * 60 + bEndM;

            if (Math.max(slotStartVal, appStartVal) < Math.min(slotEndVal, appEndVal)) {
                throw new ConflictException(`Conflicto con horario bloqueado: ${slot.startTime} - ${slot.endTime} (${slot.reason || 'Bloqueado'})`);
            }
        }
    }

    private async scheduleAppointmentNotifications(
        appointmentId: number, 
        startDate: Date, 
        durationMinutes: number, 
        workerId: number,
        tx?: Prisma.TransactionClient
    ) {
        const prismaClient = tx || this.prisma;
        
        await prismaClient.notificationTask.deleteMany({
            where: { relatedAppointmentId: appointmentId }
        });

        const preAppointmentTime = new Date(startDate.getTime() - 15 * 60000);
        const postAppointmentTime = new Date(startDate.getTime() + durationMinutes * 60000 + 15 * 60000);

        await prismaClient.notificationTask.createMany({
            data: [
                {
                    type: 'UPCOMING_APPOINTMENT',
                    executeAt: preAppointmentTime,
                    title: 'Cita en 15 minutos',
                    body: 'Tienes una cita próxima a comenzar',
                    targetUserId: workerId,
                    relatedAppointmentId: appointmentId,
                },
                {
                    type: 'PENDING_ATTENTION_RECORD',
                    executeAt: postAppointmentTime,
                    title: 'Registro de Atención Pendiente',
                    body: 'No olvides registrar el cobro y atención de tu última cita',
                    targetUserId: workerId,
                    relatedAppointmentId: appointmentId,
                }
            ]
        });
    }
}
