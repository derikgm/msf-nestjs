import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Alta de una sección del catálogo, desde el panel del negocio.
 *
 * El nombre se normaliza a minúsculas en el servicio, para que `Electronico` y
 * `electronico` no sean dos secciones distintas. `dulces` no está prohibido,
 * pero es la sección reservada del catálogo heredado: quien la cree verá que
 * las respuestas públicas de ADC la ocultan (ver `AdcController`).
 */
export class CreateSeccionDto {
  @IsString({ message: 'El nombre de la sección tiene que ser texto' })
  @IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' })
  @MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' })
  nombre: string;
}