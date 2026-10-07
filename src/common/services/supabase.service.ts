import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearSupabaseClient } from '../providers/supabase.provider.js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private cliente: SupabaseClient | undefined;

  constructor(private readonly config: ConfigService) {}

  getClient(): SupabaseClient {
    return (this.cliente ??= crearSupabaseClient(this.config));
  }

  /**
   * Sube un binario al bucket y devuelve la ruta dentro del bucket.
   *
   * El bucket es **por proyecto** (`BUCKET_POR_ROL`, ver `dulce-imagen.service`)
   * y hasta ahora tenía que existir previamente en Supabase: si no, Storage
   * contestaba *Bucket not found*, eso se lanzaba como `Error` a secas y Nest lo
   * convertía en un `500 {"message":"Internal server error"}` sin decir nada —
   * fue el fallo que vio el usuario subiendo la foto de un producto de ADC.
   *
   * Por eso, si falta el bucket **se crea aquí mismo** (público, igual que
   * `delys`, porque las imágenes se sirven por URL) y se repite la subida: un
   * negocio nuevo no depende de un paso manual en Supabase, y el error original
   * de "bucket not found" es el que menos importa.
   */
  async subir(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<string> {
    const error = await this.probarSubida(bucket, path, contenido, contentType);

    if (!error) return path;

    if (this.faltaElBucket(error.message)) {
      await this.asegurarBucket(bucket);

      const reintento = await this.probarSubida(bucket, path, contenido, contentType);
      if (!reintento) return path;

      throw this.falloDeStorage('subir la imagen', reintento.message);
    }

    throw this.falloDeStorage('subir la imagen', error.message);
  }

  /**
   * Borra objetos del bucket.
   *
   * Si el bucket no existe, **no se falla**: no puede haber ningún archivo suyo
   * que borrar. Se sigue con la fila y con la cuota, que es lo que le importa
   * al catálogo.
   */
  async eliminar(bucket: string, paths: string[]): Promise<void> {
    if (!paths.length) return;

    const { error } = await this.getClient().storage.from(bucket).remove(paths);

    if (!error) return;

    if (this.faltaElBucket(error.message)) {
      this.logger.warn(`El bucket «${bucket}» no existe: no hay nada que borrar.`);
      return;
    }

    throw this.falloDeStorage('borrar la imagen', error.message);
  }

  getPublicUrl(bucket: string, path: string): string {
    return this.getClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Reconstruye la ruta del bucket a partir de la URL pública, para poder borrar
   * el archivo cuando se quita la imagen de un dulce.
   */
  pathDesdeUrl(bucket: string, url: string): string | undefined {
    const marca = `/object/public/${bucket}/`;
    const indice = url.indexOf(marca);

    if (indice === -1) return undefined;

    return decodeURIComponent(url.slice(indice + marca.length));
  }

  /** Devuelve el motivo del fallo, o `null` si la subida salió bien. */
  private async probarSubida(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<{ message: string } | null> {
    const { error } = await this.getClient()
      .storage.from(bucket)
      .upload(path, contenido, { contentType, upsert: false });

    return error ?? null;
  }

  /** Crea el bucket si todavía no está. Es público: las fotos se sirven por URL. */
  private async asegurarBucket(bucket: string): Promise<void> {
    const { error } = await this.getClient().storage.createBucket(bucket, {
      public: true,
    });

    // Dos subidas simultáneas pueden chocar al crearlo: si ya está, no es fallo.
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw this.falloDeStorage(`crear el bucket «${bucket}»`, error.message);
    }

    this.logger.log(`Creado el bucket «${bucket}» de Storage (faltaba).`);
  }

  /** El motivo que devuelve Supabase cuando el bucket no existe. */
  private faltaElBucket(motivo: string): boolean {
    return /bucket\s+(not found|does not exist)|not found.*bucket/i.test(motivo);
  }

  /**
   * Un fallo de Storage, como `HttpException` y con el motivo legible.
   *
   * Sin esto, Nest recibía un `Error` a secas y respondía un `500` mudo
   * ("Internal server error"): la app no tenía nada que enseñarle al usuario.
   * Sigue siendo un `500` (falló el servidor, no quien sube la foto), pero ya
   * dice qué.
   */
  private falloDeStorage(accion: string, motivo: string): InternalServerErrorException {
    return new InternalServerErrorException(`Supabase Storage no pudo ${accion}: ${motivo}`);
  }
}
