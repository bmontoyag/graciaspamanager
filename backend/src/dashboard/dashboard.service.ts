import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getMidnightLima, getStartOfMonthLima } from '../common/utils/date-utils';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(user?: any) {
        const today = getMidnightLima();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const startOfMonth = getStartOfMonthLima();

        const isWorker = user?.roles?.includes('WORKER') && !user?.roles?.includes('ADMIN');
        const workerId = user?.userId;

        // 1. Sales Today
        const salesTodayWhere: any = { 
            date: { 
                gte: today,
                lt: tomorrow
            } 
        };
        if (isWorker) {
            salesTodayWhere.workers = { some: { workerId } };
        }

        const salesToday = await this.prisma.attention.aggregate({
            _sum: { totalCost: true },
            where: salesTodayWhere,
        });

        // 2. Appointments Today
        const appointmentsTodayWhere: any = { 
            date: { 
                gte: today,
                lt: tomorrow
            } 
        };
        if (isWorker) {
            appointmentsTodayWhere.workerId = workerId;
        }

        const appointmentsToday = await this.prisma.appointment.count({
            where: appointmentsTodayWhere,
        });

        // 3. Active Clients (Total)
        const totalClients = await this.prisma.client.count();

        // 4. Sales this Month
        const salesMonthWhere: any = { date: { gte: startOfMonth } };
        if (isWorker) {
            salesMonthWhere.workers = { some: { workerId } };
        }

        const salesMonth = await this.prisma.attention.aggregate({
            _sum: { totalCost: true },
            where: salesMonthWhere,
        });

        // 5. Expenses Today
        const expensesTodayWhere: any = { 
            date: { 
                gte: today,
                lt: tomorrow
            } 
        };
        if (isWorker) {
            expensesTodayWhere.workerId = workerId;
        }

        const expensesToday = await this.prisma.expense.aggregate({
            _sum: { amount: true },
            where: expensesTodayWhere,
        });

        // 6. Expenses this Month
        const expensesMonthWhere: any = { date: { gte: startOfMonth } };
        if (isWorker) {
            expensesMonthWhere.workerId = workerId;
        }

        const expensesMonth = await this.prisma.expense.aggregate({
            _sum: { amount: true },
            where: expensesMonthWhere,
        });

        return {
            salesToday: Number(salesToday._sum.totalCost || 0),
            appointmentsToday,
            totalClients,
            salesMonth: Number(salesMonth._sum.totalCost || 0),
            expensesToday: Number(expensesToday._sum.amount || 0),
            expensesMonth: Number(expensesMonth._sum.amount || 0),
        };
    }

    async getAppointmentsToday(user?: any) {
        const today = getMidnightLima();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const where: any = {
            date: {
                gte: today,
                lt: tomorrow
            }
        };

        const isWorker = user?.roles?.includes('WORKER') && !user?.roles?.includes('ADMIN');
        if (isWorker) {
            where.workerId = user.userId;
        }

        return this.prisma.appointment.findMany({
            where,
            include: {
                client: true,
                service: true,
                worker: true,
            },
            orderBy: {
                date: 'asc'
            }
        });
    }

    async getFinanceStats() {
        const startOfMonth = getStartOfMonthLima();

        const income = await this.prisma.attention.aggregate({
            _sum: { totalCost: true },
            where: { date: { gte: startOfMonth } },
        });

        const expenses = await this.prisma.expense.aggregate({
            _sum: { amount: true },
            where: { date: { gte: startOfMonth } },
        });

        const incomeVal = Number(income._sum.totalCost || 0);
        const expenseVal = Number(expenses._sum.amount || 0);

        return {
            income: incomeVal,
            expenses: expenseVal,
            net: incomeVal - expenseVal,
        };
    }
}
