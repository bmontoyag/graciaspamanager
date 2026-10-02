import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorporateQuotesService } from './corporate-quotes.service';
import { CorporateEventsService } from './corporate-events.service';
import { CreateQuoteDto, UpdateQuoteDto, UpdateQuoteStatusDto } from './dto/quote.dto';
import {
    AssignWorkerDto, CreateEventDayDto, CreateEventExpenseDto, CreateEventPaymentDto,
    PayWorkerDto, UpdateEventDayDto, UpdateEventDto, UpdateEventWorkerDto,
} from './dto/event.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@UseGuards(AuthGuard('jwt'))
@RequirePermissions('corporate')
@Controller('corporate')
export class CorporateController {
    constructor(
        private readonly quotesService: CorporateQuotesService,
        private readonly eventsService: CorporateEventsService,
    ) { }

    // ---------- Cotizaciones ----------

    @Post('quotes')
    createQuote(@Body() dto: CreateQuoteDto, @Req() req) {
        return this.quotesService.create(dto, req.user?.userId);
    }

    @Get('quotes')
    findQuotes() {
        return this.quotesService.findAll();
    }

    @Get('quotes/:id')
    findQuote(@Param('id', ParseIntPipe) id: number) {
        return this.quotesService.findOne(id);
    }

    @Patch('quotes/:id')
    updateQuote(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuoteDto) {
        return this.quotesService.update(id, dto);
    }

    @Patch('quotes/:id/status')
    updateQuoteStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuoteStatusDto) {
        return this.quotesService.updateStatus(id, dto.status);
    }

    @Post('quotes/:id/duplicate')
    duplicateQuote(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return this.quotesService.duplicate(id, req.user?.userId);
    }

    @Post('quotes/:id/convert')
    convertQuote(@Param('id', ParseIntPipe) id: number) {
        return this.quotesService.convertToEvent(id);
    }

    @Delete('quotes/:id')
    removeQuote(@Param('id', ParseIntPipe) id: number) {
        return this.quotesService.remove(id);
    }

    // ---------- Eventos ----------

    @Get('events')
    findEvents() {
        return this.eventsService.findAll();
    }

    @Get('events/:id')
    findEvent(@Param('id', ParseIntPipe) id: number) {
        return this.eventsService.findOne(id);
    }

    @Patch('events/:id')
    updateEvent(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
        return this.eventsService.update(id, dto);
    }

    @Delete('events/:id')
    removeEvent(@Param('id', ParseIntPipe) id: number) {
        return this.eventsService.remove(id);
    }

    @Post('events/:id/days')
    addDay(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEventDayDto) {
        return this.eventsService.addDay(id, dto);
    }

    @Patch('event-days/:id')
    updateDay(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDayDto) {
        return this.eventsService.updateDay(id, dto);
    }

    @Delete('event-days/:id')
    removeDay(@Param('id', ParseIntPipe) id: number) {
        return this.eventsService.removeDay(id);
    }

    @Post('event-days/:id/workers')
    assignWorker(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignWorkerDto) {
        return this.eventsService.assignWorker(id, dto);
    }

    @Patch('event-workers/:id')
    updateWorker(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventWorkerDto) {
        return this.eventsService.updateWorker(id, dto.payAmount);
    }

    @Delete('event-workers/:id')
    removeWorker(@Param('id', ParseIntPipe) id: number) {
        return this.eventsService.removeWorker(id);
    }

    @Post('event-workers/:id/pay')
    payWorker(@Param('id', ParseIntPipe) id: number, @Body() dto: PayWorkerDto) {
        return this.eventsService.payWorker(id, dto);
    }

    @Post('event-workers/:id/unpay')
    unpayWorker(@Param('id', ParseIntPipe) id: number) {
        return this.eventsService.unpayWorker(id);
    }

    @Post('events/:id/payments')
    addPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEventPaymentDto) {
        return this.eventsService.addPayment(id, dto);
    }

    @Delete('event-payments/:id')
    removePayment(@Param('id', ParseIntPipe) id: number) {
        return this.eventsService.removePayment(id);
    }

    @Post('events/:id/expenses')
    addExpense(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEventExpenseDto) {
        return this.eventsService.addExpense(id, dto);
    }

    @Delete('event-expenses/:id')
    removeExpense(@Param('id', ParseIntPipe) id: number) {
        return this.eventsService.removeExpense(id);
    }

    // ---------- Consultas para reportes y calendario ----------

    @Get('payments')
    findPayments(@Query('from') from?: string, @Query('to') to?: string) {
        return this.eventsService.findPayments(from, to);
    }

    @RequirePermissions('corporate', 'calendar')
    @Get('calendar')
    findCalendarDays(@Query('from') from?: string, @Query('to') to?: string) {
        return this.eventsService.findCalendarDays(from, to);
    }
}
