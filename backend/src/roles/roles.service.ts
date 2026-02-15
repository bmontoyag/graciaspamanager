import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService implements OnModuleInit {
    private readonly logger = new Logger(RolesService.name);

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.seedDefaultRoles();
    }

    private async seedDefaultRoles() {
        const adminRole = await this.prisma.role.findUnique({ where: { name: 'ADMIN' } });
        if (!adminRole) {
            this.logger.log('Seeding ADMIN role...');
            await this.prisma.role.create({
                data: {
                    name: 'ADMIN',
                    description: 'Administrador del sistema',
                }
            });
        }

        const workerRole = await this.prisma.role.findUnique({ where: { name: 'WORKER' } });
        if (!workerRole) {
            this.logger.log('Seeding WORKER role...');
            await this.prisma.role.create({
                data: {
                    name: 'WORKER',
                    description: 'Trabajador / Terapeuta',
                }
            });
        }
    }

    async create(createRoleDto: CreateRoleDto) {
        const { moduleIds, ...data } = createRoleDto;

        // Create Role
        const role = await this.prisma.role.create({
            data: {
                ...data,
                modules: {
                    create: moduleIds?.map((id) => ({ moduleId: id })) || [],
                },
            },
            include: {
                modules: {
                    include: { module: true }
                }
            }
        });

        return role;
    }

    async findAll() {
        return this.prisma.role.findMany({
            include: {
                modules: {
                    include: {
                        module: true,
                    },
                },
                users: true, // Show users assigned to this role (count mostly)
            },
        });
    }

    findOne(id: number) {
        return this.prisma.role.findUnique({
            where: { id },
            include: {
                modules: {
                    include: {
                        module: true,
                    },
                },
            },
        });
    }

    async update(id: number, updateRoleDto: UpdateRoleDto) {
        const { moduleIds, ...data } = updateRoleDto;

        // Transaction to update role and modules
        return this.prisma.$transaction(async (tx) => {
            // Update basic info
            await tx.role.update({
                where: { id },
                data,
            });

            // Update modules relation
            if (moduleIds) {
                // Delete existing
                await tx.roleModule.deleteMany({
                    where: { roleId: id },
                });

                // Re-create
                await tx.roleModule.createMany({
                    data: moduleIds.map((moduleId) => ({
                        roleId: id,
                        moduleId,
                    })),
                });
            }

            return tx.role.findUnique({
                where: { id },
                include: { modules: { include: { module: true } } },
            });
        });
    }

    remove(id: number) {
        return this.prisma.role.delete({ where: { id } });
    }
}
