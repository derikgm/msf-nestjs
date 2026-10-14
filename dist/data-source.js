import 'reflect-metadata';
import { DataSource } from 'typeorm';
export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    entities: ['dist/**/*.entity.js'],
    migrationsTableName: 'migrations',
    migrations: ['dist/migraciones/*.js'],
    synchronize: false,
    connectTimeoutMS: 30000,
    uuidExtension: 'pgcrypto',
});
//# sourceMappingURL=data-source.js.map