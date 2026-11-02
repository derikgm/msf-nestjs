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
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, } from 'class-validator';
export class CreateModeloDto {
    nombre;
    precio;
    moneda;
    atributos;
}
__decorate([
    IsString({ message: 'El nombre del modelo tiene que ser texto' }),
    IsNotEmpty({ message: 'El nombre del modelo no puede estar vacío' }),
    MaxLength(120, { message: 'El nombre del modelo no puede pasar de 120 letras' }),
    __metadata("design:type", String)
], CreateModeloDto.prototype, "nombre", void 0);
__decorate([
    Type(() => Number),
    IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio tiene que ser un número con hasta dos decimales' }),
    Min(0, { message: 'El precio no puede ser negativo' }),
    __metadata("design:type", Number)
], CreateModeloDto.prototype, "precio", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'La moneda tiene que ser texto' }),
    MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' }),
    __metadata("design:type", String)
], CreateModeloDto.prototype, "moneda", void 0);
__decorate([
    IsOptional(),
    IsObject({ message: 'Las características tienen que ser un objeto de "nombre": "valor"' }),
    __metadata("design:type", Object)
], CreateModeloDto.prototype, "atributos", void 0);
//# sourceMappingURL=create-modelo.dto.js.map