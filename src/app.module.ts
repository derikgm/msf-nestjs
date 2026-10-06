import { Module } from '@nestjs/common';
import { DelysModule } from './delys/delys.module.js';
import { AdcModule } from './adc/adc.module.js';
import { ControlModule } from './control/control.module.js';
import { AuthModule } from './auth/auth.module.js';
import { StorageQuotaModule } from './common/modules/storage-quota/storage-quota.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'), // 👈 Usar cadena de conexión completa
        autoLoadEntities: true,
        synchronize: true,
        ssl: {
          rejectUnauthorized: false,
        },
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
  providers: [],
})
export class AppModule {}
