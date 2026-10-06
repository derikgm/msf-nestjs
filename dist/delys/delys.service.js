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
var DelysService_1;
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException, } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Dulce, Encargo, Pedido } from './entities/index.js';
import { ofertas } from './data/ofertas.js';
import { NEGOCIO } from './negocio.config.js';
import { DulceImagenService } from './dulce-imagen.service.js';
const relations = {
    encargos: { dulce: true },
};
let DelysService = DelysService_1 = class DelysService {
    config;
    pedidoRepo;
    encargoRepo;
    dulceRepo;
    imagenes;
    logger = new Logger(DelysService_1.name);
    constructor(config, pedidoRepo, encargoRepo, dulceRepo, imagenes) {
        this.config = config;
        this.pedidoRepo = pedidoRepo;
        this.encargoRepo = encargoRepo;
        this.dulceRepo = dulceRepo;
        this.imagenes = imagenes;
    }
    articuloEnMayuscula() {
        const articulo = this.config.articulo;
        return articulo.charAt(0).toUpperCase() + articulo.slice(1);
    }
    async onApplicationBootstrap() {
        const actuales = await this.dulceRepo.count({ where: { negocio: this.config.clave } });
        if (actuales > 0 || this.config.catalogoInicial.length === 0)
            return;
        const semilla = this.config.catalogoInicial.map((dulce) => ({
            ...dulce,
            negocio: this.config.clave,
        }));
        await this.dulceRepo.save(this.dulceRepo.create(semilla));
        this.logger.log(`Catálogo inicial cargado: ${semilla.length} ${this.config.articulo}s`);
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
            const dulce = manager.create(Dulce, {
                id,
                nombre: createDulceDto.nombre.trim(),
                precio: createDulceDto.precio,
                moneda: this.normalizarMoneda(createDulceDto.moneda),
                negocio: this.config.clave,
                imagen_url: null,
                imagen_bytes: null,
            });
            const guardado = await manager.save(Dulce, dulce);
            return { mensaje: `${this.articuloEnMayuscula()} creado correctamente`, dulce: guardado };
        });
    }
    normalizarMoneda(moneda) {
        return moneda?.trim().toUpperCase() || 'CUP';
    }
    async actualizarDulce(id, updateDulceDto) {
        const { nombre, precio, moneda } = updateDulceDto;
        if (nombre === undefined && precio === undefined && moneda === undefined) {
            throw new BadRequestException('No hay nada que actualizar: manda "nombre", "precio" o "moneda"');
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
DelysService = DelysService_1 = __decorate([
    Injectable(),
    __param(0, Inject(NEGOCIO)),
    __param(1, Inject(getRepositoryToken(Pedido))),
    __param(2, Inject(getRepositoryToken(Encargo))),
    __param(3, Inject(getRepositoryToken(Dulce))),
    __metadata("design:paramtypes", [Object, Repository,
        Repository,
        Repository,
        DulceImagenService])
], DelysService);
export { DelysService };
//# sourceMappingURL=delys.service.js.map