import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Exige que el usuario tenga al menos uno de los módulos indicados (o 'all').
 * Se puede usar en el controller y sobrescribir por ruta.
 */
export const RequirePermissions = (...modules: string[]) => SetMetadata(PERMISSIONS_KEY, modules);
