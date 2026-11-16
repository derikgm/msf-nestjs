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
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dulce } from '../entities/index.js';
import { NEGOCIO } from '../config/negocio.config.js';
import { ImagenService } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
let DulceImagenService = class DulceImagenService {
    config;
    dulceRepo;
    imagenes;
    cuota;
    constructor(config, dulceRepo, imagenes, cuota) {
        this.config = config;
        this.dulceRepo = dulceRepo;
        this.imagenes = imagenes;
        this.cuota = cuota;
    }
    async subir(dulceId, file, caller) {
        const dulce = await this.obtenerDulce(dulceId);
        const actualizado = await this.imagenes.subir(this.dulceRepo, dulce, file, caller.rol, 'dulces', `${this.config.articulo} ${dulceId}`);
        return {
            mensaje: 'Imagen subida correctamente',
            dulce: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async eliminar(dulceId, caller) {
        const dulce = await this.obtenerDulce(dulceId);
        const actualizado = await this.imagenes.eliminar(this.dulceRepo, dulce, caller.rol, `${this.config.articulo} ${dulceId}`);
        return {
            mensaje: 'Imagen eliminada',
            dulce: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async liberarParaBorrar(dulce, caller) {
        await this.imagenes.liberarParaBorrar(dulce, caller.rol, `${this.config.articulo} ${dulce.id}`);
    }
    async obtenerDulce(id) {
        const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });
        if (!dulce) {
            throw new BadRequestException(`No existe el ${this.config.articulo} ${id}`);
        }
        return dulce;
    }
};
DulceImagenService = __decorate([
    Injectable(),
    __param(0, Inject(NEGOCIO)),
    __param(1, Inject(getRepositoryToken(Dulce))),
    __metadata("design:paramtypes", [Object, Repository,
        ImagenService,
        StorageQuotaService])
], DulceImagenService);
export { DulceImagenService };
//# sourceMappingURL=dulce-imagen.service.js.map