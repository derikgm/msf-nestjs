import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageService } from './storage.service.js';

/**
 * Storage de Appwrite (cloud o self-hosted).
 *
 * Es el mismo contrato que `SupabaseService` y `NhostStorageService`
 * (`subir`/`eliminar`/`getPublicUrl`/`pathDesdeUrl`), así que el resto de la
 * app no sabe (ni le importa) cuál proveedor tenga Storage activo:
 *
 * - Sube un binario a un bucket con el endpoint REST multipart de Appwrite:
 *
 *   POST {APPWRITE_API_URL}/storage/buckets/{bucketId}/files
 *   multipart: fileId, file, permissions[], folder?
 *   headers: X-Appwrite-Key, X-Appwrite-Project
 *
 *   Appwrite **genera el id** del archivo (`fileId`, p. ej. con `ID.unique()`);
 *   no se puede elegir la ruta como en Supabase. El id se devuelve en la
 *   respuesta (`$id`) y la URL pública se arma con él.
 *
 * - Borra por id: DELETE {APPWRITE_API_URL}/storage/buckets/{bucketId}/files/{fileId}
 * - URL pública (para embeber en `<img src>`): .../files/{fileId}/preview?project={project}
 *
 * Configuración (ver `.env.example` y `APPWRITE.md`):
 *
 * - `STORAGE_PROVIDER=appwrite` elige esta implementación.
 * - `APPWRITE_API_URL` base de la API, terminada en `/v1` (por defecto
 *   `https://cloud.appwrite.io/v1`).
 * - `APPWRITE_PROJECT_ID` id del proyecto al que pertenece el bucket.
 * - `APPWRITE_API_KEY` secreto del backend (API key con scope `files.*`).
 * - `APPWRITE_BUCKET` (opcional) bucket único para todos los roles; si falta se
 *   usa el bucket que pide el catálogo (`delys`, `adc`, `domus`).
 * - `APPWRITE_PUBLIC_URL_BASE` (opcional) base pública distinta.
 *
 * Nada de esto se valida al arrancar: el cliente es perezoso, así que el
 * servidor levanta aunque falten las claves y solo fallan las subidas de
 * imagen, igual que hace `SupabaseService`.
 */
@Injectable()
export class AppwriteStorageService implements StorageService {
  private readonly logger = new Logger(AppwriteStorageService.name);

  /** Subidas hechas en esta instancia: `bucket/path` → id que Appwrite asignó. */
  private readonly subidas = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  async subir(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<string> {
    const destino = this.bucketDe(bucket);
    const fileId = this.nuevoId();
    const carpeta = this.carpetaDe(path);

    const formulario = new FormData();
    formulario.append('fileId', fileId);
    formulario.append(
      'file',
      new Blob([new Uint8Array(contenido)], { type: contentType }),
      path.split('/').pop() || 'imagen',
    );
    // `read("any")`: que la URL pública sirva la imagen sin credenciales.
    formulario.append('permissions[]', 'read("any")');

    if (carpeta) formulario.append('folder', carpeta);

    const respuesta = await this.pedir(`/storage/buckets/${encodeURIComponent(destino)}/files`, {
      method: 'POST',
      body: formulario,
    });

    if (!respuesta.ok) {
      throw this.fallo('subir la imagen', await this.mensajeDe(respuesta));
    }

    const cuerpo = (await respuesta.json().catch(() => null)) as
      | { $id?: string; error?: { message?: string }; message?: string }
      | null;

    const id = cuerpo?.$id;

    if (!id) {
      const motivo =
        cuerpo?.error?.message ??
        cuerpo?.message ??
        'la respuesta de Appwrite no trajo $id';

      throw this.fallo('subir la imagen', motivo);
    }

    this.subidas.set(`${bucket}/${path}`, id);

    this.logger.log(`Imagen subida a Appwrite (bucket «${destino}», id ${id})`);

    return id;
  }

  async eliminar(bucket: string, paths: string[]): Promise<void> {
    const destino = this.bucketDe(bucket);

    for (const path of paths) {
      const id = this.subidas.get(`${bucket}/${path}`) ?? path;

      const respuesta = await this.pedir(
        `/storage/buckets/${encodeURIComponent(destino)}/files/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );

      if (respuesta.ok || respuesta.status === 404) continue;

      const motivo = await this.mensajeDe(respuesta);

      // Si el bucket no existe, no puede haber nada suyo que borrar: es el
      // mismo criterio que en Supabase y Nhost.
      if (/bucket.*(not found|does not exist)|not_found/i.test(motivo)) {
        this.logger.warn(`El bucket «${destino}» no existe: no hay nada que borrar.`);
        return;
      }

      throw this.fallo('borrar la imagen', motivo);
    }
  }

  /**
   * URL pública y estable que se guarda en la fila (`imagen_url`). Sirve el
   * binario directamente (`/download`); el `/preview` aplica transformaciones
   * que planes bajos no permiten.
   */
  getPublicUrl(bucket: string, path: string): string {
    const destino = this.bucketDe(bucket);
    const id = this.subidas.get(`${bucket}/${path}`) ?? path;

    const base = (this.urlPublicaBase).replace(/\/+$/, '');
    const proyecto = this.proyecto ? `?project=${encodeURIComponent(this.proyecto)}` : '';

    // El endpoint `/download` sirve el binario (el `/preview` aplica
    // transformaciones de imagen que el plan gratuito bloquea).
    return `${base}/storage/buckets/${encodeURIComponent(destino)}/files/${encodeURIComponent(id)}/download${proyecto}`;
  }

  pathDesdeUrl(bucket: string, url: string): string | undefined {
    const patron = /\/storage\/buckets\/([^/]+)\/files\/([^/]+)/;

    const coincidencia = url.match(patron);

    if (!coincidencia) return undefined;

    const [, bucketId, id] = coincidencia;

    // Igual que en Nhost: el id es lo que se usa para borrar; el bucket lo
    // resuelve el llamador (con `APPWRITE_BUCKET` o el del rol).
    return id ? decodeURIComponent(id) : undefined;
  }

  /** Base de la API de Appwrite, normalizada a `.../v1` sin barra final. */
  private get baseApi(): string {
    const url = this.config.get<string>('APPWRITE_ENDPOINT')?.trim();

    if (url) return url.replace(/\/+$/, '');

    return 'https://cloud.appwrite.io/v1';
  }

  /** Base pública por defecto: la misma API (el bucket ya está dentro de /v1). */
  private get urlPublicaBase(): string {
    const propia = this.config.get<string>('APPWRITE_PUBLIC_URL_BASE')?.trim();

    return propia || this.baseApi;
  }

  private get apiKey(): string {
    const clave = this.config.get<string>('APPWRITE_API_KEY')?.trim();

    if (!clave) {
      throw new ServiceUnavailableException(
        'Falta APPWRITE_API_KEY en el .env (secreto de la API key de Appwrite, ' +
          'con scope files.* en el proyecto). Ver `APPWRITE.md`.',
      );
    }

    return clave;
  }

  private get proyecto(): string {
    return this.config.get<string>('APPWRITE_PROJECT_ID')?.trim() ?? '';
  }

  private get apiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Appwrite-Key': this.apiKey,
    };

    if (this.proyecto) headers['X-Appwrite-Project'] = this.proyecto;

    return headers;
  }

  private bucketDe(bucket: string): string {
    return this.config.get<string>('APPWRITE_BUCKET')?.trim() || bucket;
  }

  private carpetaDe(path: string): string {
    const partes = path.split('/').filter(Boolean);

    if (partes.length < 2) return '';

    const carpeta = `${partes.slice(0, -1).join('/')}/`;

    // Appwrite solo acepta una jerarquía de carpetas virtuales por archivo.
    return carpeta;
  }

  private nuevoId(): string {
    const aleatorio = Math.random().toString(36).slice(2, 10);

    return `${Date.now().toString(36)}${aleatorio}`;
  }

  private async pedir(ruta: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseApi}${ruta}`, {
        ...init,
        headers: {
          ...init.headers,
          ...this.apiHeaders,
        },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const motivo =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Appwrite Storage no respondió en 30 segundos'
          : (error as Error).message;

      throw this.fallo(
        init.method === 'DELETE' ? 'borrar la imagen' : 'subir la imagen',
        motivo,
      );
    }
  }

  /** El motivo legible de una respuesta de error de Appwrite. */
  private async mensajeDe(respuesta: Response): Promise<string> {
    const texto = await respuesta.text().catch(() => '');

    try {
      const cuerpo = JSON.parse(texto) as {
        error?: { message?: string };
        message?: string;
        type?: string;
      };

      return (
        cuerpo.error?.message ??
        cuerpo.message ??
        cuerpo.type ??
        `HTTP ${respuesta.status}`
      );
    } catch {
      return texto.trim() || `HTTP ${respuesta.status}`;
    }
  }

  private fallo(accion: string, motivo: string): InternalServerErrorException {
    return new InternalServerErrorException(
      `Appwrite Storage no pudo ${accion}: ${motivo}`,
    );
  }
}
