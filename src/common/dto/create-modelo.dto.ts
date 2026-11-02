import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Alta de un **modelo** de una publicación (los «240 L / 340 L / 420 L» de la
 * misma nevera), desde el panel de ADC.
 *
 * El `id` y el `producto_id` no se reciben: el id lo asigna el servidor y la
 * publicación va en la URL (`POST /adc/productos/:id/modelos`). Si el cliente
 * pudiera mandar `producto_id` a voluntad, podría colgarle un modelo a la
 * publicación de otro (o de otro negocio).
 *
 * `atributos` es la ficha técnica como pares `etiqueta: valor`
 * (`{ "Peso": "38 kg" }`). Aquí solo se comprueba que sea un objeto; el
 * contenido lo revisa `ModelosService`, que es donde se puede decir qué
 * característica estorba con un mensaje en español.
 *
 * Los mensajes van en español a propósito: el panel los enseña tal cual y
 * `class-validator` responde en inglés por defecto.
 */
export class CreateModeloDto {
  @IsString({ message: 'El nombre del modelo tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre del modelo no puede estar vacío' })
  @MaxLength(120, { message: 'El nombre del modelo no puede pasar de 120 letras' })
  nombre: string;

  /** Admite decimales: la tabla lo guarda en `numeric(12,2)`, igual que el producto. */
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio tiene que ser un número con hasta dos decimales' },
  )
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio: number;

  /**
   * Moneda del precio del modelo. Opcional: si no llega queda `CUP`. Puede ser
   * distinta a la de la publicación (una misma nevera en CUP y en USD, por
   * ejemplo), así que se guarda por modelo y no se hereda.
   */
  @IsOptional()
  @IsString({ message: 'La moneda tiene que ser texto' })
  @MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' })
  moneda?: string;

  /** Ficha técnica del modelo; sin ella el modelo queda con la lista vacía. */
  @IsOptional()
  @IsObject({ message: 'Las características tienen que ser un objeto de "nombre": "valor"' })
  atributos?: Record<string, unknown>;
}
