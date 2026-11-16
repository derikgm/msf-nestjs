import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { Usuario, type RolUsuario } from './entities/index.js';
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
            rol: "delys" | "domus" | "adc" | "admin";
        };
    }>;
    crearUsuario(dto: CreateUsuarioDto, caller: AuthUser): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus" | "adc" | "admin";
        };
    }>;
    crearUsuarioAdmin(dto: CreateUsuarioAdminDto, caller: AuthUser): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus" | "adc" | "admin";
        };
    }>;
    listarUsuarios(): Promise<{
        usuarios: Usuario[];
    }>;
    actualizarUsuario(id: string, dto: UpdateUsuarioDto, caller: AuthUser): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: RolUsuario;
            activo: boolean;
            creado_en: Date;
        };
    }>;
    eliminarUsuario(id: string, caller: AuthUser): Promise<{
        mensaje: string;
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
