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
    /** Descripción larga del producto; null si no tiene. */
    descripcion: string | null,
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
    /**
     * Qué modelo de la publicación se llevaron (`producto_modelo.id`). Null
     * cuando se pidió una publicación sin modelos **y** en los renglones creados
     * antes de que existiera la columna: el histórico no puede distinguirlos,
     * así que lo que resuelve es `nombre_vendido`.
     */
    modelo_id: number | null,
    /**
     * Cómo se escribió el renglón aquel día: `Nevera No Frost 250 L — 240 L
     * inverter`. Se guarda porque el catálogo se puede renombrar, y un pedido de
     * hace seis meses no debe cambiar de significado al hacerlo.
     */
    nombre_vendido: string | null,
    /**
     * Precio **unitario** de aquel día, con la moneda del catálogo. Lo que se
     * cobró sigue estando en `pedido.precio_total`; esto es lo que sobra para
     * poder rehacer la cuenta.
     */
    precio_vendido: number | null,
}

/**
 * Un **modelo** dentro de una publicación (lo que Amazon llama variación de
 * talla/color): la invernadero que se vende como «Nevera inverter» puede tener
 * `240 L`, `340 L` y `420 L`, cada una con su precio, su foto y sus
 * características.
 *
 * `producto` es la publicación y `producto_modelo` los modelos que se eligen
 * en la web. Un producto sin modelos se sigue vendiendo igual que hoy: los
 * modelos son opcionales.
 *
 * No lleva `negocio`: pertenece a un `producto`, y ese ya es de uno solo.
 * Filtrar por negocio es responsabilidad de quien consulta, uniendo con la
 * publicación (así no puede existir un modelo de ADC colgado de un dulce).
 */
export interface ProductoModelo {
    id: number,
    /** Publicación a la que pertenece: referencia a `producto.id`. */
    producto_id: number,
    /** Nombre corto del modelo: `240 L inverter`, `12 V / 100 Ah`… */
    nombre: string,
    precio: number,
    /** Mismo criterio que `producto.moneda`: texto libre de hasta 8 letras. */
    moneda: string,
    /** Foto del modelo; null si el modelo no tiene foto (se usa la de la publicación). */
    imagen_url: string | null,
    /**
     * Características escritas por el dueño, en pares `etiqueta: valor`
     * (`{ "Peso": "38 kg", "Potencia": "120 W" }`). `jsonb` y no una tabla
     * aparte: el orden de las claves lo fija Postgres, se busca sin JOIN y
     * mañana puede entrar una característica nueva sin tocar el esquema.
     */
    atributos: Record<string, string>,
}

/**
 * Paginación opcional de los GET de catálogo (N-11). Solo corta cuando el
 * cliente manda los dos parámetros válidos; sin ellos (o con uno solo) se
 * devuelve **todo**, porque las vitrinas pintan el catálogo entero y no deben
 * verse truncadas por defecto.
 */
export interface Paginacion {
    /** Página a partir de 1 (la primera es `pagina = 1`). */
    pagina?: number,
    /** Tamaño de página, 1 o más. */
    limite?: number,
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
    /** Descripción larga del producto; null si no tiene. */
    descripcion: string | null,
    /** Moneda del `precio` (`'CUP'`, `'USD'`…). Texto libre de hasta 8 letras. */
    moneda: string,
    /** A qué sección del catálogo pertenece: referencia a `seccion.id`. */
    seccion_id: number | null,
    /** La sección cargada por la relación, o null si no está asignada. */
    seccion: { id: number; nombre: string } | null,
}