export declare class CreateEncargoAdcDto {
    producto: number;
    cantidad: number;
}
export declare class CreatePedidoAdcDto {
    direccion: string;
    telefono: string;
    fecha: string;
    notas?: string;
    encargos: CreateEncargoAdcDto[];
}
