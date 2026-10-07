import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Alta de una sección del catálogo, desde el panel del negocio.
 *
 * El nombre se normaliza a minúsculas en el servicio, para que `Electronico` y
 * `electronico` no sean dos secciones distintas. **`dulces` está prohibido**: es
 * la sección que el sistema gestiona solo para los productos que se dan de alta
 * sin sección (ver `CatalogoService.seccionDulces()`), y permitirla desde el
 * panel mezclaría lo del sistema con lo del usuario.
 *
 * La misma forma sirve para el alta (`POST`) y para el renombrado
 * (`PATCH /adc/secciones/:id`): los dos mandan solo el nombre.
 */
export class CreateSeccionDto {
  @IsString({ message: 'El nombre de la sección tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' })
  @MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' })
  nombre: string;
}