import { Repository } from 'typeorm';
import { CreateInstalacionDto } from '../dto/create-instalacion.dto.js';
import { UpdateInstalacionDto } from '../dto/update-instalacion.dto.js';
import { Instalacion } from '../entities/index.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';
export declare class InstalacionesService {
    private readonly instalacionRepo;
    private readonly imagenes;
    private readonly cuota;
    constructor(instalacionRepo: Repository<Instalacion>, imagenes: ImagenService, cuota: StorageQuotaService);
    listar(): Promise<Instalacion[]>;
    obtener(id: number): Promise<Instalacion>;
    crear(dto: CreateInstalacionDto): Promise<{
        mensaje: string;
        instalacion: Instalacion;
    }>;
    actualizar(id: number, dto: UpdateInstalacionDto): Promise<{
        mensaje: string;
        instalacion: Instalacion;
    }>;
    eliminar(id: number, caller: AuthUser): Promise<{
        mensaje: string;
    }>;
    subirImagen(id: number, file: MulterFile, caller: AuthUser): Promise<{
        mensaje: string;
        instalacion: Instalacion;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagen(id: number, caller: AuthUser): Promise<{
        mensaje: string;
        instalacion: Instalacion;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    private normalizarMoneda;
    private limpiarDescripcion;
}
