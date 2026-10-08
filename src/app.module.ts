import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { HttpErrorFilter } from './common/filters/http-error.filter.js';
import { DelysModule } from './delys/delys.module.js';
import { AdcModule } from './adc/adc.module.js';
import { ControlModule } from './control/control.module.js';
import { AuthModule } from './auth/auth.module.js';
import { StorageQuotaModule } from './common/modules/storage-quota/storage-quota.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Inicial1791390744944 } from './migraciones/1791390744944-Inicial.js';

/**
 * N-6: opciones SSL de la conexión a Postgres.
 *
 * - `DB_SSL=false` → sin TLS (Postgres local sin certificados).
 * - `DB_CA_CERT` con el pem de la CA (escrito en una línea, con `\n` literal)
 *   → `rejectUnauthorized: true`: solo se acepta un certificado firmado por
 *   esa CA. Si la CA no se puede comprobar, la conexión falla en vez de
 *   validar a ciegas.
 * - ninguna de las dos → el comportamiento de siempre
 *   (`rejectUnauthorized: false`), que es el del despliegue actual en Wasmer
 *   contra Supabase: sin verificación de la CA no se rompe ese despliegue.
 */
function opcionesSsl(configService: ConfigService) {
  if (configService.get<string>('DB_SSL') === 'false') return false;

  const ca = configService.get<string>('DB_CA_CERT')?.replace(/\\n/g, '\n');

  return ca
    ? { rejectUnauthorized: true, ca }
    : { rejectUnauthorized: false };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    /**
     * N-5 · Rate limiting: `300` peticiones por minuto e IP como techo general
     * (una tienda recorriendo catálogo, imágenes y login no se acerca) y, en
     * las cuatro rutas que se fuerzan sin cuenta —`POST /auth/login`,
     * `POST /auth/registro`, `POST /delys/pedido` y `POST /adc/pedido`—
     * `@Throttle` las baja a `10` por minuto (ver cada controlador).
     *
     * Ojo con dos cosas: el `ttl` va en **milisegundos** (de ahí el helper
     * `minutes()`), y el guard se registra globalmente con `APP_GUARD`, así
     * que `@SkipThrottle()` es la vía de escape si alguna ruta llegara a
     * necesitarlo. Hoy lo usan los GET públicos de catálogo (Delys y ADC):
     * la vitrina los pinta enteros en cada visita y un 429 se leería como
     * «la web está caída», no como abuso. El abuso se acota en las cuatro
     * POST que se fuerzan sin cuenta.
     */
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: minutes(1),
          limit: 300,
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'), // 👈 Usar cadena de conexión completa
        autoLoadEntities: true,
        /**
         * N-4: el esquema deja de "adivinarlo" TypeORM en cada arranque.
         * `synchronize: true` añadía columnas y, sobre todo, **borraba** las
         * que la entidad no conocía (véase la advertencia de
         * `migraciones/001-moneda.sql`: una columna aparecía y desaparecía al
         * enfriarse Wasmer). Ahora el esquema solo cambia con una migración en
         * `src/migraciones/`, y `migrationsRun` la aplica al arrancar.
         *
         * Cómo se hacen los cambios de esquema: ver `src/data-source.ts`.
         */
        synchronize: false,
        migrations: [Inicial1791390744944],
        migrationsTableName: 'migrations',
        migrationsRun: true,
        // N-6: la verificación de la CA depende de `DB_CA_CERT` (ver
        // `opcionesSsl()` arriba). Sin esa variable se mantiene el
        // comportamiento original (`rejectUnauthorized: false`), el del
        // despliegue en Wasmer contra Supabase.
        ssl: opcionesSsl(configService),
        connectTimeoutMS: 30000,
        uuidExtension: 'pgcrypto', // para que los ids uuid se generen en Postgres
      }),
    }),
    DelysModule,
    AdcModule,
    ControlModule,
    AuthModule,
    StorageQuotaModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // N-18: cada excepción se loguea con Logger y la respuesta de error es
    // siempre { statusCode, mensaje }. Ver src/common/filters/http-error.filter.ts.
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule {}
