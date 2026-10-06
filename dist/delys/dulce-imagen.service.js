var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DulceImagenService_1;
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Dulce } from './entities/index.js';
import { NEGOCIO } from './negocio.config.js';
import { SupabaseService } from '../common/services/supabase.service.js';
import { StorageQuotaService } from '../common/services/storage-quota.service.js';
const BUCKET_POR_ROL = {
    delys: 'delys',
    domus: 'domus',
};
let DulceImagenService = DulceImagenService_1 = class DulceImagenService {
    config;
    dulceRepo;
    supabase;
    cuota;
    logger = new Logger(DulceImagenService_1.name);
    constructor(config, dulceRepo, supabase, cuota) {
        this.config = config;
        this.dulceRepo = dulceRepo;
        this.supabase = supabase;
        this.cuota = cuota;
    }
    async subir(dulceId, file, caller) {
        const dulce = await this.obtenerDulce(dulceId);
        const bucket = this.bucketDe(caller.rol);
        const bytes = file.size;
        const reservado = await this.cuota.reservarCuota(caller.rol, bytes);
        if (!reservado) {
            const resumen = await this.cuota.getResumen(caller.rol);
            throw new BadRequestException(`La cuota de "${caller.rol}" no alcanza para esta imagen: ` +
                `usa ${resumen.bytes_usados} de ${resumen.limite_bytes} bytes ` +
                `(${resumen.bytes_disponibles} disponibles) y la imagen pesa ${bytes} bytes`);
        }
        const path = `dulces/${randomUUID()}${this.extensionDe(file)}`;
        try {
            await this.supabase.subir(bucket, path, file.buffer, file.mimetype);
        }
        catch (error) {
            await this.cuota.decrementarUso(caller.rol, bytes);
            throw error;
        }
        await this.liberarDe(dulce, caller.rol);
        dulce.imagen_url = this.supabase.getPublicUrl(bucket, path);
        dulce.imagen_bytes = bytes;
        const actualizado = await this.dulceRepo.save(dulce);
        return {
            mensaje: 'Imagen subida correctamente',
            dulce: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async eliminar(dulceId, caller) {
        const dulce = await this.obtenerDulce(dulceId);
        if (!dulce.imagen_url) {
            throw new BadRequestException(`El ${this.config.articulo} ${dulceId} no tiene imagen`);
        }
        const bytes = dulce.imagen_bytes ?? 0;
        const bucket = this.bucketDe(caller.rol);
        const path = this.supabase.pathDesdeUrl(bucket, dulce.imagen_url);
        if (path)
            await this.supabase.eliminar(bucket, [path]);
        dulce.imagen_url = null;
        dulce.imagen_bytes = null;
        const actualizado = await this.dulceRepo.save(dulce);
        if (bytes)
            await this.cuota.decrementarUso(caller.rol, bytes);
        return {
            mensaje: 'Imagen eliminada',
            dulce: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async liberarParaBorrar(dulce, caller) {
        try {
            await this.liberarDe(dulce, caller.rol);
        }
        catch (error) {
            this.logger.warn(`No se pudo liberar la imagen del dulce ${dulce.id}: ${error.message}. ` +
                'El dulce se borra igual y el archivo queda pendiente de limpiar a mano.');
        }
    }
    async liberarDe(dulce, rol) {
        if (!dulce.imagen_url)
            return;
        const bucket = this.bucketDe(rol);
        const path = this.supabase.pathDesdeUrl(bucket, dulce.imagen_url);
        if (path)
            await this.supabase.eliminar(bucket, [path]);
        if (dulce.imagen_bytes)
            await this.cuota.decrementarUso(rol, dulce.imagen_bytes);
    }
    async obtenerDulce(id) {
        const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });
        if (!dulce) {
            throw new BadRequestException(`No existe el ${this.config.articulo} ${id}`);
        }
        return dulce;
    }
    bucketDe(rol) {
        return BUCKET_POR_ROL[rol] ?? rol;
    }
    extensionDe(file) {
        const extension = extname(file.originalname ?? '').toLowerCase();
        return /^\.[a-z0-9]{1,5}$/.test(extension) ? extension : '.bin';
    }
};
DulceImagenService = DulceImagenService_1 = __decorate([
    Injectable(),
    __param(0, Inject(NEGOCIO)),
    __param(1, Inject(getRepositoryToken(Dulce))),
    __metadata("design:paramtypes", [Object, Repository,
        SupabaseService,
        StorageQuotaService])
], DulceImagenService);
export { DulceImagenService };
//# sourceMappingURL=dulce-imagen.service.js.map