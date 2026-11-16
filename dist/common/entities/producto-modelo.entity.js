var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, } from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
import { Dulce } from './dulce.entity.js';
let ProductoModelo = class ProductoModelo {
    id;
    producto_id;
    producto;
    nombre;
    precio;
    moneda;
    imagen_url;
    imagen_bytes;
    atributos;
    creado_en;
};
__decorate([
    PrimaryGeneratedColumn('increment'),
    __metadata("design:type", Number)
], ProductoModelo.prototype, "id", void 0);
__decorate([
    Column({ type: 'int', name: 'producto_id' }),
    __metadata("design:type", Number)
], ProductoModelo.prototype, "producto_id", void 0);
__decorate([
    ManyToOne(() => Dulce, { nullable: false, onDelete: 'CASCADE' }),
    JoinColumn({ name: 'producto_id' }),
    __metadata("design:type", Dulce)
], ProductoModelo.prototype, "producto", void 0);
__decorate([
    Column({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], ProductoModelo.prototype, "nombre", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        transformer: numericTransformer,
    }),
    __metadata("design:type", Number)
], ProductoModelo.prototype, "precio", void 0);
__decorate([
    Column({ type: 'varchar', length: 8, default: 'CUP' }),
    __metadata("design:type", String)
], ProductoModelo.prototype, "moneda", void 0);
__decorate([
    Column({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], ProductoModelo.prototype, "imagen_url", void 0);
__decorate([
    Column({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], ProductoModelo.prototype, "imagen_bytes", void 0);
__decorate([
    Column({ type: 'jsonb', default: () => "'{}'" }),
    __metadata("design:type", Object)
], ProductoModelo.prototype, "atributos", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ProductoModelo.prototype, "creado_en", void 0);
ProductoModelo = __decorate([
    Entity('producto_modelo'),
    Unique(['producto_id', 'nombre'])
], ProductoModelo);
export { ProductoModelo };
//# sourceMappingURL=producto-modelo.entity.js.map