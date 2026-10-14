var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class CreateSeccionDto {
    nombre;
}
__decorate([
    IsString({ message: 'El nombre de la sección tiene que ser texto' }),
    IsNotEmpty({ message: 'El nombre de la sección no puede estar vacío' }),
    MaxLength(60, { message: 'El nombre de la sección no puede pasar de 60 letras' }),
    __metadata("design:type", String)
], CreateSeccionDto.prototype, "nombre", void 0);
//# sourceMappingURL=create-seccion.dto.js.map