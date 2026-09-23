
/**
 * Convierte un SQLiteCloudRowset a un array de objetos planos.
 * Necesario porque el driver devuelve un Rowset iterable, no un Array nativo,
 * y NestJS necesita serializar JSON puro.
 */
export function toPlainArray<T = any>(rowset: any): T[] {
  if (!rowset) return [];
  return Array.from(rowset).map((row: any) => ({ ...row }));
}

/**
 * Para consultas que devuelven una sola fila (SELECT ... WHERE id = ?)
 */
export function toPlainOne<T = any>(rowset: any): T | null {
  const arr = toPlainArray<T>(rowset);
  return arr.length > 0 ? arr[0] : null;
}