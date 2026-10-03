import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Edición parcial de un dulce: se manda solo lo que cambia. Los dos campos son
 * opcionales, pero no pueden faltar los dos: `PATCH` sin nada que cambiar es un
 * error del cliente, no un no-op (lo comprueba `DelysService.actualizarDulce()`).
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
}