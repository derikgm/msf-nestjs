import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ObjectLiteral, Repository } from 'typeorm';
import { SupabaseService } from './supabase.service.js';
import { StorageQuotaService } from './storage-quota.service.js';

export type MulterFile = Express.Multer.File;

/** Un bucket por proyecto. El que falte lo crea el servidor al subir (ver `SupabaseService`). */
export const BUCKET_POR_ROL: Record<string, string> = {
  delys: 'delys',
  domus: 'domus',
  adc: 'adc',
};

/**
 * Lo mínimo que este servicio necesita de una fila para gestionar su imagen.
 * Lo cumplen `Dulce`, `Instalacion` y `Combo`: los tres tienen una URL y un
 * contador de bytes.
 */
export interface ConImagen {
  imagen_url: string | null;
  imagen_bytes: number | null;
}

/**
 * Subida y borrado de imágenes contra Supabase Storage, **una sola vez** para
 * todas las entidades que tienen foto (el catálogo y, desde el punto 3, las
 * instalaciones de ADC y los combos de Delys).
 *
 * Antes esta lógica vivía dentro de `DulceImagenService`; al aparecer dos
 * entidades más con imagen habría quedado copiada tres veces. Aquí queda el
 * "cómo" (reservar cuota, subir, soltar la anterior, reintentar el borrado) y
 * cada servicio se queda con el "qué" (buscar su fila, armar su respuesta).
 *
 * La cuota se reserva **antes** de subir y se devuelve si la subida falla, y la
 * imagen anterior se suelta **después** de guardar la fila (N-19), para que un
 * fallo a mitad no deje la base apuntando a una URL vacía ni un archivo huérfano
 * sin dueño.
 */
@Injectable()
export class ImagenService {
  private readonly logger = new Logger(ImagenService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cuota: StorageQuotaService,
  ) {}

  /**
   * Sube la imagen de una fila y deja en ella la URL y los bytes nuevos.
   *
   * `carpeta` agrupa los archivos dentro del bucket (`dulces/`, `instalaciones/`,
   * `combos/`) y `etiqueta` es cómo se nombra la fila en los mensajes
   * ("producto 7"), para que los errores se entiendan.
   */
  async subir<T extends ObjectLiteral & ConImagen>(
    repo: Repository<T>,
    entidad: T,
    file: MulterFile,
    rol: string,
    carpeta: string,
    etiqueta: string,
  ): Promise<T> {
    const bucket = this.bucketDe(rol);
    const bytes = file.size;

    const reservado = await this.cuota.reservarCuota(rol, bytes);

    if (!reservado) {
      const resumen = await this.cuota.getResumen(rol);

      throw new BadRequestException(
        `La cuota de "${rol}" no alcanza para esta imagen: ` +
          `usa ${resumen.bytes_usados} de ${resumen.limite_bytes} bytes ` +
          `(${resumen.bytes_disponibles} disponibles) y la imagen pesa ${bytes} bytes`,
      );
    }

    const path = `${carpeta}/${randomUUID()}${this.extensionDe(file)}`;

    try {
      await this.supabase.subir(bucket, path, file.buffer, file.mimetype);
    } catch (error) {
      await this.cuota.decrementarUso(rol, bytes);
      throw error;
    }

    const urlAnterior = entidad.imagen_url;
    const bytesAnteriores = entidad.imagen_bytes;

    entidad.imagen_url = this.supabase.getPublicUrl(bucket, path);
    entidad.imagen_bytes = bytes;

    const actualizado = await repo.save(entidad);

    if (urlAnterior) {
      await this.soltar(urlAnterior, bytesAnteriores, etiqueta, rol);
    }

    return actualizado;
  }

  /** Borra la imagen de Storage, devuelve los bytes a la cuota y vacía la fila. */
  async eliminar<T extends ObjectLiteral & ConImagen>(
    repo: Repository<T>,
    entidad: T,
    rol: string,
    etiqueta: string,
  ): Promise<T> {
    if (!entidad.imagen_url) {
      throw new BadRequestException(`El ${etiqueta} no tiene imagen`);
    }

    await this.soltar(entidad.imagen_url, entidad.imagen_bytes, etiqueta, rol);

    entidad.imagen_url = null;
    entidad.imagen_bytes = null;

    return repo.save(entidad);
  }

  /**
   * Libera la imagen de una fila que se va a borrar: quita el archivo de Storage
   * y devuelve los bytes a la cuota del rol.
   *
   * A diferencia de `eliminar()`, no falla si la fila no tiene imagen, porque
   * borrarla sin foto es lo normal. Está pensado para que quien borre la fila no
   * tenga que saber nada de Storage ni de la cuota. Si Storage no responde, el
   * fallo se registra pero no detiene el borrado.
   */
  async liberarParaBorrar(entidad: ConImagen, rol: string, etiqueta: string): Promise<void> {
    try {
      await this.soltar(entidad.imagen_url, entidad.imagen_bytes, etiqueta, rol);
    } catch (error) {
      this.logger.error(
        `No se pudo liberar la imagen de ${etiqueta}: ${(error as Error).message}. ` +
          'El archivo queda pendiente de limpiar a mano.',
        (error as Error).stack,
      );
    }
  }

  /**
   * Borra el archivo de Storage y, si se borró, devuelve sus bytes a la cuota.
   *
   * N-19: si el borrado falla se reintenta una vez y, si sigue fallando, se
   * loguea como **error** con el path concreto. La cuota no se devuelve si el
   * archivo sigue en Storage, para que el contador y el espacio real no se
   * descuadren.
   */
  private async soltar(
    imagenUrl: string | null,
    imagenBytes: number | null,
    etiqueta: string,
    rol: string,
  ) {
    if (!imagenUrl) return;

    const bucket = this.bucketDe(rol);
    const path = this.supabase.pathDesdeUrl(bucket, imagenUrl);

    if (!path) return;

    try {
      await this.supabase.eliminar(bucket, [path]);
    } catch (error) {
      this.logger.warn(
        `No se pudo borrar la imagen de ${etiqueta} (${path}): ${(error as Error).message}. Reintentando...`,
      );

      try {
        await this.supabase.eliminar(bucket, [path]);
      } catch (segundoError) {
        this.logger.error(
          `La imagen de ${etiqueta} (${path}) sigue sin borrarse tras el reintento: ` +
            `${(segundoError as Error).message}. El archivo queda pendiente de limpiar a mano y su cuota no se libera.`,
        );
        return;
      }
    }

    if (imagenBytes) await this.cuota.decrementarUso(rol, imagenBytes);
  }

  private bucketDe(rol: string) {
    return BUCKET_POR_ROL[rol] ?? rol;
  }

  /** Normaliza la extensión que manda el cliente: solo letras, y corta. */
  private extensionDe(file: MulterFile) {
    const extension = extname(file.originalname ?? '').toLowerCase();

    return /^\.[a-z0-9]{1,5}$/.test(extension) ? extension : '.bin';
  }
}
