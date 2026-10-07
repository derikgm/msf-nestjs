var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Max, MaxLength, Min, MinLength, ValidateNested, ArrayMaxSize, ArrayMinSize, } from 'class-validator';
import { IsFechaDeEntrega } from '../utils/fecha.util.js';
export class CreateEncargoDto {
    dulce;
    cantidad;
}
__decorate([
    IsInt(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateEncargoDto.prototype, "dulce", void 0);
__decorate([
    IsInt(),
    Min(1),
    Max(999),
    __metadata("design:type", Number)
], CreateEncargoDto.prototype, "cantidad", void 0);
export class CreatePedidoDto {
    direccion;
    telefono;
    fecha;
    notas;
    encargos;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(300),
    __metadata("design:type", String)
], CreatePedidoDto.prototype, "direccion", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    MinLength(7, { message: 'El teléfono debe tener al menos 7 caracteres' }),
    MaxLength(40),
    __metadata("design:type", String)
], CreatePedidoDto.prototype, "telefono", void 0);
__decorate([
    IsFechaDeEntrega(),
    __metadata("design:type", String)
], CreatePedidoDto.prototype, "fecha", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(1000),
    __metadata("design:type", String)
], CreatePedidoDto.prototype, "notas", void 0);
__decorate([
    IsArray(),
    ArrayMinSize(1),
    ArrayMaxSize(50),
    ValidateNested({ each: true }),
    Type(() => CreateEncargoDto),
    __metadata("design:type", Array)
], CreatePedidoDto.prototype, "encargos", void 0);
//# sourceMappingURL=create-pedido.dto.js.map