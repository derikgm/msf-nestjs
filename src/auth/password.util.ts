import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const ALGORITHM = 'scrypt';
const KEY_LENGTH = 64;

/**
 * Hash de relleno: se compara cuando el usuario no existe para que el tiempo de
 * respuesta no revele qué nombres de usuario están registrados. Se generó a partir
 * de bytes aleatorios, así que no corresponde a ninguna contraseña.
 */
export const HASH_FICTICIO =
  'scrypt$0e0ec1ebfdad87bd820ccb1dfd6f57e9$f03313b7cab836fed7360ee31633a1b18ecfa00fcc66f1e7d7a8901527dc56a9aa6e7060730a6be577fecb064ed26b28a1108a1442a5616adcb52516521aaa0d';

/**
 * Genera el hash de una contraseña con sal aleatoria.
 * Formato: scrypt$<sal-hex>$<hash-hex>
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);

  return [ALGORITHM, salt.toString('hex'), hash.toString('hex')].join('$');
}

/** Compara en tiempo constante para no filtrar información por tiempos de respuesta. */
export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, saltHex, hashHex] = stored.split('$');

  if (algorithm !== ALGORITHM || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');

  if (expected.length !== KEY_LENGTH) return false;

  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH);

  return timingSafeEqual(expected, actual);
}
