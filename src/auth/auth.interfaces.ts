import type { RolUsuario } from './entities/index.js';

/** Claims que viajan dentro del token. */
export interface AuthUser {
  /** id del usuario (claim `sub`). */
  sub: string;
  usuario: string;
  /** El proyecto al que pertenece: es el rol que comparte cuota de almacenamiento. */
  rol: RolUsuario;
}

export interface RequestConUsuario {
  headers?: { authorization?: string };
  user?: AuthUser;
}
