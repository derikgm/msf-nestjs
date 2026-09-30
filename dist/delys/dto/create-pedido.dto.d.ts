export declare class CreateEncargoDto {
    dulce: number;
    cantidad: number;
}
export declare class CreatePedidoDto {
    direccion: string;
    telefono: string;
    fecha: string;
    horario: string;
    notas?: string;
    encargos: CreateEncargoDto[];
}
