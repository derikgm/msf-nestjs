import { type RolUsuario } from '../entities/index.js';
export declare class CreateUsuarioDto {
    nombre: string;
    usuario: string;
    password: string;
    rol?: RolUsuario;
}
