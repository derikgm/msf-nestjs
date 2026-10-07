import type { NegocioConfig } from '../common/config/negocio.config.js';

/**
 * ADC: productos variados e instalación de paneles solares (punto 6 de
 * msf-app/todo.md). Comparte las tablas con Delys y se separa por la columna
 * `negocio`.
 *
 * El catálogo **arranca vacío**: aquí no se siembra nada (los dulces del
 * `data/ofertas.ts` son de la pastelería y no deben colarse en ADC). El primer
 * usuario del rol `adc` se crea solo con `POST /auth/registro`, que está
 * público mientras ese rol no tenga usuarios.
 */
export const CONFIG_ADC: NegocioConfig = {
  clave: 'adc',
  articulo: 'producto',
  catalogoInicial: [],
};
