var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, } from 'typeorm';
let Seccion = class Seccion {
    id;
    nombre;
    negocio;
    creado_en;
};
__decorate([
    PrimaryGeneratedColumn('increment'),
    __metadata("design:type", Number)
], Seccion.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 60 }),
    __metadata("design:type", String)
], Seccion.prototype, "nombre", void 0);
__decorate([
    Column({ type: 'varchar', length: 16, default: 'delys' }),
    __metadata("design:type", String)
], Seccion.prototype, "negocio", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Seccion.prototype, "creado_en", void 0);
Seccion = __decorate([
    Entity('seccion'),
    Unique(['negocio', 'nombre'])
], Seccion);
export { Seccion };
//# sourceMappingURL=seccion.entity.js.map