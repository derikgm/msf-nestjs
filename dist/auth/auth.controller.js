var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, UnauthorizedException, } from '@nestjs/common';
import { minutes, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { ROL_SUPERUSUARIO } from './entities/index.js';
import { Public } from './public.decorator.js';
import { Roles } from './roles.decorator.js';
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    login(dto) {
        return this.authService.login(dto);
    }
    crearPrimerUsuario(dto, request) {
        return this.authService.register(dto, request.user);
    }
    crearUsuario(dto, request) {
        return this.authService.crearUsuario(dto, this.usuarioActual(request));
    }
    crearUsuarioAdmin(dto, request) {
        return this.authService.crearUsuarioAdmin(dto, this.usuarioActual(request));
    }
    changePassword(dto, request) {
        return this.authService.changePassword(this.usuarioActual(request), dto);
    }
    yo(request) {
        return this.usuarioActual(request);
    }
    listarUsuarios() {
        return this.authService.listarUsuarios();
    }
    actualizarUsuario(id, dto, request) {
        return this.authService.actualizarUsuario(id, dto, this.usuarioActual(request));
    }
    eliminarUsuario(id, request) {
        return this.authService.eliminarUsuario(id, this.usuarioActual(request));
    }
    usuarioActual(request) {
        if (!request.user)
            throw new UnauthorizedException();
        return request.user;
    }
};
__decorate([
    Public(),
    Post('login'),
    HttpCode(200),
    Throttle({ default: { limit: 10, ttl: minutes(1) } }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    Public(),
    Post('registro'),
    Throttle({ default: { limit: 10, ttl: minutes(1) } }),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateUsuarioDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "crearPrimerUsuario", null);
__decorate([
    Post('usuarios'),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateUsuarioDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "crearUsuario", null);
__decorate([
    Roles(ROL_SUPERUSUARIO),
    Post('admin/usuarios'),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateUsuarioAdminDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "crearUsuarioAdmin", null);
__decorate([
    Post('cambiar-password'),
    HttpCode(200),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ChangePasswordDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
__decorate([
    Get('yo'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "yo", null);
__decorate([
    Roles(ROL_SUPERUSUARIO),
    Get('usuarios'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "listarUsuarios", null);
__decorate([
    Roles(ROL_SUPERUSUARIO),
    Patch('usuarios/:id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateUsuarioDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "actualizarUsuario", null);
__decorate([
    Roles(ROL_SUPERUSUARIO),
    Delete('usuarios/:id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "eliminarUsuario", null);
AuthController = __decorate([
    Controller('auth'),
    __metadata("design:paramtypes", [AuthService])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map