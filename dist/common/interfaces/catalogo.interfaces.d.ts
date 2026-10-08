export interface Pedido {
    id: string;
    direccion: string | null;
    telefono: string | null;
    fecha: string | null;
    notas: string | null;
    encargos: Encargo[];
    precio_total: number;
    negocio: string;
}
export interface Dulce {
    id: number;
    nombre: string;
    precio: number;
    imagen_url: string | null;
    moneda: string;
    negocio: string;
    seccion_id: number | null;
}
export interface Encargo {
    dulce: Dulce;
    cantidad: number;
}
export interface DulcePublico {
    id: number;
    nombre: string;
    precio: number;
    imagen_url: string | null;
    moneda: string;
    seccion_id: number | null;
    seccion: {
        id: number;
        nombre: string;
    } | null;
}
