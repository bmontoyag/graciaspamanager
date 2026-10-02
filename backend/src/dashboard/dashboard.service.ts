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
            appointmentsTodayWhere.OR = [{ workerId }, { workers: { some: { workerId } } }];
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

        // 7. Ingresos corporativos (cobros a empresas), solo visibles para administración
        let corporateToday = 0;
        let corporateMonth = 0;
        if (!isWorker) {
            const [corpToday, corpMonth] = await Promise.all([
                this.prisma.payment.aggregate({
                    _sum: { amount: true },
                    where: { corporateEventId: { not: null }, date: { gte: today, lt: tomorrow } },
                }),
                this.prisma.payment.aggregate({
                    _sum: { amount: true },
                    where: { corporateEventId: { not: null }, date: { gte: startOfMonth } },
                }),
            ]);
            corporateToday = Number(corpToday._sum.amount || 0);
            corporateMonth = Number(corpMonth._sum.amount || 0);
        }

        return {
            salesToday: Number(salesToday._sum.totalCost || 0),
            appointmentsToday,
            totalClients,
            salesMonth: Number(salesMonth._sum.totalCost || 0),
            expensesToday: Number(expensesToday._sum.amount || 0),
            expensesMonth: Number(expensesMonth._sum.amount || 0),
            corporateToday,
            corporateMonth,
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
            where.OR = [{ workerId: user.userId }, { workers: { some: { workerId: user.userId } } }];
        }

        return this.prisma.appointment.findMany({
            where,
            include: {
                client: true,
                service: true,
                worker: true,
                workers: { include: { worker: { select: { id: true, name: true } } } },
            },
            orderBy: {
                date: 'asc'
            }
        });
    }
}
