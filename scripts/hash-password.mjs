import { hashPassword } from '../dist/auth/password.util.js';

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run hash-password -- "mi contraseña"');
  process.exit(1);
}

console.log(hashPassword(password));
