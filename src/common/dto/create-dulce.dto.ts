import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Alta de un dulce del catálogo, desde el panel de la pastelería.
 *
 * El `id` no se recibe: lo asigna el servidor. La tabla `dulce` usa el id como
 * clave primaria y el catálogo de `data/ofertas.ts` lo define a mano, así que si
 * el cliente lo mandara podría pisar un dulce existente o inventarse uno con el
 * id que quisiera.
 *
 * Los mensajes van en español a propósito: el panel los enseña tal cual, y
 * `class-validator` por defecto responde en inglés.
 */
export class CreateDulceDto {
  @IsString({ message: 'El nombre tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(120, { message: 'El nombre no puede pasar de 120 letras' })
  nombre: string;

  /** Admite decimales: el catálogo los guarda en `numeric(12,2)`. */
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio tiene que ser un número con hasta dos decimales' },
  )
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio: number;

  /**
   * Moneda en la que se lee `precio`. Opcional: si no llega, el servidor deja
   * `CUP`, que es el valor por defecto de la columna.
   *
   * Es **texto y no un enum** a propósito (punto 5 del todo): mañana puede
   * entrar el peso colombiano sin migrar nada. Solo se limita la longitud; la
   * normalización a mayúsculas la hace el servicio.
   */
  @IsOptional()
  @IsString({ message: 'La moneda tiene que ser texto' })
  @MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' })
  moneda?: string;

  /**
   * Sección a la que pertenece: el `id` de la tabla `seccion`. Opcional: si no
   * llega, el servidor lo mete en la sección `dulces` de su negocio (el valor
   * seguro que da cobijo a los productos sin sección).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La sección tiene que ser un número (el id de la sección)' })
  @IsPositive({ message: 'La sección tiene que ser un id válido' })
  seccion_id?: number;
}