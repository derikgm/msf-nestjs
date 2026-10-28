<<<<<<< HEAD
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
=======
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
>>>>>>> 43cf044449fb9ac857216ec0873e0285760ccb13

/**
 * Alta de una sección del catálogo, desde el panel del negocio.
 *
 * El nombre se normaliza a minúsculas en el servicio, para que `Electronico` y
 * `electronico` no sean dos secciones distintas. **`dulces` está prohibido**: es
 * la sección que el sistema gestiona solo para los productos que se dan de alta
 * sin sección (ver `CatalogoService.seccionDulces()`), y permitirla desde el
 * panel mezclaría lo del sistema con lo del usuario.
 *
<<<<<<< HEAD
 * La misma forma sirve para el alta (`POST`) y para el renombrado
 * (`PATCH /adc/secciones/:id`): los dos mandan solo el nombre, pero ahora
 * también admite `parent_id` para crear subcategorías.
=======
 * `padre_id` (subcategorías) es opcional: sin él se crea una categoría
 * principal; con el id de otra sección, una subcategoría. El servicio comprueba
 * que el padre exista, sea del mismo negocio y sea principal (un solo nivel).
>>>>>>> 43cf044449fb9ac857216ec0873e0285760ccb13
 */
export class CreateSeccionDto {
  @IsString({ message: 'El nombre de la sección tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' })
  @MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' })
  nombre: string;

  @IsOptional()
<<<<<<< HEAD
  @Type(() => Number)
  @IsInt({ message: 'parent_id tiene que ser un número entero' })
  @IsPositive({ message: 'parent_id tiene que ser positivo' })
  parent_id?: number | null;
}
=======
  @IsInt({ message: 'La categoría principal tiene que ser un número' })
  @Min(1, { message: 'La categoría principal no es válida' })
  padre_id?: number | null;
}
>>>>>>> 43cf044449fb9ac857216ec0873e0285760ccb13
