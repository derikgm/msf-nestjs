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
import { Combo, ComboDulce } from '../entities/index.js';
import { ImagenService } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
let CombosService = class CombosService {
    comboRepo;
    comboDulceRepo;
    imagenes;
    cuota;
    constructor(comboRepo, comboDulceRepo, imagenes, cuota) {
        this.comboRepo = comboRepo;
        this.comboDulceRepo = comboDulceRepo;
        this.imagenes = imagenes;
        this.cuota = cuota;
    }
    async listar() {
        const combos = await this.comboRepo.find({
            relations: { dulces: true },
            order: { creado_en: 'DESC', id: 'DESC' },
        });
        for (const combo of combos)
            combo.dulces.sort((a, b) => a.id - b.id);
        return combos;
    }
    async obtener(id) {
        const combo = await this.comboRepo.findOne({
            where: { id },
            relations: { dulces: true },
        });
        if (!combo) {
            throw new NotFoundException(`No existe el combo ${id}`);
        }
        combo.dulces.sort((a, b) => a.id - b.id);
        return combo;
    }
    async crear(dto) {
        const combo = this.comboRepo.create({
            nombre_combo: dto.nombre_combo.trim(),
            precio: dto.precio,
            moneda: this.normalizarMoneda(dto.moneda),
            dulces: this.armarDulces(dto.dulces),
        });
        const guardado = await this.comboRepo.save(combo);
        return { mensaje: 'Combo creado', combo: guardado };
    }
    async actualizar(id, dto) {
        const combo = await this.obtener(id);
        if (Object.keys(dto).length === 0) {
            throw new BadRequestException('No mandaste ningún campo que cambiar');
        }
        if (dto.nombre_combo !== undefined)
            combo.nombre_combo = dto.nombre_combo.trim();
        if (dto.precio !== undefined)
            combo.precio = dto.precio;
        if (dto.moneda !== undefined)
            combo.moneda = this.normalizarMoneda(dto.moneda);
        if (dto.dulces !== undefined) {
            await this.comboDulceRepo
                .createQueryBuilder()
                .delete()
                .where('combo_id = :id', { id })
                .execute();
            combo.dulces = this.armarDulces(dto.dulces);
        }
        const guardado = await this.comboRepo.save(combo);
        return { mensaje: 'Combo actualizado', combo: guardado };
    }
    async eliminar(id, caller) {
        const combo = await this.obtener(id);
        await this.imagenes.liberarParaBorrar(combo, caller.rol, `combo ${id}`);
        await this.comboRepo.remove(combo);
        return { mensaje: 'Combo eliminado' };
    }
    async subirImagen(id, file, caller) {
        const combo = await this.obtener(id);
        const actualizado = await this.imagenes.subir(this.comboRepo, combo, file, caller.rol, 'combos', `combo ${id}`);
        return {
            mensaje: 'Imagen subida correctamente',
            combo: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async eliminarImagen(id, caller) {
        const combo = await this.obtener(id);
        const actualizado = await this.imagenes.eliminar(this.comboRepo, combo, caller.rol, `combo ${id}`);
        return {
            mensaje: 'Imagen eliminada',
            combo: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    normalizarMoneda(moneda) {
        return moneda?.trim().toUpperCase() || 'CUP';
    }
    armarDulces(dulces) {
        return (dulces ?? []).map((dulce) => this.comboDulceRepo.create({
            nombre_dulce: dulce.nombre_dulce.trim(),
            cantidad: dulce.cantidad,
        }));
    }
};
CombosService = __decorate([
    Injectable(),
    __param(0, Inject(getRepositoryToken(Combo))),
    __param(1, Inject(getRepositoryToken(ComboDulce))),
    __metadata("design:paramtypes", [Repository,
        Repository,
        ImagenService,
        StorageQuotaService])
], CombosService);
export { CombosService };
//# sourceMappingURL=combos.service.js.map