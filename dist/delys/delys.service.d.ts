import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { Dulce, Pedido } from './interfaces/delys.interfaces.js';
import { ConfigService } from '@nestjs/config';
export declare class DelysService {
    private configService;
    private db;
    pedidos: Pedido[];
    dulces: Dulce[];
    constructor(configService: ConfigService);
    agregarEncargo(createPedidoDto: CreatePedidoDto): {
        ok: boolean;
        pedido: Pedido;
    };
    obtenerTodosDulces(): Promise<{
        dulces: Dulce[];
    } | undefined>;
    obtenerTodosPedidos(): Promise<void>;
    obtenerEncargo(id: string): Pedido;
    remove(id: string): {
        ok: boolean;
    };
    obtenerOfertas(): string;
}
