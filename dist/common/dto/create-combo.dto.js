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
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested, } from 'class-validator';
export class DulceComboDto {
    nombre_dulce;
    cantidad;
}
__decorate([
    IsString({ message: 'El nombre del dulce tiene que ser texto' }),
    IsNotEmpty({ message: 'El nombre del dulce no puede estar vacío' }),
    MaxLength(120, { message: 'El nombre del dulce no puede pasar de 120 letras' }),
    __metadata("design:type", String)
], DulceComboDto.prototype, "nombre_dulce", void 0);
__decorate([
    Type(() => Number),
    IsInt({ message: 'La cantidad tiene que ser un número entero' }),
    Min(1, { message: 'La cantidad tiene que ser 1 o más' }),
    __metadata("design:type", Number)
], DulceComboDto.prototype, "cantidad", void 0);
export class CreateComboDto {
    nombre_combo;
    precio;
    moneda;
    dulces;
}
__decorate([
    IsString({ message: 'El nombre del combo tiene que ser texto' }),
    IsNotEmpty({ message: 'El nombre del combo no puede estar vacío' }),
    MaxLength(120, { message: 'El nombre del combo no puede pasar de 120 letras' }),
    __metadata("design:type", String)
], CreateComboDto.prototype, "nombre_combo", void 0);
__decorate([
    Type(() => Number),
    IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio tiene que ser un número con hasta dos decimales' }),
    Min(0, { message: 'El precio no puede ser negativo' }),
    __metadata("design:type", Number)
], CreateComboDto.prototype, "precio", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'La moneda tiene que ser texto' }),
    MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' }),
    __metadata("design:type", String)
], CreateComboDto.prototype, "moneda", void 0);
__decorate([
    IsOptional(),
    IsArray({ message: 'Los dulces tienen que ser una lista' }),
    ValidateNested({ each: true }),
    Type(() => DulceComboDto),
    __metadata("design:type", Array)
], CreateComboDto.prototype, "dulces", void 0);
//# sourceMappingURL=create-combo.dto.js.map