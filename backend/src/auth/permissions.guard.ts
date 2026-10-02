import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

// Históricamente el módulo de cierre diario existe con ambas claves
const normalize = (key: string) => key.replace(/-/g, '_');

/**
 * Guard global que corre después del JWT: valida los permisos por módulo del token.
 * Las rutas sin @RequirePermissions solo exigen sesión.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const targets = [context.getHandler(), context.getClass()];
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

        const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets);
        if (!required || required.length === 0) return true;

        const user = context.switchToHttp().getRequest().user;
        const granted: string[] = (user?.permissions || []).map(normalize);
        if (granted.includes('all') || required.some(key => granted.includes(normalize(key)))) return true;

        throw new ForbiddenException('No tiene permiso para realizar esta acción.');
    }
}

export function hasPermission(user: { permissions?: string[] } | undefined, ...modules: string[]) {
    const granted = (user?.permissions || []).map(normalize);
    return granted.includes('all') || modules.some(m => granted.includes(normalize(m)));
}
