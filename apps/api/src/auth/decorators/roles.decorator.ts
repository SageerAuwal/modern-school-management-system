import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * @Roles(...roles) decorator — attach to a controller or route handler
 * to restrict access to specific roles.
 * Enforced by RolesGuard at the API layer (not just the UI).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
