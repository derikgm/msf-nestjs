export interface Instalacion {
    id: number;
    nombre_servicio: string;
    precio: number;
    moneda: string;
    imagen_url: string | null;
    descripcion: string[];
}
export interface DulceCombo {
    nombre_dulce: string;
    cantidad: number;
}
export interface Combo {
    id: number;
    nombre_combo: string;
    precio: number;
    moneda: string;
    imagen_url: string | null;
    dulces: DulceCombo[];
}
