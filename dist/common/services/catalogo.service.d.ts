import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreatePedidoDto } from '../dto/create-pedido.dto.js';
import { CreateDulceDto } from '../dto/create-dulce.dto.js';
import { UpdateDulceDto } from '../dto/update-dulce.dto.js';
import { Dulce, Encargo, Pedido, Seccion } from '../entities/index.js';
import type { DulcePublico } from '../interfaces/catalogo.interfaces.js';
import { type NegocioConfig } from '../config/negocio.config.js';
import { DulceImagenService } from './dulce-imagen.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';
export declare class CatalogoService implements OnApplicationBootstrap {
    private readonly config;
    private readonly pedidoRepo;
    private readonly encargoRepo;
    private readonly dulceRepo;
    private readonly seccionRepo;
    private readonly imagenes;
    private readonly logger;
    constructor(config: NegocioConfig, pedidoRepo: Repository<Pedido>, encargoRepo: Repository<Encargo>, dulceRepo: Repository<Dulce>, seccionRepo: Repository<Seccion>, imagenes: DulceImagenService);
    private articuloEnMayuscula;
    onApplicationBootstrap(): Promise<void>;
    asignarSeccionDulces(): Promise<void>;
    private seccionDulces;
    listarSecciones(): Promise<{
        secciones: Seccion[];
    }>;
    crearSeccion(nombre: string): Promise<{
        mensaje: string;
        seccion: Seccion;
    }>;
    actualizarSeccion(id: number, nombre: string): Promise<{
        mensaje: string;
        seccion: Seccion;
    }>;
    eliminarSeccion(id: number): Promise<{
        ok: boolean;
    }>;
    private comprobarNombreDeSeccion;
    crearPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: Pedido;
    }>;
    obtenerTodosDulces(): Promise<{
        dulces: DulcePublico[];
    }>;
    private proyectar;
    crearDulce(createDulceDto: CreateDulceDto): Promise<{
        mensaje: string;
        dulce: DulcePublico;
    }>;
    private normalizarMoneda;
    actualizarDulce(id: number, updateDulceDto: UpdateDulceDto): Promise<{
        mensaje: string;
        dulce: DulcePublico;
    }>;
    eliminarDulce(id: number, caller: AuthUser): Promise<{
        ok: boolean;
    }>;
    private pedidosQuePiden;
    private mensajeDePedidosQueBloquean;
    obtenerTodosPedidos(): Promise<{
        pedidos: Pedido[];
    }>;
    obtenerPedido(id: string): Promise<Pedido>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
    obtenerOfertas(): {
        ofertas: import("../interfaces/catalogo.interfaces.js").Dulce[];
    };
    private dulcesDelCatalogo;
}
