var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException, } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { AuthService } from './auth.service.js';
let JwtAuthGuard = class JwtAuthGuard {
    reflector;
    jwtService;
    authService;
    constructor(reflector, jwtService, authService) {
        this.reflector = reflector;
        this.jwtService = jwtService;
        this.authService = authService;
    }
    async canActivate(context) {
        const esPublica = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const request = context.switchToHttp().getRequest();
        const token = this.extraerToken(request.headers?.authorization);
        if (!token) {
            if (esPublica)
                return true;
            throw new UnauthorizedException('Falta el token. Envíalo como: Authorization: Bearer <token>');
        }
        const user = await this.usuarioDelToken(token);
        if (!user) {
            if (esPublica)
                return true;
            throw new UnauthorizedException('Token inválido, expirado o de un usuario desactivado');
        }
        request.user = user;
        return true;
    }
    async usuarioDelToken(token) {
        try {
            const user = await this.jwtService.verifyAsync(token);
            return (await this.authService.usuarioActivo(user.sub)) ? user : undefined;
        }
        catch {
            return undefined;
        }
    }
    extraerToken(header) {
        const [tipo, token] = header?.split(' ') ?? [];
        return tipo?.toLowerCase() === 'bearer' ? token : undefined;
    }
};
JwtAuthGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector,
        JwtService,
        AuthService])
], JwtAuthGuard);
export { JwtAuthGuard };
//# sourceMappingURL=auth.guard.js.map