var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, } from 'typeorm';
export const ROLES = ['delys', 'domus', 'adc', 'admin'];
export const ROL_SUPERUSUARIO = 'admin';
let Usuario = class Usuario {
    id;
    nombre;
    usuario;
    password_hash;
    rol;
    activo;
    creado_en;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Usuario.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], Usuario.prototype, "nombre", void 0);
__decorate([
    Column({ type: 'varchar', length: 60, unique: true }),
    __metadata("design:type", String)
], Usuario.prototype, "usuario", void 0);
__decorate([
    Column({ type: 'varchar', length: 200, select: false }),
    __metadata("design:type", String)
], Usuario.prototype, "password_hash", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, default: 'delys' }),
    __metadata("design:type", String)
], Usuario.prototype, "rol", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Usuario.prototype, "activo", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Usuario.prototype, "creado_en", void 0);
Usuario = __decorate([
    Entity('usuario')
], Usuario);
export { Usuario };
//# sourceMappingURL=usuario.entity.js.map