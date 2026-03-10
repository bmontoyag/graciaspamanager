
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            name: {
                contains: '', // Get all
            }
        },
        select: {
            id: true,
            name: true,
            commissionPercentage: true
        }
    });

    console.log('--- Todos los Usuarios y sus Comisiones ---');
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
