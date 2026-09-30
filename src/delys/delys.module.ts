import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DelysService } from './delys.service.js';
import { DulceImagenService } from './dulce-imagen.service.js';
import { DelysController } from './delys.controller.js';
import { entities } from './entities/index.js';
import { StorageQuotaModule } from '../common/modules/storage-quota/storage-quota.module.js';
import { SupabaseModule } from '../common/modules/supabase/supabase.module.js';

@Module({
  imports: [TypeOrmModule.forFeature(entities), StorageQuotaModule, SupabaseModule],
  controllers: [DelysController],
  providers: [DelysService, DulceImagenService],
})
export class DelysModule {}
