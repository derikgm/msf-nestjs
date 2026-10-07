import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLES, type RolUsuario } from '../entities/index.js';

/**
 * Alta de un usuario por un administrador. A diferencia de `CreateUsuarioDto`,
 * aquí `rol` es **obligatorio**: es justo lo que esta ruta permite elegir (un
 * token normal no puede asignar proyectos ajenos; el admin administra la
 * plataforma y sí puede ubicar a cada usuario en su proyecto).
 */
export class CreateUsuarioAdminDto {
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

  /** El rol se lo elige el administrador: cualquier proyecto o el propio admin. */
  @IsIn(ROLES)
  rol: RolUsuario;
}