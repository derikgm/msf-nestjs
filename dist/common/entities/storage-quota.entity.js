var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
import { numericTransformer } from '../utils/numeric.transformer.js';
export const LIMITE_BYTES_POR_DEFECTO = 20 * 1024 * 1024;
let StorageQuota = class StorageQuota {
    id;
    rol;
    bytes_usados;
    limite_bytes;
    created_at;
    updated_at;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], StorageQuota.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], StorageQuota.prototype, "rol", void 0);
__decorate([
    Column({ type: 'bigint', default: 0, transformer: numericTransformer }),
    __metadata("design:type", Number)
], StorageQuota.prototype, "bytes_usados", void 0);
__decorate([
    Column({
        type: 'bigint',
        default: LIMITE_BYTES_POR_DEFECTO,
        transformer: numericTransformer,
    }),
    __metadata("design:type", Number)
], StorageQuota.prototype, "limite_bytes", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], StorageQuota.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], StorageQuota.prototype, "updated_at", void 0);
StorageQuota = __decorate([
    Entity('storage_quota')
], StorageQuota);
export { StorageQuota };
//# sourceMappingURL=storage-quota.entity.js.map