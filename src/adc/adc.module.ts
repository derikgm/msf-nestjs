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

/**
 * Módulo de ADC. Da servicio con **su propia instancia** de `CatalogoService` y
 * de `DulceImagenService`, cada una con la configuración de su negocio.
 *
 * Como la clase de servicio es compartida (el catálogo comparte tabla y lógica
 * con Delys), el módulo **no** importa `DelysModule`: si lo hiciera, inyectaría
 * el servicio de Delys y todas sus consultas filtrarían por `negocio = 'delys'`,
 * con lo que ADC no vería ni un producto. Al proveer aquí su propia instancia con
 * `CONFIG_ADC`, NestJS monta otro `CatalogoService`, inyecta esa configuración y
 * las tablas quedan separadas por la columna `negocio` (punto 6), sin duplicar
 * tablas ni lógica.
 */
@Module({
  imports: [TypeOrmModule.forFeature(entities), StorageQuotaModule, SupabaseModule],
  controllers: [AdcController],
  providers: [
    { provide: NEGOCIO, useValue: CONFIG_ADC },
    CatalogoService,
    DulceImagenService,
  ],
})
export class AdcModule {}
