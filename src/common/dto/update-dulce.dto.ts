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
 * Edición parcial de un dulce: se manda solo lo que cambia. Los tres campos son
 * opcionales, pero no pueden faltar los tres: `PATCH` sin nada que cambiar es un
 * error del cliente, no un no-op (lo comprueba `CatalogoService.actualizarDulce()`).
 *
 * La imagen no pasa por aquí. Tiene su propio par de rutas porque va como
 * `multipart/form-data` a Supabase Storage, no en el cuerpo JSON.
 *
 * Los mensajes van en español por la misma razón que en `CreateDulceDto`: el
 * panel los enseña tal cual.
 */
export class UpdateDulceDto {
  @IsOptional()
  @IsString({ message: 'El nombre tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(120, { message: 'El nombre no puede pasar de 120 letras' })
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio tiene que ser un número con hasta dos decimales' },
  )
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio?: number;

  /**
   * Moneda del precio. Opcional: si no se manda, no se toca (sigue la que
   * tuviera). Aquí solo se limita la longitud; la normalización a mayúsculas la
   * hace `CatalogoService.actualizarDulce()`, igual que en el alta.
   */
  @IsOptional()
  @IsString({ message: 'La moneda tiene que ser texto' })
  @MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' })
  moneda?: string;

  /**
   * Sección a la que se mueve el producto: el `id` de la tabla `seccion`. Trata
   * de mover un producto a una sección de otro negocio da `404` (la sección se
   * busca dentro de este negocio, nunca fuera).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La sección tiene que ser un número (el id de la sección)' })
  @IsPositive({ message: 'La sección tiene que ser un id válido' })
  seccion_id?: number;
}