export interface StorageService {
    subir(bucket: string, path: string, contenido: Buffer, contentType: string): Promise<string>;
    eliminar(bucket: string, paths: string[]): Promise<void>;
    getPublicUrl(bucket: string, path: string): string;
    pathDesdeUrl(bucket: string, url: string): string | undefined;
}
export declare const STORAGE_SERVICE: unique symbol;
