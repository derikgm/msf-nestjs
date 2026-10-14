import { Combo as ComboShape } from '../interfaces/instalaciones-combos.interfaces.js';
import { ComboDulce } from './combo-dulce.entity.js';
export declare class Combo implements ComboShape {
    id: number;
    nombre_combo: string;
    precio: number;
    moneda: string;
    imagen_url: string | null;
    imagen_bytes: number | null;
    dulces: ComboDulce[];
    creado_en: Date;
}
