import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NEGOCIO } from '../delys/negocio.config.js';
import { DelysService } from '../delys/delys.service.js';
import { DulceImagenService } from '../delys/dulce-imagen.service.js';
import { entities } from '../delys/entities/index.js';
import { StorageQuotaModule } from '../common/modules/storage-quota/storage-quota.module.js';
import { SupabaseModule } from '../common/modules/supabase/supabase.module.js';
import { AdcController } from './adc.controller.js';
import { CONFIG_ADC } from './adc.config.js';

/**
 * Módulo de ADC. Da servicio con **su propia instancia** de `DelysService` y de
 * `DulceImagenService`, cada una con la configuración de su negocio.
 *
 * Por eso **no** importa `DelysModule`: si lo hiciera, inyectaría el servicio
 * de Delys y todas sus consultas filtrarían por `negocio = 'delys'`, con lo
 * que ADC no vería ni un producto. Al proveer el servicio aquí, NestJS crea otra
 * instancia, inyecta `CONFIG_ADC` y las tablas quedan separadas por la columna
 * `negocio` (punto 6), sin duplicar tablas ni lógica.
 */
@Module({
  imports: [TypeOrmModule.forFeature(entities), StorageQuotaModule, SupabaseModule],
  controllers: [AdcController],
  providers: [{ provide: NEGOCIO, useValue: CONFIG_ADC }, DelysService, DulceImagenService],
})
export class AdcModule {}
