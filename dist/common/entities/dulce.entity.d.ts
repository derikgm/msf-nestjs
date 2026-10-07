import { Dulce as DulceShape } from '../interfaces/catalogo.interfaces.js';
export declare class Dulce implements DulceShape {
    id: number;
    nombre: string;
    precio: number;
    imagen_url: string | null;
    imagen_bytes: number | null;
    moneda: string;
    negocio: string;
}
