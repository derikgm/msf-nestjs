export declare class Seccion {
    id: number;
    nombre: string;
    negocio: string;
    padre_id: number | null;
    padre: Seccion | null;
    creado_en: Date;
}
