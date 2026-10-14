import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInstalacionDto } from '../dto/create-instalacion.dto.js';
import { UpdateInstalacionDto } from '../dto/update-instalacion.dto.js';
import { Instalacion } from '../entities/index.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';

/**
 * Servicios de instalación de ADC (punto 3 de todo.md): listar (vitrina), crear,
 * editar, borrar y gestionar la imagen.
 *
 * Es la contrapartida de `CatalogoService`, pero **sin la columna `negocio`**:
 * esta tabla es exclusiva de ADC, así que no hay nada que filtrar por negocio.
 */
@Injectable()
export class InstalacionesService {
  constructor(
    @Inject(getRepositoryToken(Instalacion))
    private readonly instalacionRepo: Repository<Instalacion>,
    private readonly imagenes: ImagenService,
    private readonly cuota: StorageQuotaService,
  ) {}

  /** Últimas primero: lo recién añadido se ve arriba en el panel. */
  async listar(): Promise<Instalacion[]> {
    return this.instalacionRepo.find({ order: { creado_en: 'DESC', id: 'DESC' } });
  }

  async obtener(id: number): Promise<Instalacion> {
    const instalacion = await this.instalacionRepo.findOneBy({ id });

    if (!instalacion) {
      throw new NotFoundException(`No existe la instalación ${id}`);
    }

    return instalacion;
  }

  async crear(dto: CreateInstalacionDto) {
    const instalacion = this.instalacionRepo.create({
      nombre_servicio: dto.nombre_servicio.trim(),
      precio: dto.precio,
      moneda: this.normalizarMoneda(dto.moneda),
      descripcion: this.limpiarDescripcion(dto.descripcion),
    });

    const guardada = await this.instalacionRepo.save(instalacion);

    return { mensaje: 'Instalación creada', instalacion: guardada };
  }

  async actualizar(id: number, dto: UpdateInstalacionDto) {
    const instalacion = await this.obtener(id);

    // `PATCH` sin nada que cambiar es un error del cliente, no un no-op (mismo
    // criterio que `CatalogoService.actualizarDulce()`).
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No mandaste ningún campo que cambiar');
    }

    if (dto.nombre_servicio !== undefined) {
      instalacion.nombre_servicio = dto.nombre_servicio.trim();
    }
    if (dto.precio !== undefined) instalacion.precio = dto.precio;
    if (dto.moneda !== undefined) instalacion.moneda = this.normalizarMoneda(dto.moneda);
    if (dto.descripcion !== undefined) {
      instalacion.descripcion = this.limpiarDescripcion(dto.descripcion);
    }

    const guardada = await this.instalacionRepo.save(instalacion);

    return { mensaje: 'Instalación actualizada', instalacion: guardada };
  }

  async eliminar(id: number, caller: AuthUser) {
    const instalacion = await this.obtener(id);

    // Primero el archivo y la cuota, después la fila: si el borrado de la fila
    // falla, la imagen ya no está pero la fila se puede reintentar.
    await this.imagenes.liberarParaBorrar(instalacion, caller.rol, `instalación ${id}`);

    await this.instalacionRepo.remove(instalacion);

    return { mensaje: 'Instalación eliminada' };
  }

  async subirImagen(id: number, file: MulterFile, caller: AuthUser) {
    const instalacion = await this.obtener(id);

    const actualizada = await this.imagenes.subir(
      this.instalacionRepo,
      instalacion,
      file,
      caller.rol,
      'instalaciones',
      `instalación ${id}`,
    );

    return {
      mensaje: 'Imagen subida correctamente',
      instalacion: actualizada,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  async eliminarImagen(id: number, caller: AuthUser) {
    const instalacion = await this.obtener(id);

    const actualizada = await this.imagenes.eliminar(
      this.instalacionRepo,
      instalacion,
      caller.rol,
      `instalación ${id}`,
    );

    return {
      mensaje: 'Imagen eliminada',
      instalacion: actualizada,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  /** Mayúsculas y sin espacios; vacío o ausente deja el `CUP` por defecto. */
  private normalizarMoneda(moneda: string | undefined) {
    return moneda?.trim().toUpperCase() || 'CUP';
  }

  /** Quita líneas vacías y espacios sobrantes; sin descripción, queda `[]`. */
  private limpiarDescripcion(descripcion: string[] | undefined) {
    return (descripcion ?? []).map((linea) => linea.trim()).filter((linea) => linea.length > 0);
  }
}
