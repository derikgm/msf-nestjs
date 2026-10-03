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
import { Dulce } from './dulce.entity.js';
import { Pedido } from './pedido.entity.js';
let Encargo = class Encargo {
    id;
    dulce;
    cantidad;
    pedido;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Encargo.prototype, "id", void 0);
__decorate([
    ManyToOne(() => Dulce, { onDelete: 'RESTRICT', nullable: false }),
    JoinColumn({ name: 'dulce_id' }),
    __metadata("design:type", Dulce)
], Encargo.prototype, "dulce", void 0);
__decorate([
    Column({ type: 'int' }),
    __metadata("design:type", Number)
], Encargo.prototype, "cantidad", void 0);
__decorate([
    ManyToOne(() => Pedido, { onDelete: 'CASCADE', nullable: false }),
    JoinColumn({ name: 'pedido_id' }),
    __metadata("design:type", Pedido)
], Encargo.prototype, "pedido", void 0);
Encargo = __decorate([
    Entity('encargo')
], Encargo);
export { Encargo };
//# sourceMappingURL=encargo.entity.js.map