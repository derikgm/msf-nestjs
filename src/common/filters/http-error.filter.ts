import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Filtro de excepciones global (registrado con `APP_FILTER` en `app.module.ts`).
 *
 * Sustituye al manejador por defecto de Nest con una única misión: **que ningún
 * error se vaya sin log**. Antes un `QueryFailedError` (una carrera, un check
 * roto...) caía en el `500` genérico de Express sin dejar rastro; aquí todo pasa
 * por `Logger` con el método, la ruta y el motivo.
 *
 * Formato de respuesta, homogéneo:
 *
 * ```json
 * { "statusCode": 400, "mensaje": "..." }
 * ```
 *
 * - Las `HttpException` (las que lanza el código con `BadRequestException`,
 *   `UnauthorizedException`, etc.) conservan su `statusCode` de siempre
 *   (400/401/403/404/409/429/503...): solo se reempaqueta la forma de la
 *   respuesta, no el código.
 * - Los errores con `status` 4xx que no pasan por Nest (p. ej. el `413` de
 *   Express cuando el body se pasa del límite de multer) también se respetan.
 * - `400` de validación: `ValidationPipe` devuelve `message` como **array** de
 *   mensajes; aquí viaja en `mensaje` tal cual (el panel los junta con ". ").
 * - Todo lo demás es `500` con mensaje genérico y el **stack completo** al log:
 *   al cliente no le sirve el detalle interno, al `Logger` sí.
 *
 * Los clientes que ya leían el `message` del formato antiguo de Nest siguen
 * funcionando: `servidor.ts` del panel acepta `mensaje` y, por compatibilidad,
 * `message`.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(excepcion: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const respuesta = ctx.getResponse<Response>();
    const peticion = ctx.getRequest<Request>();
    const ruta = `${peticion.method} ${peticion.url}`;

    // Errores lanzados como HttpException (los que usa todo el código).
    if (excepcion instanceof HttpException) {
      const status = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();
      const mensaje =
        typeof cuerpo === 'string'
          ? cuerpo
          : (cuerpo as { message?: unknown }).message;

      if (status >= 500) {
        this.logger.error(
          `${ruta} -> ${status}: ${JSON.stringify(mensaje)}`,
          excepcion.stack,
        );
      } else {
        this.logger.warn(`${ruta} -> ${status}: ${JSON.stringify(mensaje)}`);
      }

      respuesta.status(status).json({ statusCode: status, mensaje });
      return;
    }

    // Errores 4xx que llegan de Express sin ser HttpException: el más común es
    // el `413 PayloadTooLargeError` (body o subida más grande de lo permitido).
    // Se tratan como error de cliente, no se loguean como del servidor.
    const statusBruto = (excepcion as { status?: unknown })?.status;
    if (
      typeof statusBruto === 'number' &&
      Number.isInteger(statusBruto) &&
      statusBruto >= 400 &&
      statusBruto < 500
    ) {
      const mensaje =
        (excepcion as { message?: unknown })?.message ?? 'Petición inválida';

      this.logger.warn(`${ruta} -> ${statusBruto}: ${JSON.stringify(mensaje)}`);
      respuesta.status(statusBruto).json({ statusCode: statusBruto, mensaje });
      return;
    }

    // Todo lo demás: un fallo del servidor sin contemplar.
    const detalle = (excepcion as Error)?.stack ?? String(excepcion);
    this.logger.error(`${ruta} -> 500`, detalle);
    respuesta
      .status(500)
      .json({ statusCode: 500, mensaje: 'Error interno del servidor' });
  }
}