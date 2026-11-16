import { Repository } from 'typeorm';
import { Dulce } from '../entities/index.js';
import { type NegocioConfig } from '../config/negocio.config.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';
export type { MulterFile } from './imagen.service.js';
export declare class DulceImagenService {
    private readonly config;
    private readonly dulceRepo;
    private readonly imagenes;
    private readonly cuota;
    constructor(config: NegocioConfig, dulceRepo: Repository<Dulce>, imagenes: ImagenService, cuota: StorageQuotaService);
    subir(dulceId: number, file: MulterFile, caller: AuthUser): Promise<{
        mensaje: string;
        dulce: Dulce;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    eliminar(dulceId: number, caller: AuthUser): Promise<{
        mensaje: string;
        dulce: Dulce;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    liberarParaBorrar(dulce: Dulce, caller: AuthUser): Promise<void>;
    private obtenerDulce;
}
