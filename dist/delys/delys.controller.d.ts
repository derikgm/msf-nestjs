import { DelysService } from './delys.service.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
export declare class DelysController {
    private readonly delysService;
    constructor(delysService: DelysService);
    agregarPedido(createPedidoDto: CreatePedidoDto): Promise<{
        ok: boolean;
        pedido: import("./entities/pedido.entity.js").Pedido;
    }>;
    obtenerPedidos(): Promise<{
        pedidos: import("./entities/pedido.entity.js").Pedido[];
    }>;
    obtenerDulces(): Promise<{
        dulces: import("./entities/dulce.entity.js").Dulce[];
    }>;
    obtenerOfertas(): {
        ofertas: import("./interfaces/delys.interfaces.js").Dulce[];
    };
    findOne(id: string): Promise<import("./entities/pedido.entity.js").Pedido>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
