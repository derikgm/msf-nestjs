import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.service.js';
export declare class AppwriteStorageService implements StorageService {
    private readonly config;
    private readonly logger;
    private readonly subidas;
    constructor(config: ConfigService);
    subir(bucket: string, path: string, contenido: Buffer, contentType: string): Promise<string>;
    eliminar(bucket: string, paths: string[]): Promise<void>;
    getPublicUrl(bucket: string, path: string): string;
    pathDesdeUrl(bucket: string, url: string): string | undefined;
    private get baseApi();
    private get urlPublicaBase();
    private get apiKey();
    private get proyecto();
    private get apiHeaders();
    private bucketDe;
    private carpetaDe;
    private nuevoId;
    private pedir;
    private mensajeDe;
    private fallo;
}
