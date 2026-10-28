import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Edición de una sección: renombrarla, moverla de categoría o las dos.
 */
export class UpdateSeccionDto {
  @IsOptional()
  @IsString({ message: 'El nombre de la sección tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' })
  @MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' })
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'parent_id tiene que ser un número entero' })
  @IsPositive({ message: 'parent_id tiene que ser positivo' })
  parent_id?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'padre_id tiene que ser un número entero' })
  @IsPositive({ message: 'padre_id tiene que ser positivo' })
  padre_id?: number | null;
}
