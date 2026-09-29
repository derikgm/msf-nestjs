import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Dulce } from './entities/index.js';
import { SupabaseService } from '../common/services/supabase.service.js';
import { StorageQuotaService } from '../common/services/storage-quota.service.js';
import type { AuthUser } from '../auth/auth.interfaces.js';

export type MulterFile = Express.Multer.File;

/** Un bucket por proyecto. */
const BUCKET_POR_ROL: Record<string, string> = {
  delys: 'delys',
  domus: 'domus',
};

@Injectable()
export class DulceImagenService {
  constructor(
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
    await this.liberarImagenAnterior(bucket, dulce, caller.rol);

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
      throw new BadRequestException(`El dulce ${dulceId} no tiene imagen`);
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

  private async liberarImagenAnterior(
    bucket: string,
    dulce: Dulce,
    rol: string,
  ) {
    if (!dulce.imagen_url) return;

    const path = this.supabase.pathDesdeUrl(bucket, dulce.imagen_url);

    if (path) await this.supabase.eliminar(bucket, [path]);
    if (dulce.imagen_bytes) await this.cuota.decrementarUso(rol, dulce.imagen_bytes);
  }

  private async obtenerDulce(id: number) {
    const dulce = await this.dulceRepo.findOneBy({ id });

    if (!dulce) {
      throw new BadRequestException(`No existe el dulce ${id}`);
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
