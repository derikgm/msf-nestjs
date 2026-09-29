import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLES, type RolUsuario } from '../entities/index.js';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  usuario: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(200)
  password: string;

  /** Solo aplica en el alta inicial de un rol; después manda el rol de quien lo crea. */
  @IsOptional()
  @IsIn(ROLES)
  rol?: RolUsuario;
}
