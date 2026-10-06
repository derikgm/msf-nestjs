export declare const ROLES: readonly ["delys", "domus", "adc", "admin"];
export type RolUsuario = (typeof ROLES)[number];
export declare const ROL_SUPERUSUARIO: RolUsuario;
export declare class Usuario {
    id: string;
    nombre: string;
    usuario: string;
    password_hash: string;
    rol: RolUsuario;
    activo: boolean;
    creado_en: Date;
}
