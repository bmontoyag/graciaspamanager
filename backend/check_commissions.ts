
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetDate = new Date('2026-03-06T00:00:00.000Z');
    const nextDay = new Date('2026-03-07T00:00:00.000Z');

    const workers = await prisma.attentionWorker.findMany({
        where: {
            attention: {
                date: {
                    gte: targetDate,
                    lt: nextDay
                }
            }
        },
        include: {
            worker: true,
            attention: true
        }
    });

    console.log('--- Vinculaciones para la fecha 2026-03-06 ---');
    if (workers.length === 0) {
        console.log('No se encontraron vinculaciones para esa fecha.');

        // Si no hay de esa fecha, veamos las ultimas 5 de nuevo para estar SEGUROS
        const lastOnes = await prisma.attentionWorker.findMany({
            take: 5,
            orderBy: { id: 'desc' },
            include: { worker: true, attention: true }
        });
        console.log('--- Ultimas 5 vinculaciones generales para referencia ---');
        lastOnes.forEach(w => {
            console.log(`AW_ID: ${w.id}, DATE: ${w.attention.date.toISOString()}, Trabajador: ${w.worker.name}, Comision: ${w.commissionAmount}, TotalCost: ${w.attention.totalCost}`);
        });
    } else {
        workers.forEach(w => {
            console.log(`AW_ID: ${w.id}, ATT_ID: ${w.attentionId}, Trabajador: ${w.worker.name}, Comision: ${w.commissionAmount}, TotalCost: ${w.attention.totalCost}`);
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
