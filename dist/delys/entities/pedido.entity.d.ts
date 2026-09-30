import { Encargo, Pedido as PedidoShape } from '../interfaces/delys.interfaces.js';
export declare class Pedido implements PedidoShape {
    id: string;
    precio_total: number;
    direccion: string | null;
    telefono: string | null;
    fecha: string | null;
    horario: string | null;
    notas: string | null;
    encargos: Encargo[];
}
