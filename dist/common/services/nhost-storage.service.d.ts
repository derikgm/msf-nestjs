import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.service.js';
export declare class NhostStorageService implements StorageService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    subir(bucket: string, path: string, contenido: Buffer, contentType: string): Promise<string>;
    eliminar(bucket: string, paths: string[]): Promise<void>;
    getPublicUrl(_bucket: string, path: string): string;
    pathDesdeUrl(_bucket: string, url: string): string | undefined;
    private get baseApi();
    private get basePublica();
    private get adminSecret();
    private bucketDe;
    private pedir;
    private mensajeDe;
    private fallo;
    private nombreDe;
}
