var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AppwriteStorageService_1;
import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
let AppwriteStorageService = AppwriteStorageService_1 = class AppwriteStorageService {
    config;
    logger = new Logger(AppwriteStorageService_1.name);
    subidas = new Map();
    constructor(config) {
        this.config = config;
    }
    async subir(bucket, path, contenido, contentType) {
        const destino = this.bucketDe(bucket);
        const fileId = this.nuevoId();
        const carpeta = this.carpetaDe(path);
        const formulario = new FormData();
        formulario.append('fileId', fileId);
        formulario.append('file', new Blob([new Uint8Array(contenido)], { type: contentType }), path.split('/').pop() || 'imagen');
        formulario.append('permissions[]', 'read("any")');
        if (carpeta)
            formulario.append('folder', carpeta);
        const respuesta = await this.pedir(`/storage/buckets/${encodeURIComponent(destino)}/files`, {
            method: 'POST',
            body: formulario,
        });
        if (!respuesta.ok) {
            throw this.fallo('subir la imagen', await this.mensajeDe(respuesta));
        }
        const cuerpo = (await respuesta.json().catch(() => null));
        const id = cuerpo?.$id;
        if (!id) {
            const motivo = cuerpo?.error?.message ??
                cuerpo?.message ??
                'la respuesta de Appwrite no trajo $id';
            throw this.fallo('subir la imagen', motivo);
        }
        this.subidas.set(`${bucket}/${path}`, id);
        this.logger.log(`Imagen subida a Appwrite (bucket «${destino}», id ${id})`);
        return id;
    }
    async eliminar(bucket, paths) {
        const destino = this.bucketDe(bucket);
        for (const path of paths) {
            const id = this.subidas.get(`${bucket}/${path}`) ?? path;
            const respuesta = await this.pedir(`/storage/buckets/${encodeURIComponent(destino)}/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (respuesta.ok || respuesta.status === 404)
                continue;
            const motivo = await this.mensajeDe(respuesta);
            if (/bucket.*(not found|does not exist)|not_found/i.test(motivo)) {
                this.logger.warn(`El bucket «${destino}» no existe: no hay nada que borrar.`);
                return;
            }
            throw this.fallo('borrar la imagen', motivo);
        }
    }
    getPublicUrl(bucket, path) {
        const destino = this.bucketDe(bucket);
        const id = this.subidas.get(`${bucket}/${path}`) ?? path;
        const base = (this.urlPublicaBase).replace(/\/+$/, '');
        const proyecto = this.proyecto ? `?project=${encodeURIComponent(this.proyecto)}` : '';
        return `${base}/storage/buckets/${encodeURIComponent(destino)}/files/${encodeURIComponent(id)}/download${proyecto}`;
    }
    pathDesdeUrl(bucket, url) {
        const patron = /\/storage\/buckets\/([^/]+)\/files\/([^/]+)/;
        const coincidencia = url.match(patron);
        if (!coincidencia)
            return undefined;
        const [, bucketId, id] = coincidencia;
        if (bucket && bucketId !== bucket)
            return undefined;
        return id ? decodeURIComponent(id) : undefined;
    }
    get baseApi() {
        const url = this.config.get('APPWRITE_ENDPOINT')?.trim();
        if (url)
            return url.replace(/\/+$/, '');
        return 'https://cloud.appwrite.io/v1';
    }
    get urlPublicaBase() {
        const propia = this.config.get('APPWRITE_PUBLIC_URL_BASE')?.trim();
        return propia || this.baseApi;
    }
    get apiKey() {
        const clave = this.config.get('APPWRITE_API_KEY')?.trim();
        if (!clave) {
            throw new ServiceUnavailableException('Falta APPWRITE_API_KEY en el .env (secreto de la API key de Appwrite, ' +
                'con scope files.* en el proyecto). Ver `APPWRITE.md`.');
        }
        return clave;
    }
    get proyecto() {
        return this.config.get('APPWRITE_PROJECT_ID')?.trim() ?? '';
    }
    get apiHeaders() {
        const headers = {
            'X-Appwrite-Key': this.apiKey,
        };
        if (this.proyecto)
            headers['X-Appwrite-Project'] = this.proyecto;
        return headers;
    }
    bucketDe(bucket) {
        return this.config.get('APPWRITE_BUCKET')?.trim() || bucket;
    }
    carpetaDe(path) {
        const partes = path.split('/').filter(Boolean);
        if (partes.length < 2)
            return '';
        const carpeta = `${partes.slice(0, -1).join('/')}/`;
        return carpeta;
    }
    nuevoId() {
        const aleatorio = Math.random().toString(36).slice(2, 10);
        return `${Date.now().toString(36)}${aleatorio}`;
    }
    async pedir(ruta, init) {
        try {
            return await fetch(`${this.baseApi}${ruta}`, {
                ...init,
                headers: {
                    ...init.headers,
                    ...this.apiHeaders,
                },
                signal: AbortSignal.timeout(30_000),
            });
        }
        catch (error) {
            const motivo = error instanceof Error && error.name === 'TimeoutError'
                ? 'Appwrite Storage no respondió en 30 segundos'
                : error.message;
            throw this.fallo(init.method === 'DELETE' ? 'borrar la imagen' : 'subir la imagen', motivo);
        }
    }
    async mensajeDe(respuesta) {
        const texto = await respuesta.text().catch(() => '');
        try {
            const cuerpo = JSON.parse(texto);
            return (cuerpo.error?.message ??
                cuerpo.message ??
                cuerpo.type ??
                `HTTP ${respuesta.status}`);
        }
        catch {
            return texto.trim() || `HTTP ${respuesta.status}`;
        }
    }
    fallo(accion, motivo) {
        return new InternalServerErrorException(`Appwrite Storage no pudo ${accion}: ${motivo}`);
    }
};
AppwriteStorageService = AppwriteStorageService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], AppwriteStorageService);
export { AppwriteStorageService };
//# sourceMappingURL=appwrite-storage.service.js.map