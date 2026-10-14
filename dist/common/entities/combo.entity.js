var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, } from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { ComboDulce } from './combo-dulce.entity.js';
let Combo = class Combo {
    id;
    nombre_combo;
    precio;
    moneda;
    imagen_url;
    imagen_bytes;
    dulces;
    creado_en;
};
__decorate([
    PrimaryGeneratedColumn('increment'),
    __metadata("design:type", Number)
], Combo.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], Combo.prototype, "nombre_combo", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        transformer: numericTransformer,
    }),
    __metadata("design:type", Number)
], Combo.prototype, "precio", void 0);
__decorate([
    Column({ type: 'varchar', length: 8, default: 'CUP' }),
    __metadata("design:type", String)
], Combo.prototype, "moneda", void 0);
__decorate([
    Column({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], Combo.prototype, "imagen_url", void 0);
__decorate([
    Column({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Combo.prototype, "imagen_bytes", void 0);
__decorate([
    OneToMany(() => ComboDulce, (dulce) => dulce.combo, { cascade: true }),
    __metadata("design:type", Array)
], Combo.prototype, "dulces", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Combo.prototype, "creado_en", void 0);
Combo = __decorate([
    Entity('delys_combos')
], Combo);
export { Combo };
//# sourceMappingURL=combo.entity.js.map