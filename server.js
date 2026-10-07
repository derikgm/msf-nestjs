// server.js
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js'; // Importa tu módulo raíz compilado

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Detrás del proxy de Wasmer, la IP que llega al servidor es la suya y no la
   * del cliente. Sin esto, el rate limiting (N-5) contaría **todas** las
   * peticiones de todos los visitantes en el mismo cubo: con la tienda llena,
   * alguien intentaría entrar y todo el mundo recibiría 429. Con `1` solo se
   * fía de los primeros saltos, que es lo que pone el proxy.
   */
  app.set('trust proxy', 1);

  /**
   * CORS con lista blanca (N-3 / X-6).
   *
   * Antes era `enableCors()` a secas: cualquier página podía leer las
   * respuestas de la API desde el navegador. Ahora solo lo son estos orígenes.
   *
   * Dos matices importantes:
   *  - **No quitar `enableCors()` del todo**: eso no es «más seguridad», es
   *    romper las webs. Sin cabecera `Access-Control-Allow-Origin` el navegador
   *    se niega a entregar la respuesta a JS (la tienda adc y la de Delys
   *    quedarían vacías y el panel no podría ni hacer login).
   *  - El CORS solo lo miran los navegadores: una petición sin cabecera `Origin`
   *    (curl, Postman, servidor a servidor) no entra en CORS y sigue igual.
   */
  const ORIGENES_PERMITIDOS = new Set([
    'https://derikgm.github.io', // tiendas adc y Delys (GitHub Pages)
    'http://localhost:1420', // msf-app en desarrollo (vite)
    'http://localhost:4200', // adc en desarrollo (ng serve)
    'http://127.0.0.1:4200',
  ]);

  app.enableCors({
    origin: (origen, volver) => {
      // Sin Origin no es una web (curl, Postman, el servidor): no hace falta
      // CORS. Con Origin, solo si está en la lista; `false` en vez de error
      // para que el navegador sea el que diga «bloqueado» y el servidor no
      // devuelva un 500 por una cabecera.
      volver(null, !origen || ORIGENES_PERMITIDOS.has(origen));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
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
