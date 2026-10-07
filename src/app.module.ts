import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { DelysModule } from './delys/delys.module.js';
import { AdcModule } from './adc/adc.module.js';
import { ControlModule } from './control/control.module.js';
import { AuthModule } from './auth/auth.module.js';
import { StorageQuotaModule } from './common/modules/storage-quota/storage-quota.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Inicial1791390744944 } from './migraciones/1791390744944-Inicial.js';

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
     * necesitarlo.
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
        // Supabase exige SSL; el Postgres local no lo trae. En local se apaga
        // poniendo DB_SSL=false; si no se define, se asume SSL (comportamiento
        // original, el que usa el despliegue en Wasmer contra Supabase).
        ssl:
          configService.get<string>('DB_SSL') === 'false'
            ? false
            : { rejectUnauthorized: false },
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
