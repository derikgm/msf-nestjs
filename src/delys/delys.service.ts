import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { CreateDulceDto } from './dto/create-dulce.dto.js';
import { UpdateDulceDto } from './dto/update-dulce.dto.js';
import { Dulce, Encargo, Pedido } from './entities/index.js';
import { ofertas } from './data/ofertas.js';
import { DulceImagenService } from './dulce-imagen.service.js';
import type { AuthUser } from '../auth/auth.interfaces.js';

/** Los encargos siempre llegan con su dulce: es lo que exige la interfaz. */
const relations = {
  encargos: { dulce: true },
} satisfies FindOptionsRelations<Pedido>;

@Injectable()
export class DelysService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DelysService.name);

  constructor(
    @Inject(getRepositoryToken(Pedido))
    private readonly pedidoRepo: Repository<Pedido>,
    @Inject(getRepositoryToken(Encargo))
    private readonly encargoRepo: Repository<Encargo>,
    @Inject(getRepositoryToken(Dulce))
    private readonly dulceRepo: Repository<Dulce>,
    private readonly imagenes: DulceImagenService,
  ) {}

  /** Carga el catálogo inicial de dulces la primera vez que se levanta la app. */
  async onApplicationBootstrap() {
    if ((await this.dulceRepo.count()) > 0) return;

    await this.dulceRepo.save(this.dulceRepo.create(ofertas));
    this.logger.log(`Catálogo inicial cargado: ${ofertas.length} dulces`);
  }

  /**
   * Crea el pedido con los precios del catálogo. El cliente solo manda el id de
   * cada dulce, así que el total no se puede manipular desde fuera.
   */
  async crearPedido(createPedidoDto: CreatePedidoDto) {
    const { encargos: encargosDto } = createPedidoDto;

    const dulces = await this.dulcesDelCatalogo(encargosDto.map((e) => e.dulce));

    let precio_total = 0;
    const encargos: Encargo[] = encargosDto.map((encargoDto) => {
      const dulce = dulces.get(encargoDto.dulce);

      // dulcesDelCatalogo() ya rechaza los ids que no están. Se repite la comprobación
      // para que un cambio futuro en esa función no acave en un pedido con un dulce
      // undefined en vez de con un 404.
      if (!dulce) throw new NotFoundException(`No existe el dulce ${encargoDto.dulce}`);

      precio_total += dulce.precio * encargoDto.cantidad;

      return this.encargoRepo.create({
        dulce,
        cantidad: encargoDto.cantidad,
      });
    });

    const pedido = await this.pedidoRepo.save(
      this.pedidoRepo.create({
        precio_total,
        direccion: createPedidoDto.direccion.trim(),
        telefono: createPedidoDto.telefono.trim(),
        fecha: createPedidoDto.fecha,
        notas: createPedidoDto.notas?.trim() || null,
        encargos,
      }),
    );

    return { ok: true, pedido: await this.obtenerPedido(pedido.id) };
  }

  async obtenerTodosDulces() {
    const dulces = await this.dulceRepo.find({ order: { id: 'ASC' } });

    return { dulces };
  }

  /**
   * Alta de un dulce desde el panel. El `id` lo pone el servidor: es clave
   * primaria sin autogenerar, y la tabla la sembró `data/ofertas.ts` con ids
   * elegidos a mano, así que si lo aceptara del cliente podría pisar uno existente.
   *
   * Va en transacción porque el id es `MAX(id) + 1`: dos altas simultáneas
   * calcularían el mismo id y la segunda se comería el `save`. La restricción de
   * clave primaria hace que una gane y la otra reciba un error de duplicado.
   */
  async crearDulce(createDulceDto: CreateDulceDto) {
    return this.dulceRepo.manager.transaction(async (manager) => {
      const siguiente = await manager
        .createQueryBuilder(Dulce, 'dulce')
        .select('MAX(dulce.id)', 'maximo')
        .getRawOne<{ maximo: number | null }>();

      const id = (siguiente?.maximo ?? 0) + 1;

      const dulce = manager.create(Dulce, {
        id,
        nombre: createDulceDto.nombre.trim(),
        precio: createDulceDto.precio,
        imagen_url: null,
        imagen_bytes: null,
      });

      const guardado = await manager.save(Dulce, dulce);

      return { mensaje: 'Dulce creado correctamente', dulce: guardado };
    });
  }

  /**
   * Edición parcial. Se manda solo lo que cambia, y mandar los dos campos es
   * válido: en ese caso los dos cambian.
   */
  async actualizarDulce(id: number, updateDulceDto: UpdateDulceDto) {
    const { nombre, precio } = updateDulceDto;

    if (nombre === undefined && precio === undefined) {
      throw new BadRequestException('No hay nada que actualizar: manda "nombre" o "precio"');
    }

    const dulce = await this.dulceRepo.findOneBy({ id });

    if (!dulce) throw new NotFoundException(`No existe el dulce ${id}`);

    if (nombre !== undefined) dulce.nombre = nombre.trim();
    if (precio !== undefined) dulce.precio = precio;

    const guardado = await this.dulceRepo.save(dulce);

    return { mensaje: 'Dulce actualizado correctamente', dulce: guardado };
  }

  /**
   * Borra el dulce del catálogo. Antes libera su imagen: si el dulce tuviera foto,
   * sus bytes vuelven a la cuota y el archivo sale de Storage, para no dejar
   * huérfano ocupando espacio (ver TODO.md, "Cuota de Storage").
   *
   * Si el dulce está en pedidos que siguen abiertos no se borra: el renglón es
   * parte del pedido y `precio_total` está guardado, así que borrarlo dejaría al
   * pedido con un total que no cuadra. Se responde `409` diciendo cuántos pedidos
   * lo bloquean. La misma comprobación está en el `RESTRICT` de
   * `Encargo.dulce`; aquí se escribe para poder contar y nombrar.
   */
  async eliminarDulce(id: number, caller: AuthUser) {
    const dulce = await this.dulceRepo.findOneBy({ id });

    if (!dulce) throw new NotFoundException(`No existe el dulce ${id}`);

    const pedidos = await this.pedidosQuePiden(dulce.id);

    if (pedidos > 0) throw new ConflictException(this.mensajeDePedidosQueBloquean(dulce.nombre, pedidos));

    await this.imagenes.liberarParaBorrar(dulce, caller);
    await this.dulceRepo.remove(dulce);

    return { ok: true };
  }

  /**
   * Cuántos pedidos sin resolver incluyen este dulce.
   *
   * Si la cuenta falla no se adivina un 0: se responde `503` y el dulce sigue
   * ahí. Perder un pedido es peor que dejar un dulce en el catálogo un rato.
   */
  private async pedidosQuePiden(dulceId: number): Promise<number> {
    try {
      return await this.encargoRepo
        .createQueryBuilder('encargo')
        .innerJoin('encargo.pedido', 'pedido')
        .where('encargo.dulce = :dulceId', { dulceId })
        .getCount();
    } catch (error) {
      this.logger.error(`No se pudo comprobar si el dulce ${dulceId} está en pedidos: ${error}`);

      throw new ServiceUnavailableException('No se pudo comprobar los pedidos. Inténtalo de nuevo.');
    }
  }

  /** El mensaje del `409`: qué lo bloquea y qué hay que hacer para desbloquearlo. */
  private mensajeDePedidosQueBloquean(nombre: string, pedidos: number): string {
    const plural = pedidos === 1 ? 'pedido' : 'pedidos';

    return (
      `"${nombre}" está en ${pedidos} ${plural} sin resolver. ` +
      'Márcalo como hecho o cancélalo en Pedidos, y ya lo podrás borrar.'
    );
  }

  async obtenerTodosPedidos() {
    const pedidos = await this.pedidoRepo.find({ relations });

    return { pedidos };
  }

  async obtenerPedido(id: string) {
    const pedido = await this.pedidoRepo.findOne({ where: { id }, relations });

    if (!pedido) throw new NotFoundException(`No existe el pedido ${id}`);

    return pedido;
  }

  async remove(id: string) {
    const pedido = await this.pedidoRepo.findOneBy({ id });

    if (!pedido) throw new NotFoundException(`No existe el pedido ${id}`);

    await this.pedidoRepo.remove(pedido);

    return { ok: true };
  }

  //Seccion de ofertas:
  obtenerOfertas() {
    return { ofertas };
  }

  /**
   * Carga del catálogo los dulces que pide el encargo, indexados por id. Si algún
   * id no existe, el pedido se rechaza: así el cliente no puede inventarse un dulce
   * ni cambiarle el precio a uno que sí existe.
   */
  private async dulcesDelCatalogo(ids: number[]) {
    const encontrados = await this.dulceRepo.findBy({ id: In(ids) });
    const porId = new Map(encontrados.map((dulce) => [dulce.id, dulce]));

    const faltantes = [...new Set(ids)].filter((id) => !porId.has(id));

    if (faltantes.length === 1) {
      throw new NotFoundException(`No existe el dulce ${faltantes[0]}`);
    }

    if (faltantes.length > 1) {
      throw new NotFoundException(`No existen los dulces ${faltantes.join(', ')}`);
    }

    return porId;
  }
}
