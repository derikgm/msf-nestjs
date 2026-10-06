import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { CreateDulceDto } from './dto/create-dulce.dto.js';
import { UpdateDulceDto } from './dto/update-dulce.dto.js';
import { Dulce, Encargo, Pedido } from './entities/index.js';
import { type NegocioConfig } from './negocio.config.js';
import { DulceImagenService } from './dulce-imagen.service.js';
import type { AuthUser } from '../auth/auth.interfaces.js';
export declare class DelysService implements OnApplicationBootstrap {
    private readonly config;
    private readonly pedidoRepo;
    private readonly encargoRepo;
    private readonly dulceRepo;
    private readonly imagenes;
    private readonly logger;
    constructor(config: NegocioConfig, pedidoRepo: Repository<Pedido>, encargoRepo: Repository<Encargo>, dulceRepo: Repository<Dulce>, imagenes: DulceImagenService);
    private articuloEnMayuscula;
    onApplicationBootstrap(): Promise<void>;
    crearPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: Pedido;
    }>;
    obtenerTodosDulces(): Promise<{
        dulces: Dulce[];
    }>;
    crearDulce(createDulceDto: CreateDulceDto): Promise<{
        mensaje: string;
        dulce: Dulce;
    }>;
    private normalizarMoneda;
    actualizarDulce(id: number, updateDulceDto: UpdateDulceDto): Promise<{
        mensaje: string;
        dulce: Dulce;
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
        ofertas: import("./interfaces/delys.interfaces.js").Dulce[];
    };
    private dulcesDelCatalogo;
}
