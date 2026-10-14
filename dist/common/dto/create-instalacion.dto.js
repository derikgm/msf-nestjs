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
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, } from 'class-validator';
export class CreateInstalacionDto {
    nombre_servicio;
    precio;
    moneda;
    descripcion;
}
__decorate([
    IsString({ message: 'El nombre del servicio tiene que ser texto' }),
    IsNotEmpty({ message: 'El nombre del servicio no puede estar vacío' }),
    MaxLength(120, { message: 'El nombre del servicio no puede pasar de 120 letras' }),
    __metadata("design:type", String)
], CreateInstalacionDto.prototype, "nombre_servicio", void 0);
__decorate([
    Type(() => Number),
    IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio tiene que ser un número con hasta dos decimales' }),
    Min(0, { message: 'El precio no puede ser negativo' }),
    __metadata("design:type", Number)
], CreateInstalacionDto.prototype, "precio", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'La moneda tiene que ser texto' }),
    MaxLength(8, { message: 'La moneda no puede pasar de 8 letras' }),
    __metadata("design:type", String)
], CreateInstalacionDto.prototype, "moneda", void 0);
__decorate([
    IsOptional(),
    IsArray({ message: 'La descripción tiene que ser una lista de textos' }),
    IsString({ each: true, message: 'Cada línea de la descripción tiene que ser texto' }),
    MaxLength(300, {
        each: true,
        message: 'Cada línea de la descripción no puede pasar de 300 letras',
    }),
    __metadata("design:type", Array)
], CreateInstalacionDto.prototype, "descripcion", void 0);
//# sourceMappingURL=create-instalacion.dto.js.map