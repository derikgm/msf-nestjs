export interface Pedido {
    id: string;
    direccion: string | null;
    telefono: string | null;
    fecha: string | null;
    notas: string | null;
    encargos: Encargo[];
    precio_total: number;
}
export interface Dulce {
    id: number;
    nombre: string;
    precio: number;
    imagen_url: string | null;
}
export interface Encargo {
    dulce: Dulce;
    cantidad: number;
}
