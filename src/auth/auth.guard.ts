import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { AuthService } from './auth.service.js';
import { AuthUser, RequestConUsuario } from './auth.interfaces.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

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

    try {
      request.user = await this.usuarioDelToken(token);
    } catch (error) {
      // En una ruta pública un token malo no estorba: se sigue como anónimo.
      if (esPublica) return true;

      throw error;
    }

    return true;
  }

  private async usuarioDelToken(token: string): Promise<AuthUser> {
    let user: AuthUser;

    try {
      user = await this.jwtService.verifyAsync<AuthUser>(token);
    } catch {
      // Solo aquí el token es el problema: firma inválida o caducado.
      throw new UnauthorizedException('El token no es válido o ya caducó');
    }

    if (!(await this.usuarioSigueActivo(user.sub))) {
      throw new UnauthorizedException('El usuario de este token ya no está activo');
    }

    return user;
  }

  /**
   * La consulta a la base de datos va con su propio try a propósito. Si compartiera
   * el catch con la verificación del token, una caída de la base de datos llegaría al
   * cliente como un 401 y la app cerraría la sesión sin motivo, sin poder distinguir
   * "tu token venció" de "el servidor no pudo responder".
   */
  private async usuarioSigueActivo(id: string): Promise<boolean> {
    try {
      return await this.authService.usuarioActivo(id);
    } catch (error) {
      this.logger.error(`No se pudo comprobar el usuario ${id} en la base de datos`, error);

      throw new ServiceUnavailableException(
        'No se puede comprobar la sesión en este momento',
      );
    }
  }

  private extraerToken(header?: string) {
    const [tipo, token] = header?.split(' ') ?? [];

    return tipo?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
