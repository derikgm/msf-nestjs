import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateComboDto, DulceComboDto } from '../dto/create-combo.dto.js';
import { UpdateComboDto } from '../dto/update-combo.dto.js';
import { Combo, ComboDulce } from '../entities/index.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';

/**
 * Combos de Delys (punto 3 de todo.md): listar (vitrina), crear, editar, borrar
 * y gestionar la imagen.
 *
 * Tabla propia de Delys, sin columna `negocio`. Los dulces del combo viven en
 * `delys_combo_dulces` y se administran **reemplazando la lista entera** en cada
 * edición: es lo más simple de razonar y evita tener que casar renglones por id.
 */
@Injectable()
export class CombosService {
  constructor(
    @Inject(getRepositoryToken(Combo))
    private readonly comboRepo: Repository<Combo>,
    @Inject(getRepositoryToken(ComboDulce))
    private readonly comboDulceRepo: Repository<ComboDulce>,
    private readonly imagenes: ImagenService,
    private readonly cuota: StorageQuotaService,
  ) {}

  /** Últimos primero, con sus dulces ordenados por id (el orden en que se metieron). */
  async listar(): Promise<Combo[]> {
    const combos = await this.comboRepo.find({
      relations: { dulces: true },
      order: { creado_en: 'DESC', id: 'DESC' },
    });

    for (const combo of combos) combo.dulces.sort((a, b) => a.id - b.id);

    return combos;
  }

  async obtener(id: number): Promise<Combo> {
    const combo = await this.comboRepo.findOne({
      where: { id },
      relations: { dulces: true },
    });

    if (!combo) {
      throw new NotFoundException(`No existe el combo ${id}`);
    }

    combo.dulces.sort((a, b) => a.id - b.id);

    return combo;
  }

  async crear(dto: CreateComboDto) {
    const combo = this.comboRepo.create({
      nombre_combo: dto.nombre_combo.trim(),
      precio: dto.precio,
      moneda: this.normalizarMoneda(dto.moneda),
      dulces: this.armarDulces(dto.dulces),
    });

    const guardado = await this.comboRepo.save(combo);

    return { mensaje: 'Combo creado', combo: guardado };
  }

  async actualizar(id: number, dto: UpdateComboDto) {
    const combo = await this.obtener(id);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No mandaste ningún campo que cambiar');
    }

    if (dto.nombre_combo !== undefined) combo.nombre_combo = dto.nombre_combo.trim();
    if (dto.precio !== undefined) combo.precio = dto.precio;
    if (dto.moneda !== undefined) combo.moneda = this.normalizarMoneda(dto.moneda);

    if (dto.dulces !== undefined) {
      // Se reemplaza la lista entera: fuera los viejos y dentro los nuevos.
      await this.comboDulceRepo
        .createQueryBuilder()
        .delete()
        .where('combo_id = :id', { id })
        .execute();

      combo.dulces = this.armarDulces(dto.dulces);
    }

    const guardado = await this.comboRepo.save(combo);

    return { mensaje: 'Combo actualizado', combo: guardado };
  }

  async eliminar(id: number, caller: AuthUser) {
    const combo = await this.obtener(id);

    await this.imagenes.liberarParaBorrar(combo, caller.rol, `combo ${id}`);

    // Los renglones de `delys_combo_dulces` se van con él (FK CASCADE).
    await this.comboRepo.remove(combo);

    return { mensaje: 'Combo eliminado' };
  }

  async subirImagen(id: number, file: MulterFile, caller: AuthUser) {
    const combo = await this.obtener(id);

    const actualizado = await this.imagenes.subir(
      this.comboRepo,
      combo,
      file,
      caller.rol,
      'combos',
      `combo ${id}`,
    );

    return {
      mensaje: 'Imagen subida correctamente',
      combo: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  async eliminarImagen(id: number, caller: AuthUser) {
    const combo = await this.obtener(id);

    const actualizado = await this.imagenes.eliminar(
      this.comboRepo,
      combo,
      caller.rol,
      `combo ${id}`,
    );

    return {
      mensaje: 'Imagen eliminada',
      combo: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  /** Mayúsculas y sin espacios; vacío o ausente deja el `CUP` por defecto. */
  private normalizarMoneda(moneda: string | undefined) {
    return moneda?.trim().toUpperCase() || 'CUP';
  }

  private armarDulces(dulces: DulceComboDto[] | undefined): ComboDulce[] {
    return (dulces ?? []).map((dulce) =>
      this.comboDulceRepo.create({
        nombre_dulce: dulce.nombre_dulce.trim(),
        cantidad: dulce.cantidad,
      }),
    );
  }
}
