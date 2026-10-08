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
import { EntityManager, FindOptionsRelations, In, IsNull, Repository } from 'typeorm';
import { CreatePedidoDto } from '../dto/create-pedido.dto.js';
import { CreateDulceDto } from '../dto/create-dulce.dto.js';
import { UpdateDulceDto } from '../dto/update-dulce.dto.js';
import { Dulce, Encargo, Pedido, Seccion } from '../entities/index.js';
import { ofertas } from '../data/ofertas.js';
import { NEGOCIO, type NegocioConfig } from '../config/negocio.config.js';
import { DulceImagenService } from './dulce-imagen.service.js';
import type { AuthUser } from '../../auth/auth.interfaces.js';

/** Los encargos siempre llegan con su dulce: es lo que exige la interfaz. */
const relations = {
  encargos: { dulce: true },
} satisfies FindOptionsRelations<Pedido>;

/**
 * La sección en la que acaba un producto que se da de alta sin `seccion_id`
 * (`seccionDulces()`). Reservada para el panel: el `AdcController` la oculta de
 * sus respuestas, así que una sección real llamada "dulces" quedaría fuera de
 * la tienda de ADC — no se puede crear ni renombrar a ese nombre.
 */
const SECCION_RESERVADA = 'dulces';

/**
 * Servicio del catálogo, **de cualquier negocio** (Delys, ADC…).
 *
 * La misma clase se monta una vez por negocio, cada una con su configuración
 * (`NEGOCIO`): la `clave` es el filtro de todas las consultas, de modo que un
 * negocio no lee ni escribe las filas del otro aunque compartan tabla (punto 6
 * de msf-app/todo.md). Por eso `DelysModule` y `AdcModule` lo proveen cada uno
 * con su propio `CONFIG_*`, y el controlador de ADC no depende del de Delys.
 */
@Injectable()
export class CatalogoService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogoService.name);

  constructor(
    /**
     * Qué negocio atiende esta instancia.
     */
    @Inject(NEGOCIO)
    private readonly config: NegocioConfig,
    @Inject(getRepositoryToken(Pedido))
    private readonly pedidoRepo: Repository<Pedido>,
    @Inject(getRepositoryToken(Encargo))
    private readonly encargoRepo: Repository<Encargo>,
    @Inject(getRepositoryToken(Dulce))
    private readonly dulceRepo: Repository<Dulce>,
    @Inject(getRepositoryToken(Seccion))
    private readonly seccionRepo: Repository<Seccion>,
    private readonly imagenes: DulceImagenService,
  ) {}

  /**
   * Cómo se llama lo que se vende, con mayúscula: los mensajes de la API se
   * escriben con esto para que ADC no reciba respuestas hablando de dulces.
   */
  private articuloEnMayuscula(): string {
    const articulo = this.config.articulo;

    return articulo.charAt(0).toUpperCase() + articulo.slice(1);
  }

  /**
   * Carga el catálogo inicial del negocio la primera vez que se levanta la app.
   *
   * La cuenta y la semilla son **por negocio**: si Delys ya tiene sus productos,
   * ADC sigue pudiendo arrancar con la tabla vacía; y como `CONFIG_ADC` trae la
   * semilla vacía, los dulces de la pastelería no se cuelan en el catálogo de
   * ADC (punto 6).
   */
  async onApplicationBootstrap() {
    const actuales = await this.dulceRepo.count({ where: { negocio: this.config.clave } });

    if (actuales === 0 && this.config.catalogoInicial.length > 0) {
      const semilla = this.config.catalogoInicial.map((dulce) => ({
        ...dulce,
        negocio: this.config.clave,
      }));

      // N-19: `orIgnore()` es `INSERT ... ON CONFLICT DO NOTHING`. El count de
      // arriba es solo para no intentar sembrar a cada arranque; la protección
      // real es esta sentencia: si dos instancias arrancan a la vez y las dos
      // ven la tabla vacía, la segunda choca contra la PK `id` y Postgres se
      // queda con la primera (antes era un `QueryFailedError` y catálogo
      // duplicado).
      await this.dulceRepo
        .createQueryBuilder()
        .insert()
        .into(Dulce)
        .values(semilla)
        .orIgnore()
        .execute();
      this.logger.log(`Catálogo inicial cargado: ${semilla.length} ${this.config.articulo}s`);
    }

    // Los productos que llegaron sin sección pasan a "dulces", tanto los recién
    // sembrados como los que ya existían cuando se añadió la columna (punto de
    // secciones). Corre en cada arranque, no solo cuando se siembra: la tabla
    // puede estar llena y aun así tener filas sin asignar.
    await this.asignarSeccionDulces();
  }

  /**
   * Los `productos` de este negocio que no tienen sección pasan a la sección
   * `dulces`. Es la pasada de migración que evita que el sistema explote al
   * añadir la columna: el catálogo heredado (los dulces de la pastelería) queda
   * cobijado bajo su propia sección, y se ejecuta en cada arranque por si una
   * fila se quedó sin asignar.
   */
  async asignarSeccionDulces() {
    const sinSeccion = await this.dulceRepo.find({
      where: { negocio: this.config.clave, seccion: IsNull() },
    });

    if (sinSeccion.length === 0) return;

    const seccion = await this.seccionDulces();

    sinSeccion.forEach((dulce) => {
      dulce.seccion = seccion;
    });

    await this.dulceRepo.save(sinSeccion);

    this.logger.log(
      `${sinSeccion.length} ${this.config.articulo}${sinSeccion.length === 1 ? '' : 's'} asignado${sinSeccion.length === 1 ? '' : 's'} a la sección "dulces"`,
    );
  }

  /**
   * Devuelve la sección `dulces` de este negocio, creándola si hace falta. Es el
   * valor por defecto de los productos sin sección y el de todos los que no
   * manden `seccion_id` al darse de alta.
   */
  private async seccionDulces(manager?: EntityManager): Promise<Seccion> {
    const repo = manager ? manager.getRepository(Seccion) : this.seccionRepo;
    const existente = await repo.findOneBy({ negocio: this.config.clave, nombre: 'dulces' });

    if (existente) return existente;

    return repo.save(repo.create({ negocio: this.config.clave, nombre: 'dulces' }));
  }

  /** Las secciones del catálogo de este negocio, en orden de creación. */
  async listarSecciones() {
    const secciones = await this.seccionRepo.find({
      where: { negocio: this.config.clave },
      order: { id: 'ASC' },
    });

    return { secciones };
  }

  /**
   * Alta de una sección desde el panel. El nombre se guarda en minúsculas, para
   * que "Electronico" y "electronico" no acaben como dos secciones distintas. Una
   * sección repetida en el mismo negocio da `409` (la base lo impone con el
   * `UNIQUE(negocio, nombre)` y aquí se traduce a un mensaje claro).
   */
  async crearSeccion(nombre: string) {
    const limpio = nombre.trim().toLowerCase();
    this.comprobarNombreDeSeccion(limpio);

    if (await this.seccionRepo.existsBy({ negocio: this.config.clave, nombre: limpio })) {
      throw new ConflictException(`La sección "${limpio}" ya existe`);
    }

    const guardada = await this.seccionRepo.save(
      this.seccionRepo.create({ negocio: this.config.clave, nombre: limpio }),
    );

    return { mensaje: 'Sección creada correctamente', seccion: guardada };
  }

  /**
   * Cambia el nombre de una sección de este negocio (punto 2 del todo).
   *
   * Baja a minúsculas igual que en el alta, para que "Electronico" y
   * "electronico" no acaben siendo dos secciones distintas, y pasa por la misma
   * lista de nombres prohibidos. La sección se busca **dentro de este negocio**:
   * el id de otro negocio responde `404`, no se renombra nada ajeno.
   */
  async actualizarSeccion(id: number, nombre: string) {
    const limpio = nombre.trim().toLowerCase();
    this.comprobarNombreDeSeccion(limpio);

    const seccion = await this.seccionRepo.findOneBy({ id, negocio: this.config.clave });

    if (!seccion) throw new NotFoundException(`No existe la sección ${id}`);

    const repetida = await this.seccionRepo.findOneBy({
      negocio: this.config.clave,
      nombre: limpio,
    });

    // La misma comprobación que en el alta, pero dejando pasar la propia fila:
    // un rename que no cambia el nombre no es un error.
    if (repetida && repetida.id !== id) {
      throw new ConflictException(`La sección "${limpio}" ya existe`);
    }

    seccion.nombre = limpio;
    const guardada = await this.seccionRepo.save(seccion);

    return { mensaje: 'Sección actualizada correctamente', seccion: guardada };
  }

  /**
   * Borra una sección **vacía**.
   *
   * Si tiene productos se responde `409` con el número en vez de moverlos a
   * escondidas: la base lo impediría igualmente (`producto.seccion_id` no tiene
   * `onDelete`, así que el `DELETE` reventaría) y mandarlos a la sección de
   * reserva los escondería de la tienda. Es el aviso que pide la propia entidad
   * `Seccion` y es lo que permite decirle al panel qué hacer antes de borrar.
   */
  async eliminarSeccion(id: number) {
    const seccion = await this.seccionRepo.findOneBy({ id, negocio: this.config.clave });

    if (!seccion) throw new NotFoundException(`No existe la sección ${id}`);
    if (seccion.nombre === SECCION_RESERVADA) {
      throw new BadRequestException(
        `La sección "${SECCION_RESERVADA}" es la de reserva: no se puede borrar`,
      );
    }

    const productos = await this.dulceRepo.count({ where: { seccion_id: id } });

    if (productos > 0) {
      throw new ConflictException(
        `La sección "${seccion.nombre}" tiene ${productos} ${this.config.articulo}` +
          `${productos === 1 ? '' : 's'}: móvelos a otra sección antes de borrarla`,
      );
    }

    await this.seccionRepo.remove(seccion);

    return { ok: true };
  }

  /**
   * Nombres que el panel no puede usar. `dulces` es la sección por defecto y la
   * que el `AdcController` oculta de sus respuestas, así que una sección real
   * con ese nombre dejaría sus productos fuera de la tienda (punto 2).
   */
  private comprobarNombreDeSeccion(nombre: string) {
    if (!nombre) {
      throw new BadRequestException('El nombre de la sección no puede estar vacío');
    }

    if (nombre === SECCION_RESERVADA) {
      throw new BadRequestException(
        `"${SECCION_RESERVADA}" es la sección reservada del catálogo heredado: elige otro nombre`,
      );
    }
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
      if (!dulce) throw new NotFoundException(`No existe el ${this.config.articulo} ${encargoDto.dulce}`);

      precio_total += dulce.precio * encargoDto.cantidad;

      return this.encargoRepo.create({
        dulce,
        cantidad: encargoDto.cantidad,
      });
    });

    const pedido = await this.pedidoRepo.save(
      this.pedidoRepo.create({
        precio_total,
        negocio: this.config.clave,
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
    const dulces = await this.dulceRepo.find({
      where: { negocio: this.config.clave },
      relations: { seccion: true },
      order: { id: 'ASC' },
    });

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

      // Sin `seccion_id` el producto cae en "dulces", la sección que cobija al
      // catálogo heredado. Con él, la sección tiene que existir dentro de este
      // negocio: apuntar a una de otro negocio es un error, no un producto invisible.
      const seccion = createDulceDto.seccion_id
        ? await manager.findOneBy(Seccion, {
            id: createDulceDto.seccion_id,
            negocio: this.config.clave,
          })
        : await this.seccionDulces(manager);

      if (createDulceDto.seccion_id && !seccion) {
        throw new NotFoundException(`No existe la sección ${createDulceDto.seccion_id}`);
      }

      const dulce = manager.create(Dulce, {
        id,
        nombre: createDulceDto.nombre.trim(),
        precio: createDulceDto.precio,
        moneda: this.normalizarMoneda(createDulceDto.moneda),
        negocio: this.config.clave,
        imagen_url: null,
        imagen_bytes: null,
        seccion,
      });

      const guardado = await manager.save(Dulce, dulce);

      return { mensaje: `${this.articuloEnMayuscula()} creado correctamente`, dulce: guardado };
    });
  }

  /**
   * La moneda llega del panel como texto libre ('CUP', 'USD'…): a mayúsculas
   * para que 'usd' y 'USD' no sean dos monedas distintas, y vacío o ausente →
   * 'CUP', que es el valor por defecto de la columna (puntos 5 y 7.1).
   */
  private normalizarMoneda(moneda?: string): string {
    return moneda?.trim().toUpperCase() || 'CUP';
  }

  /**
   * Edición parcial. Se manda solo lo que cambia, y mandar los tres campos es
   * válido: en ese caso los dos cambian.
   */
  async actualizarDulce(id: number, updateDulceDto: UpdateDulceDto) {
    const { nombre, precio, moneda, seccion_id } = updateDulceDto;

    if (
      nombre === undefined &&
      precio === undefined &&
      moneda === undefined &&
      seccion_id === undefined
    ) {
      throw new BadRequestException(
        'No hay nada que actualizar: manda "nombre", "precio", "moneda" o "seccion_id"',
      );
    }

    const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });

    if (!dulce) throw new NotFoundException(`No existe el ${this.config.articulo} ${id}`);

    if (nombre !== undefined) dulce.nombre = nombre.trim();
    if (precio !== undefined) dulce.precio = precio;
    if (moneda !== undefined) dulce.moneda = this.normalizarMoneda(moneda);

    // Mover el producto entre secciones. La nueva sección tiene que ser de este
    // negocio (ver `crearDulce`); el DTO exige un id de sección positivo y no
    // admite "quitar sección", o sea que a "sin sección" no se vuelve: lo más
    // parecido es moverlo a la sección "dulces" de su negocio por id.
    if (seccion_id !== undefined) {
      const seccion = await this.seccionRepo.findOneBy({
        id: seccion_id,
        negocio: this.config.clave,
      });

      if (!seccion) throw new NotFoundException(`No existe la sección ${seccion_id}`);

      dulce.seccion = seccion;
    }

    const guardado = await this.dulceRepo.save(dulce);

    return { mensaje: `${this.articuloEnMayuscula()} actualizado correctamente`, dulce: guardado };
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
    const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });

    if (!dulce) throw new NotFoundException(`No existe el ${this.config.articulo} ${id}`);

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
        .andWhere('pedido.negocio = :negocio', { negocio: this.config.clave })
        .getCount();
    } catch (error) {
      this.logger.error(`No se pudo comprobar si el ${this.config.articulo} ${dulceId} está en pedidos: ${error}`);

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
    const pedidos = await this.pedidoRepo.find({ where: { negocio: this.config.clave }, relations });

    return { pedidos };
  }

  async obtenerPedido(id: string) {
    const pedido = await this.pedidoRepo.findOne({ where: { id, negocio: this.config.clave }, relations });

    if (!pedido) throw new NotFoundException(`No existe el pedido ${id}`);

    return pedido;
  }

  async remove(id: string) {
    const pedido = await this.pedidoRepo.findOneBy({ id, negocio: this.config.clave });

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
    const encontrados = await this.dulceRepo.findBy({ id: In(ids), negocio: this.config.clave });
    const porId = new Map(encontrados.map((dulce) => [dulce.id, dulce]));

    const faltantes = [...new Set(ids)].filter((id) => !porId.has(id));

    if (faltantes.length === 1) {
      throw new NotFoundException(`No existe el ${this.config.articulo} ${faltantes[0]}`);
    }

    if (faltantes.length > 1) {
      throw new NotFoundException(`No existen los ${this.config.articulo}s ${faltantes.join(', ')}`);
    }

    return porId;
  }
}