import { Encargo, Pedido as PedidoShape } from '../interfaces/delys.interfaces.js';
export declare class Pedido implements PedidoShape {
    id: string;
    precio_total: number;
    encargos: Encargo[];
}
