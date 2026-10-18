import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateBatchAppointmentDto } from './dto/create-batch-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ActivityNotifier } from '../notifications/activity-notifier.service';

@RequirePermissions('calendar', 'attentions')
@Controller('appointments')
export class AppointmentsController {
    constructor(
        private readonly appointmentsService: AppointmentsService,
        private readonly activityNotifier: ActivityNotifier,
    ) { }

    @Post()
    async create(@Body() createAppointmentDto: CreateAppointmentDto, @Req() req) {
        const appointment = await this.appointmentsService.create(createAppointmentDto);
        this.activityNotifier.appointmentsCreated(req.user, [appointment.id], createAppointmentDto.advanceAmount);
        return appointment;
    }

    @Post('batch')
    async createBatch(@Body() createBatchDto: CreateBatchAppointmentDto, @Req() req) {
        const appointments = await this.appointmentsService.createBatch(createBatchDto);
        this.activityNotifier.appointmentsCreated(req.user, appointments.map(a => a.id), createBatchDto.advanceAmount);
        return appointments;
    }

    @Get()
    findAll() {
        return this.appointmentsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.appointmentsService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() updateAppointmentDto: UpdateAppointmentDto, @Req() req) {
        const advance = updateAppointmentDto.advanceAmount;
        const previousAdvance = advance ? await this.appointmentsService.getAdvanceAmount(id) : 0;
        const appointment = await this.appointmentsService.update(id, updateAppointmentDto);
        // Solo avisa si el adelanto es nuevo o cambió de monto.
        if (advance && advance > 0 && advance !== previousAdvance) {
            this.activityNotifier.paymentRegistered(req.user, id, advance);
        }
        return appointment;
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.appointmentsService.remove(id);
    }
}
