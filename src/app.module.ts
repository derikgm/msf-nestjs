import { Module } from '@nestjs/common';
import { DelysModule } from './delys/delys.module.js';
import { ControlModule } from './control/control.module.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigService esté disponible en toda la app
    }),
    DelysModule, ControlModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
