import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
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

  async crearPedido(createPedidoDto: CreatePedidoDto) {
    const { encargos: encargosDto } = createPedidoDto;

    const dulces = await this.dulceRepo.save(
      await Promise.all(encargosDto.map((encargo) => this.upsertDulce(encargo.dulce))),
    );

    let precio_total = 0;
    const encargos: Encargo[] = encargosDto.map((encargoDto, i) => {
      precio_total += dulces[i].precio * encargoDto.cantidad;

      return this.encargoRepo.create({
        dulce: dulces[i],
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

  /** El DTO trae el dulce completo: si ya existe se actualiza, si no, se inserta. */
  private async upsertDulce(dto: CreatePedidoDto['encargos'][number]['dulce']) {
    const dulce = (await this.dulceRepo.findOneBy({ id: dto.id })) ?? this.dulceRepo.create();

    dulce.id = dto.id;
    dulce.nombre = dto.nombre;
    dulce.precio = dto.precio;

    return dulce;
  }
}
