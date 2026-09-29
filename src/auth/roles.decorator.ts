import { SetMetadata } from '@nestjs/common';
import type { RolUsuario } from './entities/index.js';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los proyectos indicados. El JwtAuthGuard sigue aplicando. */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
