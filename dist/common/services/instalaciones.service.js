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
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instalacion } from '../entities/index.js';
import { ImagenService } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
let InstalacionesService = class InstalacionesService {
    instalacionRepo;
    imagenes;
    cuota;
    constructor(instalacionRepo, imagenes, cuota) {
        this.instalacionRepo = instalacionRepo;
        this.imagenes = imagenes;
        this.cuota = cuota;
    }
    async listar() {
        return this.instalacionRepo.find({ order: { creado_en: 'DESC', id: 'DESC' } });
    }
    async obtener(id) {
        const instalacion = await this.instalacionRepo.findOneBy({ id });
        if (!instalacion) {
            throw new NotFoundException(`No existe la instalación ${id}`);
        }
        return instalacion;
    }
    async crear(dto) {
        const instalacion = this.instalacionRepo.create({
            nombre_servicio: dto.nombre_servicio.trim(),
            precio: dto.precio,
            moneda: this.normalizarMoneda(dto.moneda),
            descripcion: this.limpiarDescripcion(dto.descripcion),
        });
        const guardada = await this.instalacionRepo.save(instalacion);
        return { mensaje: 'Instalación creada', instalacion: guardada };
    }
    async actualizar(id, dto) {
        const instalacion = await this.obtener(id);
        if (Object.keys(dto).length === 0) {
            throw new BadRequestException('No mandaste ningún campo que cambiar');
        }
        if (dto.nombre_servicio !== undefined) {
            instalacion.nombre_servicio = dto.nombre_servicio.trim();
        }
        if (dto.precio !== undefined)
            instalacion.precio = dto.precio;
        if (dto.moneda !== undefined)
            instalacion.moneda = this.normalizarMoneda(dto.moneda);
        if (dto.descripcion !== undefined) {
            instalacion.descripcion = this.limpiarDescripcion(dto.descripcion);
        }
        const guardada = await this.instalacionRepo.save(instalacion);
        return { mensaje: 'Instalación actualizada', instalacion: guardada };
    }
    async eliminar(id, caller) {
        const instalacion = await this.obtener(id);
        await this.imagenes.liberarParaBorrar(instalacion, caller.rol, `instalación ${id}`);
        await this.instalacionRepo.remove(instalacion);
        return { mensaje: 'Instalación eliminada' };
    }
    async subirImagen(id, file, caller) {
        const instalacion = await this.obtener(id);
        const actualizada = await this.imagenes.subir(this.instalacionRepo, instalacion, file, caller.rol, 'instalaciones', `instalación ${id}`);
        return {
            mensaje: 'Imagen subida correctamente',
            instalacion: actualizada,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async eliminarImagen(id, caller) {
        const instalacion = await this.obtener(id);
        const actualizada = await this.imagenes.eliminar(this.instalacionRepo, instalacion, caller.rol, `instalación ${id}`);
        return {
            mensaje: 'Imagen eliminada',
            instalacion: actualizada,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    normalizarMoneda(moneda) {
        return moneda?.trim().toUpperCase() || 'CUP';
    }
    limpiarDescripcion(descripcion) {
        return (descripcion ?? []).map((linea) => linea.trim()).filter((linea) => linea.length > 0);
    }
};
InstalacionesService = __decorate([
    Injectable(),
    __param(0, Inject(getRepositoryToken(Instalacion))),
    __metadata("design:paramtypes", [Repository,
        ImagenService,
        StorageQuotaService])
], InstalacionesService);
export { InstalacionesService };
//# sourceMappingURL=instalaciones.service.js.map