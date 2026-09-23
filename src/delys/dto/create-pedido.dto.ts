import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class CreateDulceDto {
  @IsNumber()
  @IsPositive()
  id: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @IsPositive()
  precio: number;
}

export class CreateEncargoDto {
  @ValidateNested()
  @Type(() => CreateDulceDto)
  dulce: CreateDulceDto;

  @IsNumber()
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