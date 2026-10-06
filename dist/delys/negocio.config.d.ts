import type { Dulce } from './interfaces/delys.interfaces.js';
export declare const NEGOCIO: unique symbol;
export interface NegocioConfig {
    readonly clave: string;
    readonly articulo: string;
    readonly catalogoInicial: Dulce[];
}
export declare const CONFIG_DELYS: NegocioConfig;
