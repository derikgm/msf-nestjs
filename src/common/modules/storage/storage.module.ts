import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteStorageService } from '../../services/appwrite-storage.service.js';
import { NhostStorageService } from '../../services/nhost-storage.service.js';
import { STORAGE_SERVICE } from '../../services/storage.service.js';
import { SupabaseService } from '../../services/supabase.service.js';

/**
 * Almacenamiento de imágenes del catálogo.
 *
 * Al haber tres proveedores hay que elegir uno al arrancar con `STORAGE_PROVIDER`:
 * sin variable (o con `supabase`) → `SupabaseService`; `nhost` → `NhostStorageService`;
 * `appwrite` → `AppwriteStorageService`. Sin tocar `ImagenService` ni los módulos
 * de negocio:
 *
 * - `STORAGE_PROVIDER=supabase` (o sin definir) → `SupabaseService`.
 * - `STORAGE_PROVIDER=nhost` → `NhostStorageService` (ver `NHOST.md`).
 * - `STORAGE_PROVIDER=appwrite` → `AppwriteStorageService` (ver `APPWRITE.md`).
 *
 * Los tres clientes son perezosos: si faltan claves, el servidor arranca y solo
 * falla la subida de imagen, con un mensaje que dice qué variable falta.
 */
@Module({
  providers: [
    SupabaseService,
    NhostStorageService,
    AppwriteStorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, SupabaseService, NhostStorageService, AppwriteStorageService],
      useFactory: (
        config: ConfigService,
        supabase: SupabaseService,
        nhost: NhostStorageService,
        appwrite: AppwriteStorageService,
      ) => {
        const proveedor = (config.get<string>('STORAGE_PROVIDER') ?? 'supabase')
          .trim()
          .toLowerCase();

        if (proveedor === 'appwrite') return appwrite;
        if (proveedor === 'nhost') return nhost;

        return supabase;
      },
    },
  ],
  exports: [STORAGE_SERVICE, SupabaseService, NhostStorageService, AppwriteStorageService],
})
export class StorageModule {}
