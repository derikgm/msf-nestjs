import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import type { RequestConUsuario } from './auth.interfaces.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        token_type: string;
        expires_in: number;
    }>;
    crearPrimerUsuario(dto: CreateUsuarioDto, request: RequestConUsuario): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus" | "adc" | "admin";
        };
    }>;
    crearUsuario(dto: CreateUsuarioDto, request: RequestConUsuario): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus" | "adc" | "admin";
        };
    }>;
    crearUsuarioAdmin(dto: CreateUsuarioAdminDto, request: RequestConUsuario): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus" | "adc" | "admin";
        };
    }>;
    changePassword(dto: ChangePasswordDto, request: RequestConUsuario): Promise<{
        mensaje: string;
    }>;
    yo(request: RequestConUsuario): import("./auth.interfaces.js").AuthUser;
    listarUsuarios(): Promise<{
        usuarios: import("./entities/usuario.entity.js").Usuario[];
    }>;
    actualizarUsuario(id: string, dto: UpdateUsuarioDto, request: RequestConUsuario): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: import("./entities/usuario.entity.js").RolUsuario;
            activo: boolean;
            creado_en: Date;
        };
    }>;
    eliminarUsuario(id: string, request: RequestConUsuario): Promise<{
        mensaje: string;
    }>;
}
