var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NhostStorageService } from '../../services/nhost-storage.service.js';
import { STORAGE_SERVICE } from '../../services/storage.service.js';
import { SupabaseService } from '../../services/supabase.service.js';
let StorageModule = class StorageModule {
};
StorageModule = __decorate([
    Module({
        providers: [
            SupabaseService,
            NhostStorageService,
            {
                provide: STORAGE_SERVICE,
                inject: [ConfigService, SupabaseService, NhostStorageService],
                useFactory: (config, supabase, nhost) => {
                    const proveedor = (config.get('STORAGE_PROVIDER') ?? 'supabase')
                        .trim()
                        .toLowerCase();
                    return proveedor === 'nhost' ? nhost : supabase;
                },
            },
        ],
        exports: [STORAGE_SERVICE, SupabaseService, NhostStorageService],
    })
], StorageModule);
export { StorageModule };
//# sourceMappingURL=storage.module.js.map