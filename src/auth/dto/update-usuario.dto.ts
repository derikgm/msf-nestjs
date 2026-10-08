import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { ROLES, type RolUsuario } from '../entities/index.js';

export class UpdateUsuarioDto {
  /** Nuevo rol del usuario (admin puede reasignar entre proyectos). */
  @IsOptional()
  @IsIn(ROLES)
  rol?: RolUsuario;

  /** Activar o desactivar el acceso del usuario sin borrarlo. */
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
