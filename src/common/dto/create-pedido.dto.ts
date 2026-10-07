import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { IsFechaDeEntrega } from '../utils/fecha.util.js';

export class CreateEncargoDto {
  /**
   * Solo el id del catálogo. El nombre y el precio los pone el servidor leyéndolos
   * de la tabla `dulce`: si el cliente los pudiera mandar, podría rebajar el
   * pedido, renombrar dulces o inventarse los que no existen.
   */
  @IsInt()
  @IsPositive()
  dulce: number;

  /**
   * `numeric(12,2)`: sin cota, un `cantidad: 10**12` desbordaba la columna y el
   * error salía como 500 desde una ruta pública (N-11).
   */
  @IsInt()
  @Min(1)
  @Max(999)
  cantidad: number;
}

//Un pedido no es mas que la suma de varios encargos
export class CreatePedidoDto {
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

  /**
   * Día de la entrega, en `YYYY-MM-DD`. No se acepta una fecha anterior a hoy:
   * un pedido para ayer ya no se puede hacer.
   */
  @IsFechaDeEntrega()
  fecha: string;

  /** Indicaciones del pedido. Opcional: la base de datos lo admite como null. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;

  /**
   * Máximo de renglones por pedido: en `POST /delys/pedido` (ruta pública) un
   * body con miles de encargos obligaba al servidor a procesarlo entero antes
   * de fallar (N-11). El límite es generoso de sobra para un pedido real.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateEncargoDto)
  encargos: CreateEncargoDto[];
}