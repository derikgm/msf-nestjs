export declare class Seccion {
    id: number;
    nombre: string;
    negocio: string;
    parent_id: number | null;
    padre?: Seccion | null;
    hijos?: Seccion[];
    creado_en: Date;
}
