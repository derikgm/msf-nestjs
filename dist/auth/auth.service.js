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
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ROL_SUPERUSUARIO, Usuario } from './entities/index.js';
import { HASH_FICTICIO, hashPassword, verifyPassword } from './password.util.js';
import { parseDurationToSeconds } from '../common/utils/duration.util.js';
let AuthService = class AuthService {
    jwtService;
    config;
    usuarioRepo;
    expiresIn;
    constructor(jwtService, config, usuarioRepo) {
        this.jwtService = jwtService;
        this.config = config;
        this.usuarioRepo = usuarioRepo;
        this.expiresIn = parseDurationToSeconds(config.get('AUTH_JWT_EXPIRES_IN') ?? '8h');
    }
    async login(dto) {
        const usuario = await this.buscarPorNombre(dto.usuario);
        const passwordOk = verifyPassword(dto.password, usuario?.password_hash ?? HASH_FICTICIO);
        if (!usuario || !passwordOk || !usuario.activo) {
            throw new UnauthorizedException('Usuario o contraseña incorrectos');
        }
        return {
            access_token: await this.jwtService.signAsync({
                sub: usuario.id,
                usuario: usuario.usuario,
                rol: usuario.rol,
            }, { expiresIn: this.expiresIn }),
            token_type: 'Bearer',
            expires_in: this.expiresIn,
        };
    }
    async register(dto, caller) {
        const rol = caller?.rol ?? dto.rol ?? 'delys';
        if (!caller && rol === ROL_SUPERUSUARIO) {
            throw new ForbiddenException('El rol admin no se da de alta por el registro público: créalo con POST /auth/admin/usuarios (hace falta token de admin) o desde el servidor');
        }
        const yaHayUsuarios = await this.hayUsuariosDelRol(rol);
        if (yaHayUsuarios && caller?.rol !== rol) {
            throw new UnauthorizedException('El registro está cerrado: pídele a un usuario de ese rol que te cree la cuenta');
        }
        return this.crear(dto, rol);
    }
    async crearUsuario(dto, caller) {
        return this.crear(dto, caller.rol);
    }
    async crearUsuarioAdmin(dto, caller) {
        if (caller.rol !== ROL_SUPERUSUARIO) {
            throw new ForbiddenException('Solo un administrador puede asignar roles');
        }
        return this.crear(dto, dto.rol);
    }
    async listarUsuarios() {
        const usuarios = await this.usuarioRepo.find({
            order: { creado_en: 'DESC' },
            select: {
                id: true,
                nombre: true,
                usuario: true,
                rol: true,
                activo: true,
                creado_en: true,
            },
        });
        return { usuarios };
    }
    async actualizarUsuario(id, dto, caller) {
        if (caller.rol !== ROL_SUPERUSUARIO) {
            throw new ForbiddenException('Solo un administrador puede gestionar usuarios');
        }
        const usuario = await this.buscarPorId(id);
        if (!usuario) {
            throw new NotFoundException('No existe el usuario ' + id);
        }
        if (dto.rol !== undefined) {
            usuario.rol = dto.rol;
        }
        if (dto.activo !== undefined) {
            usuario.activo = dto.activo;
        }
        await this.usuarioRepo.save(usuario);
        const { password_hash, ...resto } = usuario;
        return { mensaje: 'Usuario actualizado', usuario: resto };
    }
    async eliminarUsuario(id, caller) {
        if (caller.rol !== ROL_SUPERUSUARIO) {
            throw new ForbiddenException('Solo un administrador puede gestionar usuarios');
        }
        const usuario = await this.buscarPorId(id);
        if (!usuario) {
            throw new NotFoundException('No existe el usuario ' + id);
        }
        await this.usuarioRepo.delete(id);
        return { mensaje: 'Usuario eliminado' };
    }
    async changePassword(caller, dto) {
        const usuario = await this.buscarPorId(caller.sub);
        if (!usuario)
            throw new UnauthorizedException('El usuario ya no existe');
        if (!verifyPassword(dto.password_actual, usuario.password_hash)) {
            throw new UnauthorizedException('La contraseña actual es incorrecta');
        }
        usuario.password_hash = hashPassword(dto.password_nueva);
        await this.usuarioRepo.save(usuario);
        return { mensaje: 'Contraseña actualizada correctamente' };
    }
    async usuarioActivo(id) {
        return this.usuarioRepo.existsBy({ id, activo: true });
    }
    async crear(dto, rol) {
        const usuario = dto.usuario.trim().toLowerCase();
        if (await this.usuarioRepo.existsBy({ usuario })) {
            throw new ConflictException('Ese nombre de usuario ya existe');
        }
        const nuevo = await this.usuarioRepo.save(this.usuarioRepo.create({
            nombre: dto.nombre.trim(),
            usuario,
            password_hash: hashPassword(dto.password),
            rol,
        }));
        return {
            mensaje: 'Usuario creado correctamente',
            usuario: {
                id: nuevo.id,
                nombre: nuevo.nombre,
                usuario: nuevo.usuario,
                rol: nuevo.rol,
            },
        };
    }
    async buscarPorNombre(usuario) {
        return this.usuarioRepo
            .createQueryBuilder('usuario')
            .addSelect('usuario.password_hash')
            .where('usuario.usuario = :usuario', {
            usuario: usuario.trim().toLowerCase(),
        })
            .getOne();
    }
    async buscarPorId(id) {
        return this.usuarioRepo
            .createQueryBuilder('usuario')
            .addSelect('usuario.password_hash')
            .where('usuario.id = :id', { id })
            .getOne();
    }
    async hayUsuariosDelRol(rol) {
        return this.usuarioRepo.existsBy({ rol });
    }
};
AuthService = __decorate([
    Injectable(),
    __param(2, Inject(getRepositoryToken(Usuario))),
    __metadata("design:paramtypes", [JwtService,
        ConfigService,
        Repository])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map