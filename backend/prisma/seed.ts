import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const password = 'adminpassword';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Ensure Roles exist
    const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN', description: 'Administrator with full access' },
    });

    const workerRole = await prisma.role.upsert({
        where: { name: 'WORKER' },
        update: {},
        create: { name: 'WORKER', description: 'Standard worker role' },
    });

    // 2. Ensure Modules exist
    const modulesData = [
        { key: 'dashboard', name: 'Dashboard' },
        { key: 'calendar', name: 'Calendario' },
        { key: 'attentions', name: 'Atenciones' },
        { key: 'services', name: 'Servicios' },
        { key: 'clients', name: 'Clientes' },
        { key: 'expenses', name: 'Gastos' },
        { key: 'daily_closing', name: 'Cierre Diario' },
        { key: 'reports', name: 'Reportes' },
        { key: 'users', name: 'Usuarios' },
        { key: 'settings', name: 'Configuración' },
        { key: 'roles', name: 'Roles y Permisos' },
    ];

    const allModules: any[] = [];
    for (const m of modulesData) {
        const mod = await prisma.module.upsert({
            where: { key: m.key },
            update: { name: m.name },
            create: { key: m.key, name: m.name },
        });
        allModules.push(mod);
    }

    // 3. Assign Modules to Roles

    // ADMIN: All modules
    // Use transaction to delete existing and create new to avoid duplicates
    await prisma.roleModule.deleteMany({ where: { roleId: adminRole.id } });

    const adminRoleModules = allModules.map(m => ({
        roleId: adminRole.id,
        moduleId: m.id
    }));

    await prisma.roleModule.createMany({
        data: adminRoleModules,
        skipDuplicates: true
    });
    console.log('Assigned ALL modules to ADMIN');

    // WORKER: Specific modules (Dashboard, Calendar, Attentions)
    await prisma.roleModule.deleteMany({ where: { roleId: workerRole.id } });

    const workerModuleKeys = ['dashboard', 'calendar', 'attentions'];
    const workerModules = allModules.filter(m => workerModuleKeys.includes(m.key));

    const workerRoleModules = workerModules.map(m => ({
        roleId: workerRole.id,
        moduleId: m.id
    }));

    await prisma.roleModule.createMany({
        data: workerRoleModules,
        skipDuplicates: true
    });
    console.log('Assigned specific modules to WORKER');

    // 4. Create/Update Users

    // Admin User
    const adminEmail = 'admin@graciaspa.com';
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Admin User',
            passwordHash: hashedPassword,
            roles: {
                create: { roleId: adminRole.id }
            }
        },
    });

    // Deimmy (Admin)
    const deimmyEmail = 'deimmy@graciaspa.com';
    const deimmy = await prisma.user.upsert({
        where: { email: deimmyEmail },
        update: {},
        create: {
            email: deimmyEmail,
            name: 'Deimmy',
            passwordHash: hashedPassword,
            phoneNumber: '999999999',
            roles: {
                create: { roleId: adminRole.id }
            }
        },
    });

    // Ensure Deimmy has Admin role
    const deimmyRole = await prisma.userRole.findUnique({
        where: { userId_roleId: { userId: deimmy.id, roleId: adminRole.id } }
    });
    if (!deimmyRole) {
        await prisma.userRole.create({
            data: { userId: deimmy.id, roleId: adminRole.id }
        });
    }

    // Workers
    const workerEmails = ['mariana@graciaspa.com', 'gracia@graciaspa.com'];
    for (const email of workerEmails) {
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                name: email.split('@')[0],
                passwordHash: hashedPassword,
                roles: {
                    create: { roleId: workerRole.id }
                }
            },
        });

        const hasWorkerRole = await prisma.userRole.findFirst({
            where: { userId: user.id, roleId: workerRole.id }
        });
        if (!hasWorkerRole) {
            await prisma.userRole.create({
                data: { userId: user.id, roleId: workerRole.id }
            });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
