import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
    constructor(private prisma: PrismaService) { }

    create(createCompanyDto: CreateCompanyDto) {
        return this.prisma.company.create({ data: createCompanyDto });
    }

    findAll() {
        return this.prisma.company.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { quotes: true, events: true } } },
        });
    }

    findOne(id: number) {
        return this.prisma.company.findUnique({
            where: { id },
            include: {
                quotes: { orderBy: { issueDate: 'desc' } },
                events: { orderBy: { createdAt: 'desc' } },
            },
        });
    }

    update(id: number, updateCompanyDto: UpdateCompanyDto) {
        return this.prisma.company.update({ where: { id }, data: updateCompanyDto });
    }

    async remove(id: number) {
        const [quotes, events] = await Promise.all([
            this.prisma.corporateQuote.count({ where: { companyId: id } }),
            this.prisma.corporateEvent.count({ where: { companyId: id } }),
        ]);
        if (quotes > 0 || events > 0) {
            throw new BadRequestException('No se puede eliminar una empresa con cotizaciones o eventos registrados.');
        }
        return this.prisma.company.delete({ where: { id } });
    }
}
