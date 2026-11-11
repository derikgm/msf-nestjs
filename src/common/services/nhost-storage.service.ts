import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.service.js';

/**
 * Storage de Nhost (el mismo servicio Hasura Storage, con API REST).
 *
 * Nhost no es S3 «a pelo»: expone `POST/GET/DELETE /v1/files` y autentica con
 * `X-Hasura-Admin-Secret` para las operaciones de backend. Al subir, el
 * servicio **genera el id** del archivo; no se puede elegir la ruta como en
 * Supabase. Por eso `subir()` devuelve ese id y la URL pública se arma con él:
 *
 *   https://<proyecto>.storage.<región>.nhost.run/v1/files/<id>
 *
 * Configuración (ver `.env.example` y `NHOST.md`):
 *
 * - `STORAGE_PROVIDER=nhost` elige esta implementación.
 * - `NHOST_STORAGE_URL` base de la API, terminada en `/v1` (sin `/files`).
 * - `NHOST_ADMIN_SECRET` secreto de administración del proyecto.
 * - `NHOST_BUCKET` (opcional) bucket único para todos los roles; si falta se
 *   usa el bucket que pide el catálogo (`delys`, `adc`, `domus`).
 * - `NHOST_PUBLIC_URL_BASE` (opcional) base pública distinta, p. ej. un CDN.
 *
 * Nada de esto se valida al arrancar: el cliente es perezoso, así que el
 * servidor levanta aunque falten las claves y solo fallan las subidas de
 * imagen, igual que hace `SupabaseService`.
 */
@Injectable()
export class NhostStorageService implements StorageService {
  private readonly logger = new Logger(NhostStorageService.name);

  constructor(private readonly config: ConfigService) {}

  async subir(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<string> {
    const destino = this.bucketDe(bucket);
    const formulario = new FormData();

    formulario.append('bucket-id', destino);
    formulario.append(
      'file[]',
      new Blob([new Uint8Array(contenido)], { type: contentType }),
      this.nombreDe(path),
    );

    const respuesta = await this.pedir('/files', {
      method: 'POST',
      body: formulario,
    });

    if (!respuesta.ok) {
      throw this.fallo('subir la imagen', await this.mensajeDe(respuesta));
    }

    const cuerpo = (await respuesta.json().catch(() => null)) as
      | { processedFiles?: Array<{ id?: string }>; error?: { message?: string } }
      | null;

    const id = cuerpo?.processedFiles?.[0]?.id;

    if (!id) {
      const motivo =
        cuerpo?.error?.message ??
        'la respuesta de Nhost no trajo processedFiles[0].id';

      throw this.fallo('subir la imagen', motivo);
    }

    this.logger.log(`Imagen subida a Nhost (bucket «${destino}», id ${id})`);

    return id;
  }

  async eliminar(bucket: string, paths: string[]): Promise<void> {
    const destino = this.bucketDe(bucket);

    for (const path of paths) {
      const respuesta = await this.pedir(`/files/${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });

      if (respuesta.ok || respuesta.status === 404) continue;

      const motivo = await this.mensajeDe(respuesta);

      // Si el bucket no existe, no puede haber nada suyo que borrar: es el
      // mismo criterio que en Supabase.
      if (/bucket.*(not found|does not exist)/i.test(motivo)) {
        this.logger.warn(`El bucket «${destino}» no existe: no hay nada que borrar.`);
        return;
      }

      throw this.fallo('borrar la imagen', motivo);
    }
  }

  getPublicUrl(_bucket: string, path: string): string {
    return `${this.basePublica}/${encodeURIComponent(path)}`;
  }

  pathDesdeUrl(_bucket: string, url: string): string | undefined {
    const marca = `${this.basePublica}/`;
    const indice = url.indexOf(marca);

    if (indice === -1) return undefined;

    const resto = url.slice(indice + marca.length);
    const id = resto.split(/[?#]/, 1)[0];

    return id ? decodeURIComponent(id) : undefined;
  }

  /** Base de la API, normalizada a `.../v1` sin barra final. */
  private get baseApi(): string {
    const url = this.config.get<string>('NHOST_STORAGE_URL')?.trim();

    if (!url) {
      throw new ServiceUnavailableException(
        'Falta NHOST_STORAGE_URL en el .env (la base de Storage, terminada en /v1)',
      );
    }

    return url.replace(/\/+$/, '');
  }

  /** Base pública por defecto: la misma API + `/files`. */
  private get basePublica(): string {
    const propia = this.config.get<string>('NHOST_PUBLIC_URL_BASE')?.trim();

    return (propia || `${this.baseApi}/files`).replace(/\/+$/, '');
  }

  private get adminSecret(): string {
    const secreto = this.config.get<string>('NHOST_ADMIN_SECRET')?.trim();

    if (!secreto) {
      throw new ServiceUnavailableException(
        'Falta NHOST_ADMIN_SECRET en el .env (secreto de administración de Nhost)',
      );
    }

    return secreto;
  }

  private bucketDe(bucket: string): string {
    return this.config.get<string>('NHOST_BUCKET')?.trim() || bucket;
  }

  private async pedir(ruta: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseApi}${ruta}`, {
        ...init,
        headers: {
          ...init.headers,
          'X-Hasura-Admin-Secret': this.adminSecret,
        },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const motivo =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Nhost Storage no respondió en 30 segundos'
          : (error as Error).message;

      throw this.fallo(init.method === 'DELETE' ? 'borrar la imagen' : 'subir la imagen', motivo);
    }
  }

  /** El motivo legible de una respuesta de error de Nhost. */
  private async mensajeDe(respuesta: Response): Promise<string> {
    const texto = await respuesta.text().catch(() => '');

    try {
      const cuerpo = JSON.parse(texto) as {
        error?: { message?: string };
        message?: string;
      };

      return (
        cuerpo.error?.message ??
        cuerpo.message ??
        `HTTP ${respuesta.status}`
      );
    } catch {
      return texto.trim() || `HTTP ${respuesta.status}`;
    }
  }

  private fallo(accion: string, motivo: string): InternalServerErrorException {
    return new InternalServerErrorException(
      `Nhost Storage no pudo ${accion}: ${motivo}`,
    );
  }

  /** Nombre con extensión, para que Nhost guarde el `name` y el MIME correctos. */
  private nombreDe(path: string): string {
    const nombre = path.split('/').pop();

    return nombre || 'imagen';
  }
}
