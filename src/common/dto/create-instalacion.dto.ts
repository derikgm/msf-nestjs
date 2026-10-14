import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Alta de una instalación de ADC (punto 3 de todo.md), desde su panel.
 *
 * Los mensajes van en español a propósito: el panel los enseña tal cual y
 * `class-validator` responde en inglés por defecto.
 */
export class CreateInstalacionDto {
  @IsString({ message: 'El nombre del servicio tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre del servicio no puede estar vacío' })
  @MaxLength(120, { message: 'El nombre del servicio no puede pasar de 120 letras' })
  nombre_servicio: string;

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
   * Líneas de la descripción. Opcional: sin ella, la instalación queda con la
   * lista vacía. El servicio limpia líneas en blanco y espacios sobrantes.
   */
  @IsOptional()
  @IsArray({ message: 'La descripción tiene que ser una lista de textos' })
  @IsString({ each: true, message: 'Cada línea de la descripción tiene que ser texto' })
  @MaxLength(300, {
    each: true,
    message: 'Cada línea de la descripción no puede pasar de 300 letras',
  })
  descripcion?: string[];
}
