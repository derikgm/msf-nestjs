import { Encargo as EncargoShape } from '../interfaces/catalogo.interfaces.js';
import { Dulce } from './dulce.entity.js';
import { ProductoModelo } from './producto-modelo.entity.js';
import { Pedido } from './pedido.entity.js';
export declare class Encargo implements EncargoShape {
    id: string;
    dulce: Dulce;
    cantidad: number;
    modelo_id: number | null;
    modelo: ProductoModelo | null;
    nombre_vendido: string | null;
    precio_vendido: number | null;
    pedido: Pedido;
}
