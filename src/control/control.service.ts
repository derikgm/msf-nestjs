import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ControlService {
  private readonly logger = new Logger(ControlService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * `GET /ping` comprueba de verdad: un `SELECT 1` contra Postgres.
   *
   * Antes devolvía `{ ok: true }` a secas, así que respondía "todo bien" un
   * servidor que no sabía ni hablar con la base de datos (N-12). Si la consulta
   * falla devuelve `503`: en `msf-app` el `503` ya está tratado como fallo
   * reintentable (`avisos.ts`), así que el cambio no rompe nada. La forma de la
   * respuesta sigue siendo `{ ok: true }` para no mover a nadie.
   */
  async ping() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      this.logger.error(`GET /ping sin base de datos: ${motivo}`);

      throw new ServiceUnavailableException(
        'El servidor está vivo pero no puede consultar la base de datos',
      );
    }

    return { ok: true };
  }
}
