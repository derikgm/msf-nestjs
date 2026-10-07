import { type RolUsuario } from '../entities/index.js';
export declare class CreateUsuarioAdminDto {
    nombre: string;
    usuario: string;
    password: string;
    rol: RolUsuario;
}
