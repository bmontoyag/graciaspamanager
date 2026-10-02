import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getTodayLimaString, toCalendarDate, timeToMinutes } from '../common/utils/date-utils';
import { CreateQuoteDto, QuoteDayDto, QuoteItemDto, UpdateQuoteDto } from './dto/quote.dto';

const round2 = (value: number) => Math.round(value * 100) / 100;

const QUOTE_INCLUDE = {
    company: true,
    days: { orderBy: { date: 'asc' } },
    items: { orderBy: { id: 'asc' }, include: { service: true } },
    event: { select: { id: true, status: true } },
    createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CorporateQuoteInclude;

@Injectable()
export class CorporateQuotesService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateQuoteDto, userId?: number) {
        this.validateDays(dto.days);
        const config = await this.prisma.configuration.findFirst();
        const igvRate = Number(config?.igvRate ?? 18);
        const totals = this.computeTotals(dto.items, dto.discount ?? 0, !!dto.includeIgv, !!dto.igvIncluded, igvRate);
        const { days, items, conditions, issueDate, ...rest } = dto;

        // Reintentar ante colisión de código (dos cotizaciones creadas al mismo tiempo)
        for (let attempt = 0; attempt < 3; attempt++) {
            const code = await this.nextCode(new Date(issueDate));
            try {
                return await this.prisma.corporateQuote.create({
                    data: {
                        ...rest,
                        code,
                        issueDate: toCalendarDate(issueDate),
                        conditions: (conditions ?? []) as unknown as Prisma.InputJsonValue,
                        igvRate,
                        ...totals,
                        createdById: userId,
                        days: { create: days.map(d => this.mapDay(d)) },
                        items: { create: items.map(i => this.mapItem(i)) },
                    },
                    include: QUOTE_INCLUDE,
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
                throw error;
            }
        }
        throw new BadRequestException('No se pudo generar el código de la cotización, intente nuevamente.');
    }

    findAll() {
        return this.prisma.corporateQuote.findMany({
            orderBy: { issueDate: 'desc' },
            include: {
                company: true,
                days: { orderBy: { date: 'asc' } },
                event: { select: { id: true, status: true } },
            },
        });
    }

    async findOne(id: number) {
        const quote = await this.prisma.corporateQuote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
        if (!quote) throw new NotFoundException('Cotización no encontrada');
        return quote;
    }

    async update(id: number, dto: UpdateQuoteDto) {
        const existing = await this.findOne(id);
        if (existing.status === 'CONVERTED') {
            throw new BadRequestException('La cotización ya fue convertida en evento y no puede editarse.');
        }
        if (dto.days) this.validateDays(dto.days);

        const { days, items, conditions, issueDate, ...rest } = dto;
        const itemsForTotals = items ?? existing.items.map(i => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
        }));
        const totals = this.computeTotals(
            itemsForTotals,
            dto.discount ?? Number(existing.discount),
            dto.includeIgv ?? existing.includeIgv,
            dto.igvIncluded ?? existing.igvIncluded,
            Number(existing.igvRate),
        );

        return this.prisma.$transaction(async (tx) => {
            if (days) await tx.corporateQuoteDay.deleteMany({ where: { quoteId: id } });
            if (items) await tx.corporateQuoteItem.deleteMany({ where: { quoteId: id } });

            return tx.corporateQuote.update({
                where: { id },
                data: {
                    ...rest,
                    ...totals,
                    ...(issueDate && { issueDate: toCalendarDate(issueDate) }),
                    ...(conditions && { conditions: conditions as unknown as Prisma.InputJsonValue }),
                    ...(days && { days: { create: days.map(d => this.mapDay(d)) } }),
                    ...(items && { items: { create: items.map(i => this.mapItem(i)) } }),
                },
                include: QUOTE_INCLUDE,
            });
        });
    }

    async updateStatus(id: number, status: Prisma.CorporateQuoteUpdateInput['status']) {
        const quote = await this.findOne(id);
        if (quote.status === 'CONVERTED') {
            throw new BadRequestException('La cotización ya fue convertida en evento.');
        }
        if (status === 'CONVERTED') {
            throw new BadRequestException('Use la opción "Convertir en evento".');
        }
        return this.prisma.corporateQuote.update({ where: { id }, data: { status }, include: QUOTE_INCLUDE });
    }

    async duplicate(id: number, userId?: number) {
        const source = await this.findOne(id);
        const today = getTodayLimaString();

        return this.create({
            companyId: source.companyId,
            location: source.location ?? undefined,
            title: source.title,
            subtitle: source.subtitle ?? undefined,
            issueDate: today,
            validityDays: source.validityDays,
            introduction: source.introduction ?? undefined,
            serviceDescription: source.serviceDescription ?? undefined,
            focusZones: source.focusZones,
            sessionDurationMin: source.sessionDurationMin,
            therapistsCount: source.therapistsCount,
            chairsCount: source.chairsCount,
            modality: source.modality ?? undefined,
            scopeItems: source.scopeItems,
            conditions: (source.conditions as any) ?? [],
            showIssuerRuc: source.showIssuerRuc,
            includeIgv: source.includeIgv,
            igvIncluded: source.igvIncluded,
            discount: Number(source.discount),
            showBreakdown: source.showBreakdown,
            therapistDayRate: Number(source.therapistDayRate),
            notes: source.notes ?? undefined,
            days: source.days.map(d => ({
                date: d.date.toISOString(),
                startTime: d.startTime,
                endTime: d.endTime,
            })),
            items: source.items.map(i => ({
                serviceId: i.serviceId ?? undefined,
                description: i.description,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice),
            })),
        }, userId);
    }

    async remove(id: number) {
        const quote = await this.findOne(id);
        if (quote.event) {
            throw new BadRequestException('No se puede eliminar una cotización que ya tiene un evento asociado.');
        }
        return this.prisma.corporateQuote.delete({ where: { id } });
    }

    /**
     * Convierte una cotización aceptada en un evento corporativo, copiando jornadas y monto.
     */
    async convertToEvent(id: number) {
        const quote = await this.findOne(id);
        if (quote.status !== 'ACCEPTED') {
            throw new BadRequestException('Solo se pueden convertir cotizaciones en estado Aceptada.');
        }
        if (quote.event) {
            throw new BadRequestException('La cotización ya tiene un evento asociado.');
        }

        return this.prisma.$transaction(async (tx) => {
            const event = await tx.corporateEvent.create({
                data: {
                    quoteId: quote.id,
                    companyId: quote.companyId,
                    title: quote.title,
                    location: quote.location,
                    agreedAmount: quote.total,
                    sessionDurationMin: quote.sessionDurationMin,
                    days: {
                        create: quote.days.map(d => ({
                            date: d.date,
                            startTime: d.startTime,
                            endTime: d.endTime,
                        })),
                    },
                },
            });

            await tx.corporateQuote.update({ where: { id }, data: { status: 'CONVERTED' } });
            return event;
        });
    }

    /**
     * Calcula montos según la modalidad tributaria elegida:
     * - sin IGV: total = subtotal - descuento
     * - IGV adicional: total = base + IGV
     * - IGV incluido: el total es la base y se desglosa el IGV contenido
     */
    private computeTotals(
        items: QuoteItemDto[],
        discount: number,
        includeIgv: boolean,
        igvIncluded: boolean,
        igvRate: number,
    ) {
        const subtotal = round2(items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0));
        const base = round2(Math.max(subtotal - Number(discount || 0), 0));
        let igvAmount = 0;
        let total = base;

        if (includeIgv) {
            if (igvIncluded) {
                igvAmount = round2(base - base / (1 + igvRate / 100));
            } else {
                igvAmount = round2(base * igvRate / 100);
                total = round2(base + igvAmount);
            }
        }

        return { subtotal, igvAmount, total };
    }

    private validateDays(days: QuoteDayDto[]) {
        for (const day of days) {
            if (timeToMinutes(day.endTime) <= timeToMinutes(day.startTime)) {
                throw new BadRequestException(`La hora de fin debe ser mayor a la de inicio (${day.date.slice(0, 10)}).`);
            }
        }
    }

    private mapDay(day: QuoteDayDto) {
        return { date: toCalendarDate(day.date), startTime: day.startTime, endTime: day.endTime };
    }

    private mapItem(item: QuoteItemDto) {
        return {
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: round2(Number(item.quantity) * Number(item.unitPrice)),
        };
    }

    private async nextCode(issueDate: Date) {
        const prefix = `COT-${issueDate.getUTCFullYear()}-`;
        const last = await this.prisma.corporateQuote.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
            select: { code: true },
        });
        const next = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
        return `${prefix}${String(next).padStart(4, '0')}`;
    }
}
