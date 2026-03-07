import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const { method, originalUrl, body, user } = req;

        // Solo auditar mutaciones
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle().pipe(
                tap(async (data) => {
                    try {
                        // Extraer la entidad de la URL, e.g. /clients -> clients
                        const urlParts = originalUrl.split('?')[0].split('/').filter(Boolean);
                        const entity = urlParts[urlParts.length - 1] || 'Unknown';

                        let action = method;
                        if (method === 'POST') action = 'CREATE';
                        if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';

                        let entityId: number | null = null;
                        if (data && data.id) {
                            entityId = data.id;
                        } else if (req.params && req.params.id) {
                            const parsed = parseInt(req.params.id, 10);
                            if (!isNaN(parsed)) entityId = parsed;
                        }

                        // Evitar auditar rutas sensibles o nulas
                        if (originalUrl.includes('/auth/')) return;
                        if (originalUrl.includes('/audit')) return;

                        await this.prisma.auditLog.create({
                            data: {
                                entity,
                                entityId,
                                action,
                                oldData: null as any,
                                newData: method === 'DELETE' ? null : (data || body) as any,
                                userId: user?.userId ? parseInt(user.userId, 10) : null,
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
