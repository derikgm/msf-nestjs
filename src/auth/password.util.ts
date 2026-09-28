import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const ALGORITHM = 'scrypt';
const KEY_LENGTH = 64;

/**
 * Genera el hash de una contraseña con sal aleatoria.
 * Formato: scrypt$<sal-hex>$<hash-hex>
 * Genera uno con: npm run hash-password -- "mi contraseña"
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
