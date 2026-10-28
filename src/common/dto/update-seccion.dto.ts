import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Edición de una sección de ADC: renombrarla, moverla de categoría o las dos.
 *
 * Los dos campos son opcionales para que el panel mande solo lo que cambia.
 * `padre_id: null` **mueve la sección a principal** (es distinto de no
 * mandarlo). Si no llega ninguno, el servicio responde `400`.
 */
export class UpdateSeccionDto {
  @IsOptional()
  @IsString({ message: 'El nombre de la sección tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' })
  @MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' })
  nombre?: string;

  @IsOptional()
  @IsInt({ message: 'La categoría principal tiene que ser un número' })
  @Min(1, { message: 'La categoría principal no es válida' })
  padre_id?: number | null;
}
