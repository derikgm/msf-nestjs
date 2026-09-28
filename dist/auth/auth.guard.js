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
let JwtAuthGuard = class JwtAuthGuard {
    reflector;
    jwtService;
    constructor(reflector, jwtService) {
        this.reflector = reflector;
        this.jwtService = jwtService;
    }
    async canActivate(context) {
        const esPublica = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (esPublica)
            return true;
        const request = context.switchToHttp().getRequest();
        const token = this.extraerToken(request.headers.authorization);
        if (!token) {
            throw new UnauthorizedException('Falta el token. Envíalo como: Authorization: Bearer <token>');
        }
        try {
            request.user = await this.jwtService.verifyAsync(token);
        }
        catch {
            throw new UnauthorizedException('Token inválido o expirado');
        }
        return true;
    }
    extraerToken(header) {
        const [tipo, token] = header?.split(' ') ?? [];
        return tipo?.toLowerCase() === 'bearer' ? token : undefined;
    }
};
JwtAuthGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector,
        JwtService])
], JwtAuthGuard);
export { JwtAuthGuard };
//# sourceMappingURL=auth.guard.js.map