import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { AuthUser } from './auth.interfaces.js';

interface RequestWithAuth {
  headers: { authorization?: string };
  user?: AuthUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (esPublica) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extraerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(
        'Falta el token. Envíalo como: Authorization: Bearer <token>',
      );
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }

  private extraerToken(header?: string) {
    const [tipo, token] = header?.split(' ') ?? [];

    return tipo?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
