import { Module } from '@nestjs/common';
import { DelysModule } from './delys/delys.module.js';
import { ControlModule } from './control/control.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'), // 👈 Usar cadena de conexión completa
        autoLoadEntities: true,
        synchronize: true,
        ssl: {
          rejectUnauthorized: false,
        },
        connectTimeoutMS: 30000,
      }),
    }),
    DelysModule,
    ControlModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}