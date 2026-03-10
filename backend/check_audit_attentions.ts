
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const auditLogs = await prisma.auditLog.findMany({
        where: {
            entity: 'Attention', // or 'Atenciones' depending on how it's stored
        },
        take: 5,
        orderBy: { id: 'desc' },
        include: { user: true }
    });

    console.log('--- Ultimos Logs de Auditoria para Atenciones ---');
    auditLogs.forEach(log => {
        console.log(`ID: ${log.id}, Accion: ${log.action}, EntidadId: ${log.entityId}, Usuario: ${log.user?.name || 'Anon'}`);
        console.log('Detalles:', JSON.stringify(log.newData, null, 2));
        console.log('------------------------------------------------');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
