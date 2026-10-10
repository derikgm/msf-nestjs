import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Dulce } from '../entities/index.js';
import { NEGOCIO, type NegocioConfig } from '../config/negocio.config.js';
import { SupabaseService } from './supabase.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';

export type MulterFile = Express.Multer.File;

/** Un bucket por proyecto. El que falte lo crea el servidor al subir (ver `SupabaseService`). */
const BUCKET_POR_ROL: Record<string, string> = {
  delys: 'delys',
  domus: 'domus',
  adc: 'adc',
};

@Injectable()
export class DulceImagenService {
  private readonly logger = new Logger(DulceImagenService.name);

  constructor(
    /**
     * Negocio del módulo que monta este servicio: el producto se busca **también**
     * por `negocio`, porque Delys y ADC comparten tabla (punto 6) y un token de
     * ADC no debe subir ni borrar la foto de un producto de Delys conociendo su id.
     */
    @Inject(NEGOCIO)
    private readonly config: NegocioConfig,
    @Inject(getRepositoryToken(Dulce))
    private readonly dulceRepo: Repository<Dulce>,
    private readonly supabase: SupabaseService,
    private readonly cuota: StorageQuotaService,
  ) {}

  /**
   * Sube la imagen de un dulce. La cuota se reserva antes de subir y se devuelve
   * si la subida falla, para que el contador nunca se quede desfasado.
   *
   * El tamaño es el que calculó Multer en el servidor (file.size); nada de lo que
   * mande el cliente se usa para decidir.
   */
  async subir(dulceId: number, file: MulterFile, caller: AuthUser) {
    const dulce = await this.obtenerDulce(dulceId);
    const bucket = this.bucketDe(caller.rol);
    const bytes = file.size;

    const reservado = await this.cuota.reservarCuota(caller.rol, bytes);

    if (!reservado) {
      const resumen = await this.cuota.getResumen(caller.rol);

      throw new BadRequestException(
        `La cuota de "${caller.rol}" no alcanza para esta imagen: ` +
          `usa ${resumen.bytes_usados} de ${resumen.limite_bytes} bytes ` +
          `(${resumen.bytes_disponibles} disponibles) y la imagen pesa ${bytes} bytes`,
      );
    }

    const path = `dulces/${randomUUID()}${this.extensionDe(file)}`;

    try {
      await this.supabase.subir(bucket, path, file.buffer, file.mimetype);
    } catch (error) {
      await this.cuota.decrementarUso(caller.rol, bytes);
      throw error;
    }

    // N-19: la imagen anterior se suelta **después** del save, no antes. Antes
    // esta llamada iba aquí y, si el `save` de abajo fallaba, la nueva imagen
    // quedaba subida en Storage sin fila que la apuntara (huérfana) y la
    // anterior ya no estaba: la fila apuntaba a una URL vacía.
    const urlAnterior = dulce.imagen_url;
    const bytesAnteriores = dulce.imagen_bytes;

    dulce.imagen_url = this.supabase.getPublicUrl(bucket, path);
    dulce.imagen_bytes = bytes;

    const actualizado = await this.dulceRepo.save(dulce);

    if (urlAnterior) {
      await this.soltar(urlAnterior, bytesAnteriores, dulceId, caller.rol);
    }

    return {
      mensaje: 'Imagen subida correctamente',
      dulce: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  /** Borra la imagen de Storage y devuelve los bytes a la cuota del rol. */
  async eliminar(dulceId: number, caller: AuthUser) {
    const dulce = await this.obtenerDulce(dulceId);

    if (!dulce.imagen_url) {
      throw new BadRequestException(`El ${this.config.articulo} ${dulceId} no tiene imagen`);
    }

    const bytes = dulce.imagen_bytes ?? 0;

    await this.soltar(dulce.imagen_url, bytes, dulceId, caller.rol);

    dulce.imagen_url = null;
    dulce.imagen_bytes = null;

    const actualizado = await this.dulceRepo.save(dulce);

    return {
      mensaje: 'Imagen eliminada',
      dulce: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  /**
   * Libera la imagen de un dulce que se va a borrar: quita el archivo de Storage
   * y devuelve los bytes a la cuota del rol.
   *
   * A diferencia de `eliminar()`, no falla si el dulce no tiene imagen, porque
   * borrar un dulce sin foto es lo normal. Está pensado para que quien borre la
   * fila no tenga que saber nada de Storage ni de la cuota.
   *
   * Si Storage no está configurado o no responde, el fallo se registra (error,
   * con stack) pero no detiene el borrado: el dulce sí tiene que desaparecer
   * del catálogo, y el archivo huérfano se limpia a mano (ver TODO.md, "Cuota
   * de Storage").
   */
  async liberarParaBorrar(dulce: Dulce, caller: AuthUser) {
    try {
      await this.soltar(dulce.imagen_url, dulce.imagen_bytes, dulce.id, caller.rol);
    } catch (error) {
      this.logger.error(
        `No se pudo liberar la imagen del ${this.config.articulo} ${dulce.id}: ${(error as Error).message}. ` +
          'El archivo queda pendiente de limpiar a mano.',
        (error as Error).stack,
      );
    }
  }

  /**
   * Borra el archivo de Storage y, si se borró, devuelve sus bytes a la cuota.
   *
   * N-19: antes el borrado se tragaba un `warn` y la fila seguía; aquí se
   * reintenta una vez y, si sigue fallando, se loguea como **error** con el
   * path concreto. La cuota no se devuelve si el archivo sigue en Storage,
   * para que el contador y el espacio real no se descuadren.
   */
  private async soltar(
    imagenUrl: string | null,
    imagenBytes: number | null,
    etiqueta: number | string,
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

  private async obtenerDulce(id: number) {
    const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });

    if (!dulce) {
      throw new BadRequestException(`No existe el ${this.config.articulo} ${id}`);
    }

    return dulce;
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