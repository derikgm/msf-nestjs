import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { AuthService } from './auth.service.js';
import { AuthUser, RequestConUsuario } from './auth.interfaces.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const token = this.extraerToken(request.headers?.authorization);

    if (!token) {
      if (esPublica) return true;

      throw new UnauthorizedException(
        'Falta el token. Envíalo como: Authorization: Bearer <token>',
      );
    }

    const user = await this.usuarioDelToken(token);

    // En una ruta pública un token malo no estorba: se sigue como anónimo.
    if (!user) {
      if (esPublica) return true;

      throw new UnauthorizedException('Token inválido, expirado o de un usuario desactivado');
    }

    request.user = user;

    return true;
  }

  private async usuarioDelToken(token: string): Promise<AuthUser | undefined> {
    try {
      const user = await this.jwtService.verifyAsync<AuthUser>(token);

      // El token puede vivir más que la baja del usuario: lo confirmamos en la DB.
      return (await this.authService.usuarioActivo(user.sub)) ? user : undefined;
    } catch {
      return undefined;
    }
  }

  private extraerToken(header?: string) {
    const [tipo, token] = header?.split(' ') ?? [];

    return tipo?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
