import { DulceCombo as DulceComboShape } from '../interfaces/instalaciones-combos.interfaces.js';
import { Combo } from './combo.entity.js';
export declare class ComboDulce implements DulceComboShape {
    id: number;
    nombre_dulce: string;
    cantidad: number;
    combo: Combo;
}
