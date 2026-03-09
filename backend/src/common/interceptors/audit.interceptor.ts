import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const { method, originalUrl, body, user, headers } = req;

        // Solo auditar mutaciones exitosas
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle().pipe(
                tap(async (data) => {
                    try {
                        // Extraer la entidad base de la URL (ej. /api/clients/5 -> clients)
                        const rawUrl = originalUrl.split('?')[0];
                        const match = rawUrl.match(/\/([^/]+)(\/\d+)?(\/.*)?$/);
                        let rawEntity = match ? match[1] : 'Desconocido';

                        // Capitalizar y limpiar texto de entidad (ej. attentions -> Atenciones)
                        const entityMap: Record<string, string> = {
                            'clients': 'Clientes',
                            'attentions': 'Atenciones',
                            'appointments': 'Citas',
                            'expenses': 'Gastos',
                            'users': 'Personal/Usuarios',
                            'services': 'Servicios',
                            'configuration': 'Configuración'
                        };
                        const entity = entityMap[rawEntity] || rawEntity;

                        let action = method;
                        if (method === 'POST') action = 'CREA';
                        if (method === 'PUT' || method === 'PATCH') action = 'EDITA';
                        if (method === 'DELETE') action = 'ELIMINA';

                        let entityId: number | null = null;
                        if (data && data.id) {
                            entityId = data.id;
                        } else if (req.params && req.params.id) {
                            const parsed = parseInt(req.params.id, 10);
                            if (!isNaN(parsed)) entityId = parsed;
                        }

                        // Evitar auditar rutas sensibles o inútiles
                        if (originalUrl.includes('/auth/')) return;
                        if (originalUrl.includes('/audit')) return;

                        // NestJS con Passport a veces no puebla req.user en Interceptors globales fácilmente 
                        // para el ciclo de vida, lo decodificamos manual como un fallback seguro
                        let finalUserId = user?.userId ? parseInt(user.userId, 10) : null;

                        if (!finalUserId && headers.authorization) {
                            try {
                                const token = headers.authorization.split(' ')[1];
                                const decoded: any = jwt.decode(token);
                                if (decoded && decoded.sub) {
                                    finalUserId = parseInt(decoded.sub, 10);
                                }
                            } catch (e) {
                                // Ignorar errores de decode silenciosamente
                            }
                        }

                        // Siempre capturar el body enviado por el usuario, excepto en Delete
                        let detailsPayload: any = null;
                        if (method !== 'DELETE') {
                            detailsPayload = Object.keys(body || {}).length > 0 ? { ...body } : (data ? { ...data } : null);
                        }

                        if (detailsPayload) {
                            // Ocultar contraseñas
                            if (detailsPayload.password) delete detailsPayload.password;

                            // Enriquecimiento de IDs foráneos comunes a nombres descriptivos para el Log
                            try {
                                if (detailsPayload.clientId) {
                                    const c = await this.prisma.client.findUnique({ where: { id: Number(detailsPayload.clientId) }, select: { name: true } });
                                    if (c) detailsPayload.Cliente = c.name;
                                }
                                if (detailsPayload.serviceId) {
                                    const s = await this.prisma.service.findUnique({ where: { id: Number(detailsPayload.serviceId) }, select: { name: true } });
                                    if (s) detailsPayload.Servicio = s.name;
                                }
                                if (detailsPayload.categoryId) {
                                    const cat = await this.prisma.serviceCategory.findUnique({ where: { id: Number(detailsPayload.categoryId) }, select: { name: true } });
                                    if (cat) detailsPayload.Categoría = cat.name;
                                }
                                if (detailsPayload.workerId) {
                                    const w = await this.prisma.user.findUnique({ where: { id: Number(detailsPayload.workerId) }, select: { name: true } });
                                    if (w) detailsPayload.Personal = w.name;
                                }
                                if (Array.isArray(detailsPayload.workerIds) && detailsPayload.workerIds.length > 0) {
                                    const ws = await this.prisma.user.findMany({
                                        where: { id: { in: detailsPayload.workerIds.map(Number) } },
                                        select: { name: true }
                                    });
                                    detailsPayload.Terapeutas = ws.map(w => w.name).join(', ');
                                }
                            } catch (enrichError) {
                                // Silencioso: si el enriquecimiento falla, se guarda sin nombres.
                            }
                        }

                        const stringifiedDetails = detailsPayload ? JSON.stringify(detailsPayload) : null;
                        const truncatedDetails = stringifiedDetails ? (stringifiedDetails.length > 500 ? stringifiedDetails.substring(0, 500) + '...' : stringifiedDetails) : null;

                        await this.prisma.auditLog.create({
                            data: {
                                entity,
                                entityId,
                                action,
                                oldData: null as any,
                                newData: truncatedDetails as any,
                                userId: finalUserId,
                            },
                        });
                    } catch (error) {
                        console.error('Failed to save audit log:', error);
                    }
                }),
            );
        }
        return next.handle();
    }
}
