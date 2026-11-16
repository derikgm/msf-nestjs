import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Un renglón del combo: el nombre del dulce y cuántas unidades lleva.
 *
 * El nombre es libre a propósito (punto 3): puede ser un dulce que ya existe en
 * el catálogo o uno escrito a mano en el panel que no se da de alta.
 */
export class DulceComboDto {
  @IsString({ message: 'El nombre del dulce tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre del dulce no puede estar vacío' })
  @MaxLength(120, { message: 'El nombre del dulce no puede pasar de 120 letras' })
  nombre_dulce: string;

  @Type(() => Number)
  @IsInt({ message: 'La cantidad tiene que ser un número entero' })
  @Min(1, { message: 'La cantidad tiene que ser 1 o más' })
  cantidad: number;
}

/**
 * Alta de un combo de Delys (punto 3 de todo.md), desde su panel.
 *
 * Los mensajes van en español a propósito: el panel los enseña tal cual.
 */
export class CreateComboDto {
  @IsString({ message: 'El nombre del combo tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre del combo no puede estar vacío' })
  @MaxLength(120, { message: 'El nombre del combo no puede pasar de 120 letras' })
  nombre_combo: string;

  /** Admite decimales: la tabla lo guarda en `numeric(12,2)`. */
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio tiene que ser un número con hasta dos decimales' },
  )
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio: number;

  /** Si no llega, el servicio deja `CUP`, el valor por defecto de la columna. */
  @IsOptional()
  @IsString({ message: 'La moneda tiene que ser texto' })
  @MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' })
  moneda?: string;

  /**
   * Dulces que componen el combo. Opcional: un combo puede crearse vacío y
   * llenarse después. `@Type` es obligatorio para que el pipe global construya
   * cada renglón como `DulceComboDto` y valide sus campos (si no, con
   * `whitelist` los renglones llegarían como objetos sueltos sin comprobar).
   */
  @IsOptional()
  @IsArray({ message: 'Los dulces tienen que ser una lista' })
  @ValidateNested({ each: true })
  @Type(() => DulceComboDto)
  dulces?: DulceComboDto[];
}
