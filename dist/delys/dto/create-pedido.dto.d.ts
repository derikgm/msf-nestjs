export declare class CreateDulceDto {
    id: number;
    nombre: string;
    precio: number;
}
export declare class CreateEncargoDto {
    dulce: CreateDulceDto;
    cantidad: number;
}
export declare class CreatePedidoDto {
    encargos: CreateEncargoDto[];
}
