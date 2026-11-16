/**
 * Contrato de las dos "opciones extra" de las páginas (punto 3 de todo.md):
 * las **instalaciones** de ADC y los **combos** de Delys.
 *
 * No viven en `catalogo.interfaces.ts` a propósito. El catálogo (`producto`,
 * `pedido`) es una tabla **compartida** entre negocios y su contrato gira en
 * torno a la columna `negocio`; estas dos entidades son lo contrario: cada una
 * tiene su propia tabla y su propio cuerpo, y no se parecen entre sí (una lleva
 * una lista de textos, la otra una lista de dulces con cantidad). Las clases
 * TypeORM de `../entities/` implementan estas interfaces, así que los tipos de
 * la API y los de la base de datos no se separan.
 */

/** Un servicio de instalación que ofrece ADC. */
export interface Instalacion {
  id: number;
  /** Nombre del servicio: "Paneles solares", "Ecoflow", "Baterías"… */
  nombre_servicio: string;
  precio: number;
  /** Moneda del `precio` (`CUP`, `USD`…). Texto corto, no un enum. */
  moneda: string;
  /** URL pública de la imagen en Storage; null si todavía no tiene. */
  imagen_url: string | null;
  /** Explicación del servicio, un texto por línea. Puede ir vacía. */
  descripcion: string[];
}

/**
 * Un renglón de un combo: un dulce y cuántas unidades lleva.
 *
 * Se guarda el **nombre** y no una FK al catálogo a propósito (punto 3): el
 * combo puede armarse con dulces que ya existen en la base **o** con dulces
 * escritos a mano que no se dan de alta en el catálogo, y de este modo borrar un
 * dulce del catálogo no rompe los combos que lo nombran.
 */
export interface DulceCombo {
  nombre_dulce: string;
  cantidad: number;
}

/** Una oferta de Delys: varios dulces juntos por un precio. */
export interface Combo {
  id: number;
  nombre_combo: string;
  precio: number;
  /** Moneda del `precio` (`CUP`, `USD`…). Texto corto, no un enum. */
  moneda: string;
  /** URL pública de la imagen en Storage; null si todavía no tiene. */
  imagen_url: string | null;
  /** Dulces que componen el combo. Puede ir vacío. */
  dulces: DulceCombo[];
}
