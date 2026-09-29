var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageQuota } from '../../entities/storage-quota.entity.js';
import { StorageQuotaService } from '../../services/storage-quota.service.js';
import { StorageQuotaController } from './storage-quota.controller.js';
let StorageQuotaModule = class StorageQuotaModule {
};
StorageQuotaModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature([StorageQuota])],
        controllers: [StorageQuotaController],
        providers: [StorageQuotaService],
        exports: [StorageQuotaService],
    })
], StorageQuotaModule);
export { StorageQuotaModule };
//# sourceMappingURL=storage-quota.module.js.map