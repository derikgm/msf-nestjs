import type { RolUsuario } from './entities/index.js';
export interface AuthUser {
    sub: string;
    usuario: string;
    rol: RolUsuario;
}
export interface RequestConUsuario {
    headers?: {
        authorization?: string;
    };
    user?: AuthUser;
}
