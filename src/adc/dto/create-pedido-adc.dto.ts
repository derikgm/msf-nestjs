import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsFechaDeEntrega } from '../../common/utils/fecha.util.js';

/**
 * Altas de pedido de ADC.
 *
 * Es la misma forma que `CreatePedidoDto`, con **un solo cambio**: el renglón se
 * llama `producto` y no `dulce`, que es como el enunciado dibuja `AdcEncargo`.
 * La traducción es de nombre, no de lógica: el controlador convierte `producto`
 * a `dulce` y llama al mismo `DelysService.crearPedido()`, así que los precios
 * siguen saliendo del servidor y las dos rutas no se pueden descuadrar.
 */
export class CreateEncargoAdcDto {
  /**
   * Solo el id del catálogo, tal como lo pide `AdcEncargo.producto`. El nombre y
   * el precio los pone el servidor leyéndolos de la tabla: si el cliente los
   * pudiera mandar, podría rebajar el pedido o inventarse productos.
   */
  @IsInt()
  @IsPositive()
  producto: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreatePedidoAdcDto {
  /** Dónde se entrega el pedido. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  direccion: string;

  /** Teléfono de contacto para la entrega. */
  @IsString()
  @IsNotEmpty()
  @MinLength(7, { message: 'El teléfono debe tener al menos 7 caracteres' })
  @MaxLength(40)
  telefono: string;

  /** Día de la entrega, en `YYYY-MM-DD`; no se acepta una fecha anterior a hoy. */
  @IsFechaDeEntrega()
  fecha: string;

  /** Indicaciones del pedido. Opcional: la base de datos lo admite como null. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEncargoAdcDto)
  encargos: CreateEncargoAdcDto[];
}
