import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';
import { ROL_SUPERUSUARIO } from './entities/index.js';
import { RequestConUsuario } from './auth.interfaces.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rolesRequeridos?.length) return true;

    const { user } = context.switchToHttp().getRequest<RequestConUsuario>();

    // Sin @Roles() la ruta queda solo bajo el control del JwtAuthGuard.
    if (!user) return true;

    // admin administra la plataforma: entra a cualquier ruta con @Roles(), sin
    // tocar los decoradores uno por uno. El resto de roles siguen aislados.
    if (user.rol === ROL_SUPERUSUARIO) return true;

    // Cada rol es un proyecto: un usuario de "delys" no entra a "domus".
    if (!rolesRequeridos.includes(user.rol)) {
      throw new ForbiddenException(
        `Necesitas el rol ${rolesRequeridos.join(' o ')} para usar esta ruta`,
      );
    }

    return true;
  }
}
