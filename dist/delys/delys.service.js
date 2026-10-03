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
import { DulceImagenService } from './dulce-imagen.service.js';
const relations = {
    encargos: { dulce: true },
};
let DelysService = DelysService_1 = class DelysService {
    pedidoRepo;
    encargoRepo;
    dulceRepo;
    imagenes;
    logger = new Logger(DelysService_1.name);
    constructor(pedidoRepo, encargoRepo, dulceRepo, imagenes) {
        this.pedidoRepo = pedidoRepo;
        this.encargoRepo = encargoRepo;
        this.dulceRepo = dulceRepo;
        this.imagenes = imagenes;
    }
    async onApplicationBootstrap() {
        if ((await this.dulceRepo.count()) > 0)
            return;
        await this.dulceRepo.save(this.dulceRepo.create(ofertas));
        this.logger.log(`Catálogo inicial cargado: ${ofertas.length} dulces`);
    }
    async crearPedido(createPedidoDto) {
        const { encargos: encargosDto } = createPedidoDto;
        const dulces = await this.dulcesDelCatalogo(encargosDto.map((e) => e.dulce));
        let precio_total = 0;
        const encargos = encargosDto.map((encargoDto) => {
            const dulce = dulces.get(encargoDto.dulce);
            if (!dulce)
                throw new NotFoundException(`No existe el dulce ${encargoDto.dulce}`);
            precio_total += dulce.precio * encargoDto.cantidad;
            return this.encargoRepo.create({
                dulce,
                cantidad: encargoDto.cantidad,
            });
        });
        const pedido = await this.pedidoRepo.save(this.pedidoRepo.create({
            precio_total,
            direccion: createPedidoDto.direccion.trim(),
            telefono: createPedidoDto.telefono.trim(),
            fecha: createPedidoDto.fecha,
            notas: createPedidoDto.notas?.trim() || null,
            encargos,
        }));
        return { ok: true, pedido: await this.obtenerPedido(pedido.id) };
    }
    async obtenerTodosDulces() {
        const dulces = await this.dulceRepo.find({ order: { id: 'ASC' } });
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
                imagen_url: null,
                imagen_bytes: null,
            });
            const guardado = await manager.save(Dulce, dulce);
            return { mensaje: 'Dulce creado correctamente', dulce: guardado };
        });
    }
    async actualizarDulce(id, updateDulceDto) {
        const { nombre, precio } = updateDulceDto;
        if (nombre === undefined && precio === undefined) {
            throw new BadRequestException('No hay nada que actualizar: manda "nombre" o "precio"');
        }
        const dulce = await this.dulceRepo.findOneBy({ id });
        if (!dulce)
            throw new NotFoundException(`No existe el dulce ${id}`);
        if (nombre !== undefined)
            dulce.nombre = nombre.trim();
        if (precio !== undefined)
            dulce.precio = precio;
        const guardado = await this.dulceRepo.save(dulce);
        return { mensaje: 'Dulce actualizado correctamente', dulce: guardado };
    }
    async eliminarDulce(id, caller) {
        const dulce = await this.dulceRepo.findOneBy({ id });
        if (!dulce)
            throw new NotFoundException(`No existe el dulce ${id}`);
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
                .getCount();
        }
        catch (error) {
            this.logger.error(`No se pudo comprobar si el dulce ${dulceId} está en pedidos: ${error}`);
            throw new ServiceUnavailableException('No se pudo comprobar los pedidos. Inténtalo de nuevo.');
        }
    }
    mensajeDePedidosQueBloquean(nombre, pedidos) {
        const plural = pedidos === 1 ? 'pedido' : 'pedidos';
        return (`"${nombre}" está en ${pedidos} ${plural} sin resolver. ` +
            'Márcalo como hecho o cancélalo en Pedidos, y ya lo podrás borrar.');
    }
    async obtenerTodosPedidos() {
        const pedidos = await this.pedidoRepo.find({ relations });
        return { pedidos };
    }
    async obtenerPedido(id) {
        const pedido = await this.pedidoRepo.findOne({ where: { id }, relations });
        if (!pedido)
            throw new NotFoundException(`No existe el pedido ${id}`);
        return pedido;
    }
    async remove(id) {
        const pedido = await this.pedidoRepo.findOneBy({ id });
        if (!pedido)
            throw new NotFoundException(`No existe el pedido ${id}`);
        await this.pedidoRepo.remove(pedido);
        return { ok: true };
    }
    obtenerOfertas() {
        return { ofertas };
    }
    async dulcesDelCatalogo(ids) {
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
};
DelysService = DelysService_1 = __decorate([
    Injectable(),
    __param(0, Inject(getRepositoryToken(Pedido))),
    __param(1, Inject(getRepositoryToken(Encargo))),
    __param(2, Inject(getRepositoryToken(Dulce))),
    __metadata("design:paramtypes", [Repository,
        Repository,
        Repository,
        DulceImagenService])
], DelysService);
export { DelysService };
//# sourceMappingURL=delys.service.js.map