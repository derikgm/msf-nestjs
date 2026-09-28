var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../common/utils/numeric.transformer.js';
let Pedido = class Pedido {
    id;
    precio_total;
    encargos;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Pedido.prototype, "id", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        transformer: numericTransformer,
    }),
    __metadata("design:type", Number)
], Pedido.prototype, "precio_total", void 0);
__decorate([
    OneToMany('Encargo', (encargo) => encargo.pedido, { cascade: true }),
    __metadata("design:type", Array)
], Pedido.prototype, "encargos", void 0);
Pedido = __decorate([
    Entity('pedido')
], Pedido);
export { Pedido };
//# sourceMappingURL=pedido.entity.js.map