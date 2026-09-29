
/**
 * Contrato del dominio. Las clases de TypeORM de ../entities/ implementan estas
 * interfaces, así que los tipos de la API y los de la base de datos no se separan.
 */

export interface Pedido {
    id: string,
    encargos: Encargo [],
    precio_total: number,
}

export interface Dulce {
    id: number,
    nombre: string,
    precio: number,
    /** URL pública del archivo en Supabase Storage; null si el dulce no tiene imagen. */
    imagen_url: string | null,
}

export interface Encargo {
    dulce: Dulce,
    cantidad: number,
}
