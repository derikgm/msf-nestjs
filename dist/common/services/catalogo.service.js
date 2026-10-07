var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CatalogoService_1;
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException, } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Dulce, Encargo, Pedido, Seccion } from '../entities/index.js';
import { ofertas } from '../data/ofertas.js';
import { NEGOCIO } from '../config/negocio.config.js';
import { DulceImagenService } from './dulce-imagen.service.js';
const relations = {
    encargos: { dulce: true },
};
let CatalogoService = CatalogoService_1 = class CatalogoService {
    config;
    pedidoRepo;
    encargoRepo;
    dulceRepo;
    seccionRepo;
    imagenes;
    logger = new Logger(CatalogoService_1.name);
    constructor(config, pedidoRepo, encargoRepo, dulceRepo, seccionRepo, imagenes) {
        this.config = config;
        this.pedidoRepo = pedidoRepo;
        this.encargoRepo = encargoRepo;
        this.dulceRepo = dulceRepo;
        this.seccionRepo = seccionRepo;
        this.imagenes = imagenes;
    }
    articuloEnMayuscula() {
        const articulo = this.config.articulo;
        return articulo.charAt(0).toUpperCase() + articulo.slice(1);
    }
    async onApplicationBootstrap() {
        const actuales = await this.dulceRepo.count({ where: { negocio: this.config.clave } });
        if (actuales === 0 && this.config.catalogoInicial.length > 0) {
            const semilla = this.config.catalogoInicial.map((dulce) => ({
                ...dulce,
                negocio: this.config.clave,
            }));
            await this.dulceRepo.save(this.dulceRepo.create(semilla));
            this.logger.log(`Catálogo inicial cargado: ${semilla.length} ${this.config.articulo}s`);
        }
        await this.asignarSeccionDulces();
    }
    async asignarSeccionDulces() {
        const sinSeccion = await this.dulceRepo.find({
            where: { negocio: this.config.clave, seccion: IsNull() },
        });
        if (sinSeccion.length === 0)
            return;
        const seccion = await this.seccionDulces();
        sinSeccion.forEach((dulce) => {
            dulce.seccion = seccion;
        });
        await this.dulceRepo.save(sinSeccion);
        this.logger.log(`${sinSeccion.length} ${this.config.articulo}${sinSeccion.length === 1 ? '' : 's'} asignado${sinSeccion.length === 1 ? '' : 's'} a la sección "dulces"`);
    }
    async seccionDulces(manager) {
        const repo = manager ? manager.getRepository(Seccion) : this.seccionRepo;
        const existente = await repo.findOneBy({ negocio: this.config.clave, nombre: 'dulces' });
        if (existente)
            return existente;
        return repo.save(repo.create({ negocio: this.config.clave, nombre: 'dulces' }));
    }
    async listarSecciones() {
        const secciones = await this.seccionRepo.find({
            where: { negocio: this.config.clave },
            order: { id: 'ASC' },
        });
        return { secciones };
    }
    async crearSeccion(nombre) {
        const limpio = nombre.trim().toLowerCase();
        if (await this.seccionRepo.existsBy({ negocio: this.config.clave, nombre: limpio })) {
            throw new ConflictException(`La sección "${limpio}" ya existe`);
        }
        const guardada = await this.seccionRepo.save(this.seccionRepo.create({ negocio: this.config.clave, nombre: limpio }));
        return { mensaje: 'Sección creada correctamente', seccion: guardada };
    }
    async crearPedido(createPedidoDto) {
        const { encargos: encargosDto } = createPedidoDto;
        const dulces = await this.dulcesDelCatalogo(encargosDto.map((e) => e.dulce));
        let precio_total = 0;
        const encargos = encargosDto.map((encargoDto) => {
            const dulce = dulces.get(encargoDto.dulce);
            if (!dulce)
                throw new NotFoundException(`No existe el ${this.config.articulo} ${encargoDto.dulce}`);
            precio_total += dulce.precio * encargoDto.cantidad;
            return this.encargoRepo.create({
                dulce,
                cantidad: encargoDto.cantidad,
            });
        });
        const pedido = await this.pedidoRepo.save(this.pedidoRepo.create({
            precio_total,
            negocio: this.config.clave,
            direccion: createPedidoDto.direccion.trim(),
            telefono: createPedidoDto.telefono.trim(),
            fecha: createPedidoDto.fecha,
            notas: createPedidoDto.notas?.trim() || null,
            encargos,
        }));
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
    async crearDulce(createDulceDto) {
        return this.dulceRepo.manager.transaction(async (manager) => {
            const siguiente = await manager
                .createQueryBuilder(Dulce, 'dulce')
                .select('MAX(dulce.id)', 'maximo')
                .getRawOne();
            const id = (siguiente?.maximo ?? 0) + 1;
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
    normalizarMoneda(moneda) {
        return moneda?.trim().toUpperCase() || 'CUP';
    }
    async actualizarDulce(id, updateDulceDto) {
        const { nombre, precio, moneda, seccion_id } = updateDulceDto;
        if (nombre === undefined &&
            precio === undefined &&
            moneda === undefined &&
            seccion_id === undefined) {
            throw new BadRequestException('No hay nada que actualizar: manda "nombre", "precio", "moneda" o "seccion_id"');
        }
        const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });
        if (!dulce)
            throw new NotFoundException(`No existe el ${this.config.articulo} ${id}`);
        if (nombre !== undefined)
            dulce.nombre = nombre.trim();
        if (precio !== undefined)
            dulce.precio = precio;
        if (moneda !== undefined)
            dulce.moneda = this.normalizarMoneda(moneda);
        if (seccion_id !== undefined) {
            const seccion = await this.seccionRepo.findOneBy({
                id: seccion_id,
                negocio: this.config.clave,
            });
            if (!seccion)
                throw new NotFoundException(`No existe la sección ${seccion_id}`);
            dulce.seccion = seccion;
        }
        const guardado = await this.dulceRepo.save(dulce);
        return { mensaje: `${this.articuloEnMayuscula()} actualizado correctamente`, dulce: guardado };
    }
    async eliminarDulce(id, caller) {
        const dulce = await this.dulceRepo.findOneBy({ id, negocio: this.config.clave });
        if (!dulce)
            throw new NotFoundException(`No existe el ${this.config.articulo} ${id}`);
        const pedidos = await this.pedidosQuePiden(dulce.id);
        if (pedidos > 0)
            throw new ConflictException(this.mensajeDePedidosQueBloquean(dulce.nombre, pedidos));
        await this.imagenes.liberarParaBorrar(dulce, caller);
        await this.dulceRepo.remove(dulce);
        return { ok: true };
    }
    async pedidosQuePiden(dulceId) {
        try {
            return await this.encargoRepo
                .createQueryBuilder('encargo')
                .innerJoin('encargo.pedido', 'pedido')
                .where('encargo.dulce = :dulceId', { dulceId })
                .andWhere('pedido.negocio = :negocio', { negocio: this.config.clave })
                .getCount();
        }
        catch (error) {
            this.logger.error(`No se pudo comprobar si el ${this.config.articulo} ${dulceId} está en pedidos: ${error}`);
            throw new ServiceUnavailableException('No se pudo comprobar los pedidos. Inténtalo de nuevo.');
        }
    }
    mensajeDePedidosQueBloquean(nombre, pedidos) {
        const plural = pedidos === 1 ? 'pedido' : 'pedidos';
        return (`"${nombre}" está en ${pedidos} ${plural} sin resolver. ` +
            'Márcalo como hecho o cancélalo en Pedidos, y ya lo podrás borrar.');
    }
    async obtenerTodosPedidos() {
        const pedidos = await this.pedidoRepo.find({ where: { negocio: this.config.clave }, relations });
        return { pedidos };
    }
    async obtenerPedido(id) {
        const pedido = await this.pedidoRepo.findOne({ where: { id, negocio: this.config.clave }, relations });
        if (!pedido)
            throw new NotFoundException(`No existe el pedido ${id}`);
        return pedido;
    }
    async remove(id) {
        const pedido = await this.pedidoRepo.findOneBy({ id, negocio: this.config.clave });
        if (!pedido)
            throw new NotFoundException(`No existe el pedido ${id}`);
        await this.pedidoRepo.remove(pedido);
        return { ok: true };
    }
    obtenerOfertas() {
        return { ofertas };
    }
    async dulcesDelCatalogo(ids) {
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
};
CatalogoService = CatalogoService_1 = __decorate([
    Injectable(),
    __param(0, Inject(NEGOCIO)),
    __param(1, Inject(getRepositoryToken(Pedido))),
    __param(2, Inject(getRepositoryToken(Encargo))),
    __param(3, Inject(getRepositoryToken(Dulce))),
    __param(4, Inject(getRepositoryToken(Seccion))),
    __metadata("design:paramtypes", [Object, Repository,
        Repository,
        Repository,
        Repository,
        DulceImagenService])
], CatalogoService);
export { CatalogoService };
//# sourceMappingURL=catalogo.service.js.map