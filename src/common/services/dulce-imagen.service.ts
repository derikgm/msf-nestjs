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

    // Si el dulce ya tenía imagen, la anterior libera su cuota.
    await this.liberarDe(dulce, caller.rol);

    dulce.imagen_url = this.supabase.getPublicUrl(bucket, path);
    dulce.imagen_bytes = bytes;

    const actualizado = await this.dulceRepo.save(dulce);

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
    const bucket = this.bucketDe(caller.rol);
    const path = this.supabase.pathDesdeUrl(bucket, dulce.imagen_url);

    if (path) await this.supabase.eliminar(bucket, [path]);

    dulce.imagen_url = null;
    dulce.imagen_bytes = null;

    const actualizado = await this.dulceRepo.save(dulce);

    if (bytes) await this.cuota.decrementarUso(caller.rol, bytes);

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
   * Si Storage no está configurado o no responde, el fallo se registra pero no
   * detiene el borrado: el dulce sí tiene que desaparecer del catálogo, y el
   * archivo huérfano se limpia a mano (ver TODO.md, "Cuota de Storage").
   */
  async liberarParaBorrar(dulce: Dulce, caller: AuthUser) {
    try {
      await this.liberarDe(dulce, caller.rol);
    } catch (error) {
      this.logger.warn(
        `No se pudo liberar la imagen del dulce ${dulce.id}: ${(error as Error).message}. ` +
          'El dulce se borra igual y el archivo queda pendiente de limpiar a mano.',
      );
    }
  }

  /** El archivo de un dulce y sus bytes de cuota. Falla si Storage no responde. */
  private async liberarDe(dulce: Dulce, rol: string) {
    if (!dulce.imagen_url) return;

    const bucket = this.bucketDe(rol);
    const path = this.supabase.pathDesdeUrl(bucket, dulce.imagen_url);

    if (path) await this.supabase.eliminar(bucket, [path]);
    if (dulce.imagen_bytes) await this.cuota.decrementarUso(rol, dulce.imagen_bytes);
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