import { Instalacion as InstalacionShape } from '../interfaces/instalaciones-combos.interfaces.js';
export declare class Instalacion implements InstalacionShape {
    id: number;
    nombre_servicio: string;
    precio: number;
    moneda: string;
    imagen_url: string | null;
    imagen_bytes: number | null;
    descripcion: string[];
    creado_en: Date;
}
