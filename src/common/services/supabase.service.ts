import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearSupabaseClient } from '../providers/supabase.provider.js';

@Injectable()
export class SupabaseService {
  private cliente: SupabaseClient | undefined;

  constructor(private readonly config: ConfigService) {}

  getClient(): SupabaseClient {
    return (this.cliente ??= crearSupabaseClient(this.config));
  }

  /** Sube un binario al bucket y devuelve la ruta dentro del bucket. */
  async subir(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.getClient()
      .storage.from(bucket)
      .upload(path, contenido, { contentType, upsert: false });

    if (error) {
      throw new Error(`Supabase Storage rechazó la subida: ${error.message}`);
    }

    return path;
  }

  /** Borra objetos del bucket. */
  async eliminar(bucket: string, paths: string[]): Promise<void> {
    if (!paths.length) return;

    const { error } = await this.getClient().storage.from(bucket).remove(paths);

    if (error) {
      throw new Error(`Supabase Storage no pudo borrar: ${error.message}`);
    }
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
}
