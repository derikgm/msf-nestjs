var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NEGOCIO } from '../common/config/negocio.config.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService } from '../common/services/dulce-imagen.service.js';
import { entities } from '../common/entities/index.js';
import { StorageQuotaModule } from '../common/modules/storage-quota/storage-quota.module.js';
import { SupabaseModule } from '../common/modules/supabase/supabase.module.js';
import { AdcController } from './adc.controller.js';
import { CONFIG_ADC } from './adc.config.js';
let AdcModule = class AdcModule {
};
AdcModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature(entities), StorageQuotaModule, SupabaseModule],
        controllers: [AdcController],
        providers: [
            { provide: NEGOCIO, useValue: CONFIG_ADC },
            CatalogoService,
            DulceImagenService,
        ],
    })
], AdcModule);
export { AdcModule };
//# sourceMappingURL=adc.module.js.map