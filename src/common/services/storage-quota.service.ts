import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES } from '../../auth/entities/index.js';
import {
  LIMITE_BYTES_POR_DEFECTO,
  StorageQuota,
} from '../entities/storage-quota.entity.js';

export interface ResumenCuota {
  rol: string;
  bytes_usados: number;
  limite_bytes: number;
  bytes_disponibles: number;
}

@Injectable()
export class StorageQuotaService implements OnApplicationBootstrap {
  constructor(
    @Inject(getRepositoryToken(StorageQuota))
    private readonly quotaRepo: Repository<StorageQuota>,
  ) {}

  /** Crea las cuotas de los proyectos conocidos para que su límite sea editable. */
  async onApplicationBootstrap() {
    for (const rol of ROLES) await this.asegurarRol(rol);
  }

  async getResumen(rol: string): Promise<ResumenCuota> {
    const { bytes_usados, limite_bytes } = await this.asegurarRol(rol);

    return {
      rol,
      bytes_usados,
      limite_bytes,
      bytes_disponibles: Math.max(limite_bytes - bytes_usados, 0),
    };
  }

  async decrementarUso(rol: string, bytes: number): Promise<void> {
    this.comprobarBytes(bytes);

    const registro = await this.asegurarRol(rol);
    const restantes = Math.max(registro.bytes_usados - bytes, 0);

    await this.quotaRepo.update({ rol }, { bytes_usados: restantes });
  }

  /**
   * Valida y descuenta en un solo UPDATE condicional.
   *
   * Validar y luego incrementar por separado deja una ventana en la que dos subidas
   * simultáneas pasan las dos y el rol se pasa de cuota. Aquí Postgres evalúa
   * "bytes_usados + n <= limite_bytes" y descuenta en la misma sentencia, así que
   * solo una de las dos gana.
   *
   * Devuelve true si reservó el espacio; si devuelve false no se descontó nada.
   */
  async reservarCuota(rol: string, bytes: number): Promise<boolean> {
    this.comprobarBytes(bytes);
    await this.asegurarRol(rol);

    const resultado = await this.quotaRepo
      .createQueryBuilder()
      .update(StorageQuota)
      .set({ bytes_usados: () => `bytes_usados + ${bytes}` })
      .where('rol = :rol', { rol })
      .andWhere(`bytes_usados + ${bytes} <= limite_bytes`)
      .execute();

    return (resultado.affected ?? 0) > 0;
  }

  private async asegurarRol(rol: string): Promise<StorageQuota> {
    const existente = await this.quotaRepo.findOneBy({ rol });

    if (existente) return existente;

    // Rol nuevo: nace con el límite por defecto. Se puede ajustar con un UPDATE.
    return this.quotaRepo.save(
      this.quotaRepo.create({ rol, bytes_usados: 0, limite_bytes: LIMITE_BYTES_POR_DEFECTO }),
    );
  }

  /** Solo admite enteros positivos: `bytes` se interpola en el SQL de reservarCuota. */
  private comprobarBytes(bytes: number) {
    if (!Number.isSafeInteger(bytes) || bytes <= 0) {
      throw new Error(`Cantidad de bytes inválida: ${bytes}`);
    }
  }
}
