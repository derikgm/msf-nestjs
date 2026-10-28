var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ImagenService_1;
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { SupabaseService } from './supabase.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
export const BUCKET_POR_ROL = {
    delys: 'delys',
    domus: 'domus',
    adc: 'adc',
};
let ImagenService = ImagenService_1 = class ImagenService {
    supabase;
    cuota;
    logger = new Logger(ImagenService_1.name);
    constructor(supabase, cuota) {
        this.supabase = supabase;
        this.cuota = cuota;
    }
    async subir(repo, entidad, file, rol, carpeta, etiqueta) {
        const bucket = this.bucketDe(rol);
        const bytes = file.size;
        const reservado = await this.cuota.reservarCuota(rol, bytes);
        if (!reservado) {
            const resumen = await this.cuota.getResumen(rol);
            throw new BadRequestException(`La cuota de "${rol}" no alcanza para esta imagen: ` +
                `usa ${resumen.bytes_usados} de ${resumen.limite_bytes} bytes ` +
                `(${resumen.bytes_disponibles} disponibles) y la imagen pesa ${bytes} bytes`);
        }
        const path = `${carpeta}/${randomUUID()}${this.extensionDe(file)}`;
        try {
            await this.supabase.subir(bucket, path, file.buffer, file.mimetype);
        }
        catch (error) {
            await this.cuota.decrementarUso(rol, bytes);
            throw error;
        }
        const urlAnterior = entidad.imagen_url;
        const bytesAnteriores = entidad.imagen_bytes;
        entidad.imagen_url = this.supabase.getPublicUrl(bucket, path);
        entidad.imagen_bytes = bytes;
        const actualizado = await repo.save(entidad);
        if (urlAnterior) {
            await this.soltar(urlAnterior, bytesAnteriores, etiqueta, rol);
        }
        return actualizado;
    }
    async eliminar(repo, entidad, rol, etiqueta) {
        if (!entidad.imagen_url) {
            throw new BadRequestException(`El ${etiqueta} no tiene imagen`);
        }
        await this.soltar(entidad.imagen_url, entidad.imagen_bytes, etiqueta, rol);
        entidad.imagen_url = null;
        entidad.imagen_bytes = null;
        return repo.save(entidad);
    }
    async liberarParaBorrar(entidad, rol, etiqueta) {
        try {
            await this.soltar(entidad.imagen_url, entidad.imagen_bytes, etiqueta, rol);
        }
        catch (error) {
            this.logger.error(`No se pudo liberar la imagen de ${etiqueta}: ${error.message}. ` +
                'El archivo queda pendiente de limpiar a mano.', error.stack);
        }
    }
    async soltar(imagenUrl, imagenBytes, etiqueta, rol) {
        if (!imagenUrl)
            return;
        const bucket = this.bucketDe(rol);
        const path = this.supabase.pathDesdeUrl(bucket, imagenUrl);
        if (!path)
            return;
        try {
            await this.supabase.eliminar(bucket, [path]);
        }
        catch (error) {
            this.logger.warn(`No se pudo borrar la imagen de ${etiqueta} (${path}): ${error.message}. Reintentando...`);
            try {
                await this.supabase.eliminar(bucket, [path]);
            }
            catch (segundoError) {
                this.logger.error(`La imagen de ${etiqueta} (${path}) sigue sin borrarse tras el reintento: ` +
                    `${segundoError.message}. El archivo queda pendiente de limpiar a mano y su cuota no se libera.`);
                return;
            }
        }
        if (imagenBytes)
            await this.cuota.decrementarUso(rol, imagenBytes);
    }
    bucketDe(rol) {
        return BUCKET_POR_ROL[rol] ?? rol;
    }
    extensionDe(file) {
        const extension = extname(file.originalname ?? '').toLowerCase();
        return /^\.[a-z0-9]{1,5}$/.test(extension) ? extension : '.bin';
    }
};
ImagenService = ImagenService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SupabaseService,
        StorageQuotaService])
], ImagenService);
export { ImagenService };
//# sourceMappingURL=imagen.service.js.map