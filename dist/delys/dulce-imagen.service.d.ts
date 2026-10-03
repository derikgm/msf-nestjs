import { Repository } from 'typeorm';
import { Dulce } from './entities/index.js';
import { SupabaseService } from '../common/services/supabase.service.js';
import { StorageQuotaService } from '../common/services/storage-quota.service.js';
import type { AuthUser } from '../auth/auth.interfaces.js';
export type MulterFile = Express.Multer.File;
export declare class DulceImagenService {
    private readonly dulceRepo;
    private readonly supabase;
    private readonly cuota;
    private readonly logger;
    constructor(dulceRepo: Repository<Dulce>, supabase: SupabaseService, cuota: StorageQuotaService);
    subir(dulceId: number, file: MulterFile, caller: AuthUser): Promise<{
        mensaje: string;
        dulce: Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    eliminar(dulceId: number, caller: AuthUser): Promise<{
        mensaje: string;
        dulce: Dulce;
        cuota: import("../common/services/storage-quota.service.js").ResumenCuota;
    }>;
    liberarParaBorrar(dulce: Dulce, caller: AuthUser): Promise<void>;
    private liberarDe;
    private obtenerDulce;
    private bucketDe;
    private extensionDe;
}
