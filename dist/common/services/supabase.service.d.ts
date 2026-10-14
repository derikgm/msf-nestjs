import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private readonly config;
    private readonly logger;
    private cliente;
    constructor(config: ConfigService);
    getClient(): SupabaseClient;
    subir(bucket: string, path: string, contenido: Buffer, contentType: string): Promise<string>;
    eliminar(bucket: string, paths: string[]): Promise<void>;
    getPublicUrl(bucket: string, path: string): string;
    pathDesdeUrl(bucket: string, url: string): string | undefined;
    private probarSubida;
    private asegurarBucket;
    private faltaElBucket;
    private falloDeStorage;
}
