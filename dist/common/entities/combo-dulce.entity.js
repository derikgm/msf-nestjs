var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, } from 'typeorm';
import { Combo } from './combo.entity.js';
let ComboDulce = class ComboDulce {
    id;
    nombre_dulce;
    cantidad;
    combo;
};
__decorate([
    PrimaryGeneratedColumn('increment'),
    __metadata("design:type", Number)
], ComboDulce.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], ComboDulce.prototype, "nombre_dulce", void 0);
__decorate([
    Column({ type: 'int' }),
    __metadata("design:type", Number)
], ComboDulce.prototype, "cantidad", void 0);
__decorate([
    ManyToOne(() => Combo, (combo) => combo.dulces, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'combo_id' }),
    __metadata("design:type", Combo)
], ComboDulce.prototype, "combo", void 0);
ComboDulce = __decorate([
    Entity('delys_combo_dulces')
], ComboDulce);
export { ComboDulce };
//# sourceMappingURL=combo-dulce.entity.js.map