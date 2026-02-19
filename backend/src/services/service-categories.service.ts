
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceCategoriesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.serviceCategory.findMany();
    }

    async create(data: { name: string; description?: string }) {
        return this.prisma.serviceCategory.create({
            data,
        });
    }

    async update(id: number, data: { name?: string; description?: string }) {
        return this.prisma.serviceCategory.update({
            where: { id },
            data,
        });
    }

    async remove(id: number) {
        return this.prisma.serviceCategory.delete({
            where: { id },
        });
    }
}
