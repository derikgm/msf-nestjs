import { ObjectLiteral, Repository } from 'typeorm';
import { SupabaseService } from './supabase.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
export type MulterFile = Express.Multer.File;
export declare const BUCKET_POR_ROL: Record<string, string>;
export interface ConImagen {
    imagen_url: string | null;
    imagen_bytes: number | null;
}
export declare class ImagenService {
    private readonly supabase;
    private readonly cuota;
    private readonly logger;
    constructor(supabase: SupabaseService, cuota: StorageQuotaService);
    subir<T extends ObjectLiteral & ConImagen>(repo: Repository<T>, entidad: T, file: MulterFile, rol: string, carpeta: string, etiqueta: string): Promise<T>;
    eliminar<T extends ObjectLiteral & ConImagen>(repo: Repository<T>, entidad: T, rol: string, etiqueta: string): Promise<T>;
    liberarParaBorrar(entidad: ConImagen, rol: string, etiqueta: string): Promise<void>;
    private soltar;
    private bucketDe;
    private extensionDe;
}
