import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StorageQuota } from '../entities/storage-quota.entity.js';
export interface ResumenCuota {
    rol: string;
    bytes_usados: number;
    limite_bytes: number;
    bytes_disponibles: number;
}
export declare class StorageQuotaService implements OnApplicationBootstrap {
    private readonly quotaRepo;
    private readonly logger;
    constructor(quotaRepo: Repository<StorageQuota>);
    onApplicationBootstrap(): Promise<void>;
    getUsoActual(rol: string): Promise<number>;
    getLimite(rol: string): Promise<number>;
    getResumen(rol: string): Promise<ResumenCuota>;
    incrementarUso(rol: string, bytes: number): Promise<void>;
    decrementarUso(rol: string, bytes: number): Promise<void>;
    validarCuota(rol: string, bytesNuevos: number): Promise<boolean>;
    reservarCuota(rol: string, bytes: number): Promise<boolean>;
    private asegurarRol;
    private comprobarBytes;
}
