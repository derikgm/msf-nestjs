import { ProductoModelo as ProductoModeloShape } from '../interfaces/catalogo.interfaces.js';
import { Dulce } from './dulce.entity.js';
export declare class ProductoModelo implements ProductoModeloShape {
    id: number;
    producto_id: number;
    producto: Dulce;
    nombre: string;
    precio: number;
    moneda: string;
    imagen_url: string | null;
    imagen_bytes: number | null;
    atributos: Record<string, string>;
    creado_en: Date;
}
