import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { Dulce, Encargo, Pedido } from './entities/index.js';
export declare class DelysService implements OnApplicationBootstrap {
    private readonly pedidoRepo;
    private readonly encargoRepo;
    private readonly dulceRepo;
    private readonly logger;
    constructor(pedidoRepo: Repository<Pedido>, encargoRepo: Repository<Encargo>, dulceRepo: Repository<Dulce>);
    onApplicationBootstrap(): Promise<void>;
    crearPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: Pedido;
    }>;
    obtenerTodosDulces(): Promise<{
        dulces: Dulce[];
    }>;
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
    private upsertDulce;
}
