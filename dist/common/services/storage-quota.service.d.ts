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
    constructor(quotaRepo: Repository<StorageQuota>);
    onApplicationBootstrap(): Promise<void>;
    getResumen(rol: string): Promise<ResumenCuota>;
    decrementarUso(rol: string, bytes: number): Promise<void>;
    reservarCuota(rol: string, bytes: number): Promise<boolean>;
    private asegurarRol;
    private comprobarBytes;
}
