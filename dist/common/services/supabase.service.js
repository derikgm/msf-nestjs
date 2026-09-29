var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { crearSupabaseClient } from '../providers/supabase.provider.js';
let SupabaseService = class SupabaseService {
    config;
    cliente;
    constructor(config) {
        this.config = config;
    }
    getClient() {
        return (this.cliente ??= crearSupabaseClient(this.config));
    }
    async subir(bucket, path, contenido, contentType) {
        const { error } = await this.getClient()
            .storage.from(bucket)
            .upload(path, contenido, { contentType, upsert: false });
        if (error) {
            throw new Error(`Supabase Storage rechazó la subida: ${error.message}`);
        }
        return path;
    }
    async eliminar(bucket, paths) {
        if (!paths.length)
            return;
        const { error } = await this.getClient().storage.from(bucket).remove(paths);
        if (error) {
            throw new Error(`Supabase Storage no pudo borrar: ${error.message}`);
        }
    }
    getPublicUrl(bucket, path) {
        return this.getClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    pathDesdeUrl(bucket, url) {
        const marca = `/object/public/${bucket}/`;
        const indice = url.indexOf(marca);
        if (indice === -1)
            return undefined;
        return decodeURIComponent(url.slice(indice + marca.length));
    }
};
SupabaseService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], SupabaseService);
export { SupabaseService };
//# sourceMappingURL=supabase.service.js.map