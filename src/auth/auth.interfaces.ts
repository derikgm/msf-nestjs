import type { RolUsuario } from './entities/index.js';

/** Claims que viajan dentro del token. */
export interface AuthUser {
  /** id del usuario (claim `sub`). */
  sub: string;
  usuario: string;
  rol: RolUsuario;
}

export interface RequestConUsuario {
  user?: AuthUser;
}
