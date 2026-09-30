import { ValueTransformer } from 'typeorm';

/**
 * Postgres devuelve las columnas `numeric` como string para no perder precisión.
 * Este transformer mantiene el tipo `number` que exigen las interfaces del dominio.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) =>
    value === null || value === undefined ? null : Number(value),
};
