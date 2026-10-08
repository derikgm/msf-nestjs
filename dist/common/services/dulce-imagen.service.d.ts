import { Repository } from 'typeorm';
import { Dulce } from '../entities/index.js';
import { type NegocioConfig } from '../config/negocio.config.js';
import { SupabaseService } from './supabase.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';
export type MulterFile = Express.Multer.File;
export declare class DulceImagenService {
    private readonly config;
    private readonly dulceRepo;
    private readonly supabase;
    private readonly cuota;
    private readonly logger;
    constructor(config: NegocioConfig, dulceRepo: Repository<Dulce>, supabase: SupabaseService, cuota: StorageQuotaService);
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
    private soltar;
    private obtenerDulce;
    private bucketDe;
    private extensionDe;
}
