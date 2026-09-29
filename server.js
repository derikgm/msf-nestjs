// server.js
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js'; // Importa tu módulo raíz compilado

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.enableShutdownHooks(); // cierra la conexión a la DB al recibir SIGTERM/SIGINT
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos que no están en el DTO
      transform: true, // convierte el body a una instancia del DTO
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`NestJS server listening on ${port}`);
}
bootstrap();
