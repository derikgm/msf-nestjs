var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DelysController } from './delys.controller.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService } from '../common/services/dulce-imagen.service.js';
import { entities } from '../common/entities/index.js';
import { CONFIG_DELYS, NEGOCIO } from '../common/config/negocio.config.js';
import { StorageQuotaModule } from '../common/modules/storage-quota/storage-quota.module.js';
import { SupabaseModule } from '../common/modules/supabase/supabase.module.js';
let DelysModule = class DelysModule {
};
DelysModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature(entities), StorageQuotaModule, SupabaseModule],
        controllers: [DelysController],
        providers: [
            { provide: NEGOCIO, useValue: CONFIG_DELYS },
            CatalogoService,
            DulceImagenService,
        ],
    })
], DelysModule);
export { DelysModule };
//# sourceMappingURL=delys.module.js.map