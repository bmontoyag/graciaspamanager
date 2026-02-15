import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModulesService implements OnModuleInit {
    private readonly logger = new Logger(ModulesService.name);

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.seedModules();
    }

    private async seedModules() {
        const defaultModules = [
            { key: 'dashboard', name: 'Dashboard' },
            { key: 'calendar', name: 'Calendario' },
            { key: 'clients', name: 'Clientes' },
            { key: 'users', name: 'Usuarios' },
            { key: 'expenses', name: 'Gastos' },
            { key: 'attentions', name: 'Atenciones' },
            { key: 'services', name: 'Servicios' },
            { key: 'reports', name: 'Reportes' },
            { key: 'settings', name: 'Configuración' },
            { key: 'daily-closing', name: 'Cierre Diario' },
            { key: 'roles', name: 'Roles y Permisos' },
        ];

        for (const mod of defaultModules) {
            const exists = await this.prisma.module.findUnique({
                where: { key: mod.key },
            });

            if (!exists) {
                await this.prisma.module.create({
                    data: mod,
                });
                this.logger.log(`Module seeded: ${mod.name}`);
            }
        }
    }

    create(createModuleDto: CreateModuleDto) {
        return this.prisma.module.create({ data: createModuleDto });
    }

    findAll() {
        return this.prisma.module.findMany();
    }

    findOne(id: number) {
        return this.prisma.module.findUnique({ where: { id } });
    }

    update(id: number, updateModuleDto: UpdateModuleDto) {
        return this.prisma.module.update({
            where: { id },
            data: updateModuleDto,
        });
    }

    remove(id: number) {
        return this.prisma.module.delete({ where: { id } });
    }
}
