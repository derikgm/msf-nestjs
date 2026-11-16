import { Repository } from 'typeorm';
import { CreateComboDto } from '../dto/create-combo.dto.js';
import { UpdateComboDto } from '../dto/update-combo.dto.js';
import { Combo, ComboDulce } from '../entities/index.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';
export declare class CombosService {
    private readonly comboRepo;
    private readonly comboDulceRepo;
    private readonly imagenes;
    private readonly cuota;
    constructor(comboRepo: Repository<Combo>, comboDulceRepo: Repository<ComboDulce>, imagenes: ImagenService, cuota: StorageQuotaService);
    listar(): Promise<Combo[]>;
    obtener(id: number): Promise<Combo>;
    crear(dto: CreateComboDto): Promise<{
        mensaje: string;
        combo: Combo;
    }>;
    actualizar(id: number, dto: UpdateComboDto): Promise<{
        mensaje: string;
        combo: Combo;
    }>;
    eliminar(id: number, caller: AuthUser): Promise<{
        mensaje: string;
    }>;
    subirImagen(id: number, file: MulterFile, caller: AuthUser): Promise<{
        mensaje: string;
        combo: Combo;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagen(id: number, caller: AuthUser): Promise<{
        mensaje: string;
        combo: Combo;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    private normalizarMoneda;
    private armarDulces;
}
