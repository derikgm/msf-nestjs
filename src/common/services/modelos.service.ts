import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateModeloDto } from '../dto/create-modelo.dto.js';
import { UpdateModeloDto } from '../dto/update-modelo.dto.js';
import { NEGOCIO, type NegocioConfig } from '../config/negocio.config.js';
import { Dulce, ProductoModelo } from '../entities/index.js';
import { ImagenService, type MulterFile } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';

/** Topes de la ficha técnica. Un modelo no es una ficha de fabricante. */
const LIMITE_ATRIBUTOS = 12;
const LIMITE_ETIQUETA = 40;
const LIMITE_VALOR = 120;

/**
 * Los **modelos** de una publicación (lo de Amazon: la misma nevera en 240 L,
 * 340 L y 420 L, cada una con su precio, su foto y su ficha).
 *
 * Es el mismo reparto que `InstalacionesService`: la tabla tiene su propio
 * servicio, reutiliza `ImagenService` (que no sabe de entidades, solo de
 * `imagen_url` / `imagen_bytes`, cuota y Storage) y responde `{ mensaje, ... }`
 * porque el panel muestra ese texto tal cual.
 *
 * **El negocio no se copia en el modelo, se hereda de la publicación** (ver
 * `producto-modelo.entity.ts`). Por eso toda ruta pasa por
 * `publicacion()` / `modeloDe()`, que comprueban `producto.negocio` contra la
 * configuración del módulo: un token de ADC no puede crear ni tocar un modelo
 * colgado de un dulce de Delys, y responde `404` en vez de `403` para no
 * confirmar que esa fila existe.
 */
@Injectable()
export class ModelosService {
  constructor(
    @Inject(NEGOCIO)
    private readonly config: NegocioConfig,
    @Inject(getRepositoryToken(ProductoModelo))
    private readonly modeloRepo: Repository<ProductoModelo>,
    @Inject(getRepositoryToken(Dulce))
    private readonly dulceRepo: Repository<Dulce>,
    private readonly imagenes: ImagenService,
    private readonly cuota: StorageQuotaService,
  ) {}

  /**
   * Modelos de una publicación, en el orden en que se dieron de alta (el
   * `ORDER BY id` es lo que fija el orden de las teclas que pinta la web; no
   * hay columna `orden` porque nadie la reordena todavía).
   */
  async porPublicacion(productoId: number): Promise<ProductoModelo[]> {
    const publicacion = await this.publicacion(productoId);

    return this.modeloRepo.find({
      where: { producto_id: publicacion.id },
      order: { id: 'ASC' },
    });
  }

  /**
   * Los modelos de muchas publicaciones de una vez, agrupados por producto.
   *
   * Existe para `GET /adc/productos`: la vitrina lee el catálogo entero en una
   * llamada, así que preguntar publicación por publicación serían N consultas
   * (y en un teléfono, N esperas). Con una sola `IN` queda en dos.
   */
  async porPublicaciones(productoIds: number[]): Promise<Map<number, ProductoModelo[]>> {
    const agrupados = new Map<number, ProductoModelo[]>(productoIds.map((id) => [id, []]));

    if (!productoIds.length) return agrupados;

    const modelos = await this.modeloRepo.find({
      where: { producto_id: In(productoIds) },
      order: { id: 'ASC' },
    });

    for (const modelo of modelos) agrupados.get(modelo.producto_id)?.push(modelo);

    return agrupados;
  }

  async crear(productoId: number, dto: CreateModeloDto) {
    const publicacion = await this.publicacion(productoId);
    const nombre = dto.nombre.trim();

    await this.comprobarNombreLibre(publicacion.id, nombre);

    const guardado = await this.modeloRepo.save(
      this.modeloRepo.create({
        producto_id: publicacion.id,
        nombre,
        precio: dto.precio,
        moneda: this.normalizarMoneda(dto.moneda),
        atributos: this.limpiarAtributos(dto.atributos),
      }),
    );

    return { mensaje: 'Modelo creado', modelo: guardado };
  }

  async actualizar(id: number, dto: UpdateModeloDto) {
    const modelo = await this.modeloDe(id);

    // `PATCH` sin nada que cambiar es un error del cliente, no un no-op (mismo
    // criterio que `InstalacionesService.actualizar()`).
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No mandaste ningún campo que cambiar');
    }

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      await this.comprobarNombreLibre(modelo.producto_id, nombre, modelo.id);
      modelo.nombre = nombre;
    }
    if (dto.precio !== undefined) modelo.precio = dto.precio;
    if (dto.moneda !== undefined) modelo.moneda = this.normalizarMoneda(dto.moneda);
    // `atributos` se reemplaza entero, no se fusiona: el panel manda la ficha
    // completa del formulario, y así se puede borrar una característica.
    if (dto.atributos !== undefined) modelo.atributos = this.limpiarAtributos(dto.atributos);

    const guardado = await this.modeloRepo.save(modelo);

    return { mensaje: 'Modelo actualizado', modelo: guardado };
  }

  async eliminar(id: number, caller: AuthUser) {
    const modelo = await this.modeloDe(id);

    // Primero el archivo y la cuota, después la fila (ver `InstalacionesService`).
    await this.imagenes.liberarParaBorrar(modelo, caller.rol, `modelo ${id}`);

    await this.modeloRepo.remove(modelo);

    return { mensaje: 'Modelo eliminado' };
  }

  /**
   * Foto del modelo. Va a la carpeta `modelos/` del bucket del rol, igual que
   * `dulces/` e `instalaciones/`: comparten bucket y cuota con el resto del
   * negocio, solo cambia dónde se archiva el archivo.
   */
  async subirImagen(id: number, file: MulterFile, caller: AuthUser) {
    const modelo = await this.modeloDe(id);

    const actualizado = await this.imagenes.subir(
      this.modeloRepo,
      modelo,
      file,
      caller.rol,
      'modelos',
      `modelo ${id}`,
    );

    return {
      mensaje: 'Imagen subida correctamente',
      modelo: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  async eliminarImagen(id: number, caller: AuthUser) {
    const modelo = await this.modeloDe(id);

    const actualizado = await this.imagenes.eliminar(
      this.modeloRepo,
      modelo,
      caller.rol,
      `modelo ${id}`,
    );

    return {
      mensaje: 'Imagen eliminada',
      modelo: actualizado,
      cuota: await this.cuota.getResumen(caller.rol),
    };
  }

  // --- Internos ---------------------------------------------------------------

  /** La publicación tiene que existir y ser de este negocio. */
  private async publicacion(productoId: number): Promise<Dulce> {
    const publicacion = await this.dulceRepo.findOneBy({
      id: productoId,
      negocio: this.config.clave,
    });

    if (!publicacion) {
      throw new NotFoundException(`No existe el ${this.config.articulo} ${productoId}`);
    }

    return publicacion;
  }

  /**
   * Un modelo por id, comprobando que la publicación a la que cuelga es de este
   * negocio. Se carga la relación porque el `negocio` no está en el modelo: sin
   * el JOIN no se puede validar.
   */
  private async modeloDe(id: number): Promise<ProductoModelo> {
    const modelo = await this.modeloRepo.findOne({
      where: { id },
      relations: { producto: true },
    });

    if (!modelo || modelo.producto.negocio !== this.config.clave) {
      throw new NotFoundException(`No existe el modelo ${id}`);
    }

    return modelo;
  }

  /**
   * Dos modelos de la misma publicación no pueden llamarse igual (lo refuerza
   * el `UNIQUE` de la base; esto existe para poder avisar en español).
   * `exceptoId` es el propio modelo al renombrar.
   */
  private async comprobarNombreLibre(
    productoId: number,
    nombre: string,
    exceptoId?: number,
  ): Promise<void> {
    if (!nombre) throw new BadRequestException('El nombre del modelo no puede estar vacío');

    const existente = await this.modeloRepo.findOneBy({ producto_id: productoId, nombre });

    if (existente && existente.id !== exceptoId) {
      throw new ConflictException(
        `Este ${this.config.articulo} ya tiene un modelo llamado "${nombre}"`,
      );
    }
  }

  /** Mayúsculas y sin espacios; vacío o ausente deja `CUP` (como el catálogo). */
  private normalizarMoneda(moneda: string | undefined) {
    return moneda?.trim().toUpperCase() || 'CUP';
  }

  /**
   * Deja la ficha lista para guardar: recorta, tira los pares vacíos (el
   * formulario del panel siempre manda alguna fila sin rellenar) y acepta
   * números sueltos (el panel manda `{"Peso": 38}` si alguien escribe sin
   * unidad). Un valor que sea lista u objeto sí es un error del cliente.
   */
  private limpiarAtributos(atributos: Record<string, unknown> | undefined): Record<string, string> {
    const limpios: Record<string, string> = {};

    for (const [etiquetaBruta, valorBruto] of Object.entries(atributos ?? {})) {
      const etiqueta = etiquetaBruta.trim();
      const valor = this.textoDelValor(valorBruto, etiqueta);

      if (!etiqueta && !valor) continue;
      if (!etiqueta) {
        throw new BadRequestException('Cada característica necesita su nombre ("Peso", no solo el valor)');
      }
      if (!valor) {
        throw new BadRequestException(`Falta el valor de la característica "${etiqueta}"`);
      }
      if (etiqueta.length > LIMITE_ETIQUETA) {
        throw new BadRequestException(
          `El nombre de una característica no puede pasar de ${LIMITE_ETIQUETA} letras ("${etiqueta.slice(0, 20)}…")`,
        );
      }
      if (valor.length > LIMITE_VALOR) {
        throw new BadRequestException(
          `El valor de "${etiqueta}" no puede pasar de ${LIMITE_VALOR} letras`,
        );
      }

      limpios[etiqueta] = valor;
    }

    if (Object.keys(limpios).length > LIMITE_ATRIBUTOS) {
      throw new BadRequestException(
        `Un modelo no puede tener más de ${LIMITE_ATRIBUTOS} características`,
      );
    }

    return limpios;
  }

  private textoDelValor(valor: unknown, etiqueta: string): string {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'string') return valor.trim();
    if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);

    throw new BadRequestException(
      `La característica "${etiqueta}" tiene que ser texto (por ejemplo "38 kg")`,
    );
  }
}
