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
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min, } from 'class-validator';
export class UpdateDulceDto {
    nombre;
    precio;
    moneda;
    seccion_id;
}
__decorate([
    IsOptional(),
    IsString({ message: 'El nombre tiene que ser texto' }),
    IsNotEmpty({ message: 'El nombre no puede estar vacío' }),
    MaxLength(120, { message: 'El nombre no puede pasar de 120 letras' }),
    __metadata("design:type", String)
], UpdateDulceDto.prototype, "nombre", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio tiene que ser un número con hasta dos decimales' }),
    Min(0, { message: 'El precio no puede ser negativo' }),
    __metadata("design:type", Number)
], UpdateDulceDto.prototype, "precio", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'La moneda tiene que ser texto' }),
    MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' }),
    __metadata("design:type", String)
], UpdateDulceDto.prototype, "moneda", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'La sección tiene que ser un número (el id de la sección)' }),
    IsPositive({ message: 'La sección tiene que ser un id válido' }),
    __metadata("design:type", Number)
], UpdateDulceDto.prototype, "seccion_id", void 0);
//# sourceMappingURL=update-dulce.dto.js.map