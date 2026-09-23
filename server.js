// server.js
import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js'; // Importa tu módulo raíz compilado

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`NestJS server listening on ${port}`);
}
bootstrap();