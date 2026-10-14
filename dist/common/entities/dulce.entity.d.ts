import { Dulce as DulceShape } from '../interfaces/catalogo.interfaces.js';
import { Seccion } from './seccion.entity.js';
export declare class Dulce implements DulceShape {
    id: number;
    nombre: string;
    precio: number;
    imagen_url: string | null;
    imagen_bytes: number | null;
    moneda: string;
    negocio: string;
    seccion_id: number | null;
    seccion: Seccion | null;
}
