import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Usuario } from './entities/index.js';
import { AuthUser } from './auth.interfaces.js';
export declare class AuthService {
    private readonly jwtService;
    private readonly config;
    private readonly usuarioRepo;
    private readonly expiresIn;
    constructor(jwtService: JwtService, config: ConfigService, usuarioRepo: Repository<Usuario>);
    login(dto: LoginDto): Promise<{
        access_token: string;
        token_type: string;
        expires_in: number;
    }>;
    register(dto: CreateUsuarioDto, caller?: AuthUser): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus" | "admin";
        };
    }>;
    crearUsuario(dto: CreateUsuarioDto, caller: AuthUser): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus" | "admin";
        };
    }>;
    changePassword(caller: AuthUser, dto: ChangePasswordDto): Promise<{
        mensaje: string;
    }>;
    usuarioActivo(id: string): Promise<boolean>;
    private crear;
    private buscarPorNombre;
    private buscarPorId;
    private hayUsuariosDelRol;
}
