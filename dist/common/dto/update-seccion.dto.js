var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
export class UpdateSeccionDto {
    nombre;
    parent_id;
    padre_id;
}
__decorate([
    IsOptional(),
    IsString({ message: 'El nombre de la sección tiene que ser texto' }),
    IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' }),
    MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' }),
    __metadata("design:type", String)
], UpdateSeccionDto.prototype, "nombre", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'parent_id tiene que ser un número entero' }),
    IsPositive({ message: 'parent_id tiene que ser positivo' }),
    __metadata("design:type", Object)
], UpdateSeccionDto.prototype, "parent_id", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'padre_id tiene que ser un número entero' }),
    IsPositive({ message: 'padre_id tiene que ser positivo' }),
    __metadata("design:type", Object)
], UpdateSeccionDto.prototype, "padre_id", void 0);
//# sourceMappingURL=update-seccion.dto.js.map