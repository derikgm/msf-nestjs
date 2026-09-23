import { DelysService } from './delys.service.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
export declare class DelysController {
    private readonly delysService;
    constructor(delysService: DelysService);
    agregarPedido(createPedidoDto: CreatePedidoDto): {
        ok: boolean;
        pedido: import("./interfaces/delys.interfaces.js").Pedido;
    };
    obtenerPedidos(): Promise<void>;
    obtenerDulces(): Promise<{
        dulces: import("./interfaces/delys.interfaces.js").Dulce[];
    } | undefined>;
    findOne(id: string): import("./interfaces/delys.interfaces.js").Pedido;
    remove(id: string): {
        ok: boolean;
    };
    obtenerOfertas(): string;
}
