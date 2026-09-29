import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsRelations, In, Repository } from 'typeorm';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { Dulce, Encargo, Pedido } from './entities/index.js';
import { ofertas } from './data/ofertas.js';

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
      const dulce = dulces.get(encargoDto.dulce) as Dulce;

      precio_total += dulce.precio * encargoDto.cantidad;

      return this.encargoRepo.create({
        dulce,
        cantidad: encargoDto.cantidad,
      });
    });

    const pedido = await this.pedidoRepo.save(
      this.pedidoRepo.create({ precio_total, encargos }),
    );

    return { ok: true, pedido: await this.obtenerPedido(pedido.id) };
  }

  async obtenerTodosDulces() {
    const dulces = await this.dulceRepo.find({ order: { id: 'ASC' } });

    return { dulces };
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
