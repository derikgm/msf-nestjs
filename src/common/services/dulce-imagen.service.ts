import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dulce } from '../entities/index.js';
import { NEGOCIO, type NegocioConfig } from '../config/negocio.config.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';

// MulterFile nace en `ImagenService` (que es quien lo usa); se reexporta para no
// cambiar los imports de los controladores.
export type { MulterFile } from './imagen.service.js';

/**
 * Imagen de un producto del catálogo. Se queda con lo propio del catálogo
 * (buscar el dulce **por negocio**, hablar de "dulce" y devolver la forma que
 * espera el panel) y delega el trabajo de Storage y cuota en `ImagenService`.
 */
@Injectable()
export class DulceImagenService {
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
    private readonly imagenes: ImagenService,
    private readonly cuota: StorageQuotaService,
  ) {}

  async subir(dulceId: number, file: MulterFile, caller: AuthUser) {
    const dulce = await this.obtenerDulce(dulceId);

    const actualizado = await this.imagenes.subir(
      this.dulceRepo,
      dulce,
      file,
      caller.rol,
      'dulces',
      `${this.config.articulo} ${dulceId}`,
    );

    return {
      mensaje: 'Imagen subida correctamente',
      dulce: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  /** Borra la imagen de Storage y devuelve los bytes a la cuota del rol. */
  async eliminar(dulceId: number, caller: AuthUser) {
    const dulce = await this.obtenerDulce(dulceId);

    const actualizado = await this.imagenes.eliminar(
      this.dulceRepo,
      dulce,
      caller.rol,
      `${this.config.articulo} ${dulceId}`,
    );

    return {
      mensaje: 'Imagen eliminada',
      dulce: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  /** Suelta la imagen de un dulce que se va a borrar (ver `ImagenService`). */
  async liberarParaBorrar(dulce: Dulce, caller: AuthUser) {
    await this.imagenes.liberarParaBorrar(
      dulce,
      caller.rol,
      `${this.config.articulo} ${dulce.id}`,
    );
  }

  private async obtenerDulce(id: number) {
    const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });

    if (!dulce) {
      throw new BadRequestException(`No existe el ${this.config.articulo} ${id}`);
    }

    return dulce;
  }
}
