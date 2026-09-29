import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsPositive,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class CreateEncargoDto {
  /**
   * Solo el id del catálogo. El nombre y el precio los pone el servidor leyéndolos
   * de la tabla `dulce`: si el cliente los pudiera mandar, podría rebajar el
   * pedido, renombrar dulces o inventarse los que no existen.
   */
  @IsInt()
  @IsPositive()
  dulce: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CreatePedidoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEncargoDto)
  encargos: CreateEncargoDto[];
}
