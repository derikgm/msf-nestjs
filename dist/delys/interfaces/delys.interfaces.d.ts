export interface Pedido {
    id: string;
    encargos: Encargo[];
    precio_total: number;
}
export interface Dulce {
    id: number;
    nombre: string;
    precio: number;
}
export interface Encargo {
    dulce: Dulce;
    cantidad: number;
}
