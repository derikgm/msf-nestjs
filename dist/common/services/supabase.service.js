var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SupabaseService_1;
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { crearSupabaseClient } from '../providers/supabase.provider.js';
let SupabaseService = SupabaseService_1 = class SupabaseService {
    config;
    logger = new Logger(SupabaseService_1.name);
    cliente;
    constructor(config) {
        this.config = config;
    }
    getClient() {
        return (this.cliente ??= crearSupabaseClient(this.config));
    }
    async subir(bucket, path, contenido, contentType) {
        const error = await this.probarSubida(bucket, path, contenido, contentType);
        if (!error)
            return path;
        if (this.faltaElBucket(error.message)) {
            await this.asegurarBucket(bucket);
            const reintento = await this.probarSubida(bucket, path, contenido, contentType);
            if (!reintento)
                return path;
            throw this.falloDeStorage('subir la imagen', reintento.message);
        }
        throw this.falloDeStorage('subir la imagen', error.message);
    }
    async eliminar(bucket, paths) {
        if (!paths.length)
            return;
        const { error } = await this.getClient().storage.from(bucket).remove(paths);
        if (!error)
            return;
        if (this.faltaElBucket(error.message)) {
            this.logger.warn(`El bucket «${bucket}» no existe: no hay nada que borrar.`);
            return;
        }
        throw this.falloDeStorage('borrar la imagen', error.message);
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
    async probarSubida(bucket, path, contenido, contentType) {
        const { error } = await this.getClient()
            .storage.from(bucket)
            .upload(path, contenido, { contentType, upsert: false });
        return error ?? null;
    }
    async asegurarBucket(bucket) {
        const { error } = await this.getClient().storage.createBucket(bucket, {
            public: true,
        });
        if (error && !/already exists|duplicate/i.test(error.message)) {
            throw this.falloDeStorage(`crear el bucket «${bucket}»`, error.message);
        }
        this.logger.log(`Creado el bucket «${bucket}» de Storage (faltaba).`);
    }
    faltaElBucket(motivo) {
        return /bucket\s+(not found|does not exist)|not found.*bucket/i.test(motivo);
    }
    falloDeStorage(accion, motivo) {
        return new InternalServerErrorException(`Supabase Storage no pudo ${accion}: ${motivo}`);
    }
};
SupabaseService = SupabaseService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], SupabaseService);
export { SupabaseService };
//# sourceMappingURL=supabase.service.js.map