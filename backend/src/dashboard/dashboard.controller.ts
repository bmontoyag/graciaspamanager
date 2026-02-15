import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('stats')
    getStats(@Req() req) {
        return this.dashboardService.getStats(req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('appointments')
    getAppointmentsToday(@Req() req) {
        return this.dashboardService.getAppointmentsToday(req.user);
    }

    @Get('finance')
    getFinanceStats() {
        return this.dashboardService.getFinanceStats();
    }
}
