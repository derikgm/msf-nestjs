import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Fuente de datos del **CLI de TypeORM**, nada más: el servidor no la usa
 * (monta su propia conexión en `app.module.ts` con `autoLoadEntities`).
 *
 * Existe para poder tocar el esquema de forma explícita desde la terminal,
 * que es lo que pide N-4 (`synchronize` desactivado):
 *
 * ```bash
 * npm run build                                     # compila, no hay ts-node
 * node --env-file=.env node_modules/.bin/typeorm migration:show -d dist/data-source.js
 * node --env-file=.env node_modules/.bin/typeorm migration:run  -d dist/data-source.js
 * node --env-file=.env node_modules/.bin/typeorm migration:generate -d dist/data-source.js <nombre>
 * ```
 *
 * El `DATABASE_URL` del `.env` es el de producción: revisar bien antes de
 * lanzar nada con `migration:run` o `migration:generate` (generar es de solo
 * lectura, ejecutar no).
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // Supabase exige SSL; el Postgres local no lo trae (igual que en app.module).
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  entities: ['dist/**/*.entity.js'],
  migrationsTableName: 'migrations',
  migrations: ['dist/migraciones/*.js'],
  synchronize: false,
  connectTimeoutMS: 30000,
  uuidExtension: 'pgcrypto',
});
