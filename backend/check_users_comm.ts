
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            commissionPercentage: true
        }
    });

    console.log('--- Porcentajes de Comision de Usuarios ---');
    users.forEach(u => {
        console.log(`ID: ${u.id}, Nombre: ${u.name}, Comision%: ${u.commissionPercentage}`);
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
