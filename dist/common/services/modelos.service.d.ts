import { Repository } from 'typeorm';
import { CreateModeloDto } from '../dto/create-modelo.dto.js';
import { UpdateModeloDto } from '../dto/update-modelo.dto.js';
import { type NegocioConfig } from '../config/negocio.config.js';
import { Dulce, Encargo, ProductoModelo } from '../entities/index.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';
export declare class ModelosService {
    private readonly config;
    private readonly modeloRepo;
    private readonly dulceRepo;
    private readonly encargoRepo;
    private readonly imagenes;
    private readonly cuota;
    private readonly logger;
    constructor(config: NegocioConfig, modeloRepo: Repository<ProductoModelo>, dulceRepo: Repository<Dulce>, encargoRepo: Repository<Encargo>, imagenes: ImagenService, cuota: StorageQuotaService);
    porPublicacion(productoId: number): Promise<ProductoModelo[]>;
    porPublicaciones(productoIds: number[]): Promise<Map<number, ProductoModelo[]>>;
    crear(productoId: number, dto: CreateModeloDto): Promise<{
        mensaje: string;
        modelo: ProductoModelo;
    }>;
    actualizar(id: number, dto: UpdateModeloDto): Promise<{
        mensaje: string;
        modelo: ProductoModelo;
    }>;
    eliminar(id: number, caller: AuthUser): Promise<{
        mensaje: string;
    }>;
    private pedidosQueLoPiden;
    subirImagen(id: number, file: MulterFile, caller: AuthUser): Promise<{
        mensaje: string;
        modelo: ProductoModelo;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    eliminarImagen(id: number, caller: AuthUser): Promise<{
        mensaje: string;
        modelo: ProductoModelo;
        cuota: import("./storage-quota.service.js").ResumenCuota;
    }>;
    private publicacion;
    private modeloDe;
    private comprobarNombreLibre;
    private normalizarMoneda;
    private limpiarAtributos;
    private textoDelValor;
}
