import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Alta de una sección del catálogo, desde el panel del negocio.
 *
 * El nombre se normaliza a minúsculas en el servicio, para que `Electronico` y
 * `electronico` no sean dos secciones distintas. **`dulces` está prohibido**: es
 * la sección que el sistema gestiona solo para los productos que se dan de alta
 * sin sección (ver `CatalogoService.seccionDulces()`), y permitirla desde el
 * panel mezclaría lo del sistema con lo del usuario.
 *
 * `padre_id` (subcategorías) es opcional: sin él se crea una categoría
 * principal; con el id de otra sección, una subcategoría. El servicio comprueba
 * que el padre exista, sea del mismo negocio y sea principal (un solo nivel).
 */
export class CreateSeccionDto {
  @IsString({ message: 'El nombre de la sección tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' })
  @MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' })
  nombre: string;

  @IsOptional()
  @IsInt({ message: 'La categoría principal tiene que ser un número' })
  @Min(1, { message: 'La categoría principal no es válida' })
  padre_id?: number | null;
}
