var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer.js';
let Dulce = class Dulce {
    id;
    nombre;
    precio;
};
__decorate([
    PrimaryColumn({ type: 'int' }),
    __metadata("design:type", Number)
], Dulce.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], Dulce.prototype, "nombre", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        transformer: numericTransformer,
    }),
    __metadata("design:type", Number)
], Dulce.prototype, "precio", void 0);
Dulce = __decorate([
    Entity('dulce')
], Dulce);
export { Dulce };
//# sourceMappingURL=dulce.entity.js.map