import { UnauthorizedException } from '@nestjs/common';
import type { AuthUser, RequestConUsuario } from '../../auth/auth.interfaces.js';

/**
 * Saca el usuario autenticado de la petición (N-20).
 *
 * Estaba copiado a mano en `auth.controller.ts`, `delys.controller.ts`,
 * `adc.controller.ts` y `storage-quota.controller.ts`; aquí vive una vez. El
 * `JwtAuthGuard` global ya bloquea las peticiones sin token: esta comprobación
 * solo evita el `undefined` si el método se reutiliza sin el guard.
 */
export function usuarioActual(request: RequestConUsuario): AuthUser {
  if (!request.user) throw new UnauthorizedException();

  return request.user;
}