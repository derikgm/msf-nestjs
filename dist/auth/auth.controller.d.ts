import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { LoginDto } from './dto/login.dto.js';
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
            rol: "delys" | "domus";
        };
    }>;
    crearUsuario(dto: CreateUsuarioDto, request: RequestConUsuario): Promise<{
        mensaje: string;
        usuario: {
            id: string;
            nombre: string;
            usuario: string;
            rol: "delys" | "domus";
        };
    }>;
    changePassword(dto: ChangePasswordDto, request: RequestConUsuario): Promise<{
        mensaje: string;
    }>;
    yo(request: RequestConUsuario): import("./auth.interfaces.js").AuthUser;
    private usuarioActual;
}
