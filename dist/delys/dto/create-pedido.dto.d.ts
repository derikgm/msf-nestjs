export declare class CreateEncargoDto {
    dulce: number;
    cantidad: number;
}
export declare class CreatePedidoDto {
    encargos: CreateEncargoDto[];
}
