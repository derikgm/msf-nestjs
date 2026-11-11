import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NhostStorageService } from '../../services/nhost-storage.service.js';
import { STORAGE_SERVICE } from '../../services/storage.service.js';
import { SupabaseService } from '../../services/supabase.service.js';

/**
 * Almacenamiento de imágenes del catálogo.
 *
 * Hasta ahora el único proveedor era Supabase Storage. Con `STORAGE_PROVIDER`
 * se elige al arrancar entre ese y Nhost, sin tocar `ImagenService` ni los
 * módulos de negocio:
 *
 * - `STORAGE_PROVIDER=supabase` (o sin definir) → `SupabaseService`.
 * - `STORAGE_PROVIDER=nhost` → `NhostStorageService` (ver `NHOST.md`).
 *
 * Los dos clientes son perezosos: si faltan claves, el servidor arranca y solo
 * falla la subida de imagen, con un mensaje que dice qué variable falta.
 */
@Module({
  providers: [
    SupabaseService,
    NhostStorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, SupabaseService, NhostStorageService],
      useFactory: (
        config: ConfigService,
        supabase: SupabaseService,
        nhost: NhostStorageService,
      ) => {
        const proveedor = (config.get<string>('STORAGE_PROVIDER') ?? 'supabase')
          .trim()
          .toLowerCase();

        return proveedor === 'nhost' ? nhost : supabase;
      },
    },
  ],
  exports: [STORAGE_SERVICE, SupabaseService, NhostStorageService],
})
export class StorageModule {}
