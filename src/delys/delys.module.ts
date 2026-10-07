import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DelysController } from './delys.controller.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService } from '../common/services/dulce-imagen.service.js';
import { entities } from '../common/entities/index.js';
import { CONFIG_DELYS, NEGOCIO } from '../common/config/negocio.config.js';
import { StorageQuotaModule } from '../common/modules/storage-quota/storage-quota.module.js';
import { SupabaseModule } from '../common/modules/supabase/supabase.module.js';

@Module({
  imports: [TypeOrmModule.forFeature(entities), StorageQuotaModule, SupabaseModule],
  controllers: [DelysController],
  providers: [
    { provide: NEGOCIO, useValue: CONFIG_DELYS },
    CatalogoService,
    DulceImagenService,
  ],
})
export class DelysModule {}
