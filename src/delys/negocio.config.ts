import { ofertas } from './data/ofertas.js';
import type { Dulce } from './interfaces/delys.interfaces.js';

/**
 * Quién atiende cada módulo del catálogo (punto 6 de msf-app/todo.md).
 *
 * La decisión del enunciado es **compartir tablas con una columna `negocio`**
 * en vez de duplicar tablas y servicios para ADC: la estructura es la misma y
 * duplicarla costaría CPU y mantenimiento. Para que eso no acabe con Delys
 * viendo los productos de ADC, la misma clase de servicio se monta una vez por
 * negocio, cada una con su configuración:
 *
 * - `clave`: el valor de la columna `negocio` en `producto` y `pedido`. **Es el
 *   filtro de todas las consultas**, así que un negocio no lee ni escribe las
 *   filas del otro.
 * - `articulo`: cómo se llama lo que se vende (`dulce` en Delys, `producto` en
 *   ADC), para que los mensajes de la API no le hablen de dulces a ADC.
 * - `catalogoInicial`: con qué se siembra la tabla si ese negocio todavía no
 *   tiene filas. ADC arranca vacío: su catálogo lo llena su dueño.
 *
 * El token es un `Symbol`: si un módulo se olvidara de proveerlo, NestJS para
 * en el arranque con un error claro en vez de mezclar los dos negocios.
 */
export const NEGOCIO = Symbol('NEGOCIO');

export interface NegocioConfig {
  /** Valor de la columna `negocio`. */
  readonly clave: string;
  /** Nombre en minúscula de lo que se vende. */
  readonly articulo: string;
  /** Catálogo con el que arranca si la tabla de este negocio está vacía. */
  readonly catalogoInicial: Dulce[];
}

/** La pastelería: lo que ya existe en la base es suyo. */
export const CONFIG_DELYS: NegocioConfig = {
  clave: 'delys',
  articulo: 'dulce',
  catalogoInicial: ofertas,
};
