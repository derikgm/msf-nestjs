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
}
export interface Encargo {
    dulce: Dulce;
    cantidad: number;
}
