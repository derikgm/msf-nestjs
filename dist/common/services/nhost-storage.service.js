var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NhostStorageService_1;
import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
let NhostStorageService = NhostStorageService_1 = class NhostStorageService {
    config;
    logger = new Logger(NhostStorageService_1.name);
    constructor(config) {
        this.config = config;
    }
    async subir(bucket, path, contenido, contentType) {
        const destino = this.bucketDe(bucket);
        const formulario = new FormData();
        formulario.append('bucket-id', destino);
        formulario.append('file[]', new Blob([new Uint8Array(contenido)], { type: contentType }), this.nombreDe(path));
        const respuesta = await this.pedir('/files', {
            method: 'POST',
            body: formulario,
        });
        if (!respuesta.ok) {
            throw this.fallo('subir la imagen', await this.mensajeDe(respuesta));
        }
        const cuerpo = (await respuesta.json().catch(() => null));
        const id = cuerpo?.processedFiles?.[0]?.id;
        if (!id) {
            const motivo = cuerpo?.error?.message ??
                'la respuesta de Nhost no trajo processedFiles[0].id';
            throw this.fallo('subir la imagen', motivo);
        }
        this.logger.log(`Imagen subida a Nhost (bucket «${destino}», id ${id})`);
        return id;
    }
    async eliminar(bucket, paths) {
        const destino = this.bucketDe(bucket);
        for (const path of paths) {
            const respuesta = await this.pedir(`/files/${encodeURIComponent(path)}`, {
                method: 'DELETE',
            });
            if (respuesta.ok || respuesta.status === 404)
                continue;
            const motivo = await this.mensajeDe(respuesta);
            if (/bucket.*(not found|does not exist)/i.test(motivo)) {
                this.logger.warn(`El bucket «${destino}» no existe: no hay nada que borrar.`);
                return;
            }
            throw this.fallo('borrar la imagen', motivo);
        }
    }
    getPublicUrl(_bucket, path) {
        return `${this.basePublica}/${encodeURIComponent(path)}`;
    }
    pathDesdeUrl(_bucket, url) {
        const marca = `${this.basePublica}/`;
        const indice = url.indexOf(marca);
        if (indice === -1)
            return undefined;
        const resto = url.slice(indice + marca.length);
        const id = resto.split(/[?#]/, 1)[0];
        return id ? decodeURIComponent(id) : undefined;
    }
    get baseApi() {
        const url = this.config.get('NHOST_STORAGE_URL')?.trim();
        if (url)
            return url.replace(/\/+$/, '');
        const subdominio = this.config.get('NHOST_SUBDOMAIN')?.trim();
        const region = this.config.get('NHOST_REGION')?.trim();
        if (subdominio && region) {
            return `https://${subdominio}.storage.${region}.nhost.run/v1`;
        }
        throw new ServiceUnavailableException('Falta NHOST_STORAGE_URL en el .env (la base de Storage, terminada en /v1) ' +
            'o, en su lugar, NHOST_SUBDOMAIN y NHOST_REGION');
    }
    get basePublica() {
        const propia = this.config.get('NHOST_PUBLIC_URL_BASE')?.trim();
        return (propia || `${this.baseApi}/files`).replace(/\/+$/, '');
    }
    get adminSecret() {
        const secreto = (this.config.get('NHOST_ADMIN_SECRET') ??
            this.config.get('HASURA_GRAPHQL_ADMIN_SECRET'))?.trim();
        if (!secreto) {
            throw new ServiceUnavailableException('Falta NHOST_ADMIN_SECRET en el .env (secreto de administración de Nhost, ' +
                'el HASURA_GRAPHQL_ADMIN_SECRET de Settings → Secrets)');
        }
        return secreto;
    }
    bucketDe(bucket) {
        return this.config.get('NHOST_BUCKET')?.trim() || bucket;
    }
    async pedir(ruta, init) {
        try {
            return await fetch(`${this.baseApi}${ruta}`, {
                ...init,
                headers: {
                    ...init.headers,
                    'X-Hasura-Admin-Secret': this.adminSecret,
                },
                signal: AbortSignal.timeout(30_000),
            });
        }
        catch (error) {
            const motivo = error instanceof Error && error.name === 'TimeoutError'
                ? 'Nhost Storage no respondió en 30 segundos'
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
                `HTTP ${respuesta.status}`);
        }
        catch {
            return texto.trim() || `HTTP ${respuesta.status}`;
        }
    }
    fallo(accion, motivo) {
        return new InternalServerErrorException(`Nhost Storage no pudo ${accion}: ${motivo}`);
    }
    nombreDe(path) {
        const nombre = path.split('/').pop();
        return nombre || 'imagen';
    }
};
NhostStorageService = NhostStorageService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], NhostStorageService);
export { NhostStorageService };
//# sourceMappingURL=nhost-storage.service.js.map