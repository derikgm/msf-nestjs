/**
 * Contrato del dominio del catálogo, **de cualquier negocio** (Delys, ADC…).
 * Las clases TypeORM de ../entities/ implementan estas interfaces, así que los
 * tipos de la API y los de la base de datos no se separan. La columna `negocio`
 * (punto 6) es la que separa a cada negocio dentro de las mismas tablas.
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
    /** De quién es: `delys`, `adc`… (punto 6). */
    negocio: string,
}

export interface Dulce {
    id: number,
    nombre: string,
    precio: number,
    /** URL pública del archivo en Supabase Storage; null si el dulce no tiene imagen. */
    imagen_url: string | null,
    /**
     * Moneda del `precio` (`'CUP'`, `'USD'`…). Texto libre de hasta 8 letras:
     * no es un enum, para que puedan entrar monedas nuevas sin migraciones.
     */
    moneda: string,
    /** De quién es: `delys`, `adc`… (punto 6). */
    negocio: string,
    /** A qué sección del catálogo pertenece: referencia a `seccion.id`. */
    seccion_id: number | null,
}

export interface Encargo {
    dulce: Dulce,
    cantidad: number,
}

/**
 * Un dulce tal como se enseña en la API (N-15): los campos públicos, sin
 * `imagen_bytes` (contador interno de la cuota de Storage, no le dice nada al
 * cliente) ni `negocio` (columna que sirve para filtrar, no para mostrar).
 *
 * `seccion` es el objeto tal cual lo carga la relación; luego cada controlador
 * decide cómo lo enseña: Delys lo deja como objeto y ADC lo traduce a su
 * nombre (ver `AdcController.aProducto()`), así que aquí no se impone forma.
 */
export interface DulcePublico {
    id: number,
    nombre: string,
    precio: number,
    /** URL pública del archivo en Supabase Storage; null si no tiene imagen. */
    imagen_url: string | null,
    /** Moneda del `precio` (`'CUP'`, `'USD'`…). Texto libre de hasta 8 letras. */
    moneda: string,
    /** A qué sección del catálogo pertenece: referencia a `seccion.id`. */
    seccion_id: number | null,
    /** La sección cargada por la relación, o null si no está asignada. */
    seccion: { id: number; nombre: string } | null,
}