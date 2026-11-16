export declare class DulceComboDto {
    nombre_dulce: string;
    cantidad: number;
}
export declare class CreateComboDto {
    nombre_combo: string;
    precio: number;
    moneda?: string;
    dulces?: DulceComboDto[];
}
