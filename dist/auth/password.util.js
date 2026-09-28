import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
const ALGORITHM = 'scrypt';
const KEY_LENGTH = 64;
export function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, KEY_LENGTH);
    return [ALGORITHM, salt.toString('hex'), hash.toString('hex')].join('$');
}
export function verifyPassword(password, stored) {
    const [algorithm, saltHex, hashHex] = stored.split('$');
    if (algorithm !== ALGORITHM || !saltHex || !hashHex)
        return false;
    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== KEY_LENGTH)
        return false;
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
    return timingSafeEqual(expected, actual);
}
//# sourceMappingURL=password.util.js.map