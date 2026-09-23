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
import { IsArray, IsNotEmpty, IsNumber, IsPositive, IsString, Min, ValidateNested, ArrayMinSize, } from 'class-validator';
export class CreateDulceDto {
    id;
    nombre;
    precio;
}
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateDulceDto.prototype, "id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CreateDulceDto.prototype, "nombre", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateDulceDto.prototype, "precio", void 0);
export class CreateEncargoDto {
    dulce;
    cantidad;
}
__decorate([
    ValidateNested(),
    Type(() => CreateDulceDto),
    __metadata("design:type", CreateDulceDto)
], CreateEncargoDto.prototype, "dulce", void 0);
__decorate([
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], CreateEncargoDto.prototype, "cantidad", void 0);
export class CreatePedidoDto {
    encargos;
}
__decorate([
    IsArray(),
    ArrayMinSize(1),
    ValidateNested({ each: true }),
    Type(() => CreateEncargoDto),
    __metadata("design:type", Array)
], CreatePedidoDto.prototype, "encargos", void 0);
//# sourceMappingURL=create-pedido.dto.js.map