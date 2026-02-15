import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class AppointmentsService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigurationService
    ) { }

    async create(createAppointmentDto: CreateAppointmentDto) {
        const { date, duration, ...rest } = createAppointmentDto;
        const appointmentDate = new Date(date);

        // Calculate end time based on duration (default 60 min if not provided)
        const appointmentDuration = duration || 60;
        const appointmentEndDate = new Date(appointmentDate.getTime() + appointmentDuration * 60000);

        await this.validateAppointment(appointmentDate, appointmentEndDate);

        return this.prisma.appointment.create({
            data: {
                ...rest,
                date: appointmentDate,
                duration: appointmentDuration
            },
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

        if (date) {
            appointmentDate = new Date(date);
        }
        if (duration) {
            appointmentDuration = duration;
        }

        const appointmentEndDate = new Date(appointmentDate.getTime() + appointmentDuration * 60000);

        // Validate only if date or duration changed
        if (date || duration) {
            await this.validateAppointment(appointmentDate, appointmentEndDate, id);
        }

        return this.prisma.appointment.update({
            where: { id },
            data: {
                ...rest,
                ...(date && { date: appointmentDate }),
                ...(duration && { duration: appointmentDuration }),
            },
        });
    }

    async remove(id: number) {
        return this.prisma.appointment.delete({
            where: { id },
        });
    }

    private async validateAppointment(startDate: Date, endDate: Date, excludeId?: number) {
        const config = await this.configService.getGlobalConfig();
        const openTime = config?.openTime || '09:00';
        const closeTime = config?.closeTime || '21:00';
        const bufferMinutes = config?.appointmentBuffer || 10;

        console.log(`Validating Appointment: ${startDate.toISOString()} - ${endDate.toISOString()}`);
        console.log(`Business Hours: ${openTime} - ${closeTime}`);

        // 1. Check Business Hours
        // Use America/Lima timezone for validation to ensure consistency regardless of server timezone
        const limaTimeStr = startDate.toLocaleTimeString("en-US", { timeZone: "America/Lima", hour12: false, hour: '2-digit', minute: '2-digit' });
        const limaEndTimeStr = endDate.toLocaleTimeString("en-US", { timeZone: "America/Lima", hour12: false, hour: '2-digit', minute: '2-digit' });

        console.log(`Validating Time (Lima): ${limaTimeStr} - ${limaEndTimeStr} vs ${openTime}-${closeTime}`);

        // Simple string comparison works for "HH:mm" in 24h format
        if (limaTimeStr < openTime || limaTimeStr > closeTime) {
            throw new BadRequestException(`La cita debe estar dentro del horario de atención (${openTime} - ${closeTime}).`);
        }

        // Check if ends after close time
        const [startH, startM] = limaTimeStr.split(':').map(Number);
        const [closeH, closeM] = closeTime.split(':').map(Number);

        const startMinutesVal = startH * 60 + startM;
        const closeMinutesVal = closeH * 60 + closeM;
        const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;

        if (startMinutesVal + durationMinutes > closeMinutesVal) {
            throw new BadRequestException(`La cita termina fuera del horario de atención (${closeTime}).`);
        }

        // Check if spans across days (in Lima time context)
        const limaDateString = startDate.toLocaleString("en-US", { timeZone: "America/Lima", day: 'numeric' });
        const limaEndDateString = endDate.toLocaleString("en-US", { timeZone: "America/Lima", day: 'numeric' });

        if (limaDateString !== limaEndDateString) {
            throw new BadRequestException(`La cita no puede terminar al día siguiente.`);
        }

        // 2. Check Overlaps & Buffer
        const bufferMs = bufferMinutes * 60000;
        const checkStart = new Date(startDate.getTime() - bufferMs);
        const checkEnd = new Date(endDate.getTime() + bufferMs);

        const conflictingAppointment = await this.prisma.appointment.findFirst({
            where: {
                id: { not: excludeId },
                status: { not: 'CANCELLED' },
                AND: [
                    { date: { lt: checkEnd } },
                    { date: { gte: new Date(checkStart.getTime() - 4 * 60 * 60000), lte: checkEnd } }
                ]
            }
        });

        if (conflictingAppointment) {
            // Detailed check
            const candidates = await this.prisma.appointment.findMany({
                where: {
                    id: { not: excludeId },
                    status: { not: 'CANCELLED' },
                    date: {
                        gte: new Date(checkStart.getTime() - 24 * 60 * 60000),
                        lte: new Date(checkEnd.getTime() + 24 * 60 * 60000)
                    }
                }
            });

            for (const appt of candidates) {
                const apptStart = new Date(appt.date);
                const apptEnd = new Date(apptStart.getTime() + appt.duration * 60000);

                const isSafeBefore = apptEnd.getTime() + bufferMs <= startDate.getTime();
                const isSafeAfter = apptStart.getTime() >= endDate.getTime() + bufferMs;

                if (!isSafeBefore && !isSafeAfter) {
                    throw new ConflictException(`Conflicto de horario. Debe haber un margen de ${bufferMinutes} min entre citas.`);
                }
            }
        }

        // 3. Check Blocked Slots
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);

        const blockedSlots = await this.prisma.blockedSlot.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        for (const slot of blockedSlots) {
            const [bStartH, bStartM] = slot.startTime.split(':').map(Number);
            const [bEndH, bEndM] = slot.endTime.split(':').map(Number);

            const slotStartVal = bStartH * 60 + bStartM;
            const slotEndVal = bEndH * 60 + bEndM;

            // Check if appointment time overlaps with slot time
            // Re-use calculated appointment values (in Lima time context for consistency? 
            // OR use UTC if blocked slots are UTC? 
            // Blocked slots are likely just "10:00" string. 
            // So we should compare against appointment "10:00" Lima time string details.

            // We already have startH, startM for the appointment in Lima time.
            const appStartVal = startH * 60 + startM;
            const appEndVal = appStartVal + durationMinutes;

            if (Math.max(slotStartVal, appStartVal) < Math.min(slotEndVal, appEndVal)) {
                throw new ConflictException(`Conflicto con horario bloqueado: ${slot.startTime} - ${slot.endTime} (${slot.reason || 'Bloqueado'})`);
            }
        }
    }
}
