/**
 * Contrato del dominio. Las clases de TypeORM de ../entities/ implementan estas
 * interfaces, así que los tipos de la API y los de la base de datos no se separan.
 */

export interface Pedido {
    id: string,
    /**
     * Los datos de entrega admiten null en el tipo porque sus columnas se declaran
     * permeables (ver PedidoEntity): `CreatePedidoDto` no deja crear un pedido sin
     * ellos, pero un pedido antiguo, creado antes de que existieran, sí los tiene a
     * null y no se debe romper el cliente al leerlo.
     */
    direccion: string | null,
    telefono: string | null,
    /** Día de la entrega en `YYYY-MM-DD`. */
    fecha: string | null,
    /** Indicaciones del pedido; null si el cliente no mandó ninguna. */
    notas: string | null,
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