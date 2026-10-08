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
import { Inject, Injectable } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES } from '../../auth/entities/index.js';
import { LIMITE_BYTES_POR_DEFECTO, StorageQuota, } from '../entities/storage-quota.entity.js';
let StorageQuotaService = class StorageQuotaService {
    quotaRepo;
    constructor(quotaRepo) {
        this.quotaRepo = quotaRepo;
    }
    async onApplicationBootstrap() {
        for (const rol of ROLES)
            await this.asegurarRol(rol);
    }
    async getResumen(rol) {
        const { bytes_usados, limite_bytes } = await this.asegurarRol(rol);
        return {
            rol,
            bytes_usados,
            limite_bytes,
            bytes_disponibles: Math.max(limite_bytes - bytes_usados, 0),
        };
    }
    async decrementarUso(rol, bytes) {
        this.comprobarBytes(bytes);
        await this.asegurarRol(rol);
        await this.quotaRepo
            .createQueryBuilder()
            .update(StorageQuota)
            .set({
            bytes_usados: () => `GREATEST(bytes_usados - ${bytes}, 0)`,
        })
            .where('rol = :rol', { rol })
            .execute();
    }
    async reservarCuota(rol, bytes) {
        this.comprobarBytes(bytes);
        await this.asegurarRol(rol);
        const resultado = await this.quotaRepo
            .createQueryBuilder()
            .update(StorageQuota)
            .set({ bytes_usados: () => `bytes_usados + ${bytes}` })
            .where('rol = :rol', { rol })
            .andWhere(`bytes_usados + ${bytes} <= limite_bytes`)
            .execute();
        return (resultado.affected ?? 0) > 0;
    }
    async asegurarRol(rol) {
        const existente = await this.quotaRepo.findOneBy({ rol });
        if (existente)
            return existente;
        return this.quotaRepo.save(this.quotaRepo.create({ rol, bytes_usados: 0, limite_bytes: LIMITE_BYTES_POR_DEFECTO }));
    }
    comprobarBytes(bytes) {
        if (!Number.isSafeInteger(bytes) || bytes <= 0) {
            throw new Error(`Cantidad de bytes inválida: ${bytes}`);
        }
    }
};
StorageQuotaService = __decorate([
    Injectable(),
    __param(0, Inject(getRepositoryToken(StorageQuota))),
    __metadata("design:paramtypes", [Repository])
], StorageQuotaService);
export { StorageQuotaService };
//# sourceMappingURL=storage-quota.service.js.map