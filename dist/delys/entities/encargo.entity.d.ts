import { Encargo as EncargoShape } from '../interfaces/delys.interfaces.js';
import { Dulce } from './dulce.entity.js';
import { Pedido } from './pedido.entity.js';
export declare class Encargo implements EncargoShape {
    id: string;
    dulce: Dulce;
    cantidad: number;
    pedido: Pedido;
}
