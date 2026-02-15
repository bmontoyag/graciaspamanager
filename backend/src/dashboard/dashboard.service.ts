import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(user?: any) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const isWorker = user?.roles?.includes('WORKER') && !user?.roles?.includes('ADMIN');
        const workerId = user?.userId;

        // 1. Sales Today
        // If worker, only count attentions where they are assigned (and potentially primary or commission based? Let's check "workers" relation)
        const salesTodayWhere: any = { date: { gte: today } };
        if (isWorker) {
            salesTodayWhere.workers = { some: { workerId } };
        }

        // To accurately calculate "Sales" for a worker is tricky if multiple workers are on one attention.
        // Usually "Sales" implies total revenue brought in. 
        // If we want "My Commission", that's different.
        // Requirement: "dashboard del usuario worker no debe ver la facturacion total, solo su facturacion del mes"
        // Let's assume this means the portions of attentions they produced OR the total cost of attentions they participated in.
        // Simplest interpretation: Total cost of attentions they were part of. 
        // Better interpretation: Sum of their `commissionAmount` or similar if it represents "their" billing?
        // User said "su facturacion". Let's stick to totalCost of attentions they served for now, or maybe commission?
        // Usually "Billing" = Total Cost charged to client.
        // Let's filter Attentions by worker presence and sum totalCost.

        const salesToday = await this.prisma.attention.aggregate({
            _sum: { totalCost: true },
            where: salesTodayWhere,
        });

        // 2. Appointments Today
        const appointmentsTodayWhere: any = { date: { gte: today } };
        if (isWorker) {
            appointmentsTodayWhere.workerId = workerId;
        }

        const appointmentsToday = await this.prisma.appointment.count({
            where: appointmentsTodayWhere,
        });

        // 3. Active Clients (Total) - Workers probably can see total count, or only theirs? Let's keep total for now or safe check.
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

        return {
            salesToday: Number(salesToday._sum.totalCost || 0),
            appointmentsToday,
            totalClients,
            salesMonth: Number(salesMonth._sum.totalCost || 0),
        };
    }

    async getAppointmentsToday(user?: any) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

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
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

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
