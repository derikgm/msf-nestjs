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
var ModelosService_1;
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException, } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NEGOCIO } from '../config/negocio.config.js';
import { Dulce, Encargo, ProductoModelo } from '../entities/index.js';
import { ImagenService } from './imagen.service.js';
import { StorageQuotaService } from './storage-quota.service.js';
const LIMITE_ATRIBUTOS = 12;
const LIMITE_ETIQUETA = 40;
const LIMITE_VALOR = 120;
let ModelosService = ModelosService_1 = class ModelosService {
    config;
    modeloRepo;
    dulceRepo;
    encargoRepo;
    imagenes;
    cuota;
    logger = new Logger(ModelosService_1.name);
    constructor(config, modeloRepo, dulceRepo, encargoRepo, imagenes, cuota) {
        this.config = config;
        this.modeloRepo = modeloRepo;
        this.dulceRepo = dulceRepo;
        this.encargoRepo = encargoRepo;
        this.imagenes = imagenes;
        this.cuota = cuota;
    }
    async porPublicacion(productoId) {
        const publicacion = await this.publicacion(productoId);
        return this.modeloRepo.find({
            where: { producto_id: publicacion.id },
            order: { id: 'ASC' },
        });
    }
    async porPublicaciones(productoIds) {
        const agrupados = new Map(productoIds.map((id) => [id, []]));
        if (!productoIds.length)
            return agrupados;
        const modelos = await this.modeloRepo.find({
            where: { producto_id: In(productoIds) },
            order: { id: 'ASC' },
        });
        for (const modelo of modelos)
            agrupados.get(modelo.producto_id)?.push(modelo);
        return agrupados;
    }
    async crear(productoId, dto) {
        const publicacion = await this.publicacion(productoId);
        const nombre = dto.nombre.trim();
        await this.comprobarNombreLibre(publicacion.id, nombre);
        const guardado = await this.modeloRepo.save(this.modeloRepo.create({
            producto_id: publicacion.id,
            nombre,
            precio: dto.precio,
            moneda: this.normalizarMoneda(dto.moneda),
            atributos: this.limpiarAtributos(dto.atributos),
        }));
        return { mensaje: 'Modelo creado', modelo: guardado };
    }
    async actualizar(id, dto) {
        const modelo = await this.modeloDe(id);
        if (Object.keys(dto).length === 0) {
            throw new BadRequestException('No mandaste ningún campo que cambiar');
        }
        if (dto.nombre !== undefined) {
            const nombre = dto.nombre.trim();
            await this.comprobarNombreLibre(modelo.producto_id, nombre, modelo.id);
            modelo.nombre = nombre;
        }
        if (dto.precio !== undefined)
            modelo.precio = dto.precio;
        if (dto.moneda !== undefined)
            modelo.moneda = this.normalizarMoneda(dto.moneda);
        if (dto.atributos !== undefined)
            modelo.atributos = this.limpiarAtributos(dto.atributos);
        const guardado = await this.modeloRepo.save(modelo);
        return { mensaje: 'Modelo actualizado', modelo: guardado };
    }
    async eliminar(id, caller) {
        const modelo = await this.modeloDe(id);
        const pedidos = await this.pedidosQueLoPiden(modelo.id);
        if (pedidos > 0) {
            const plural = pedidos === 1 ? 'pedido' : 'pedidos';
            throw new ConflictException(`"${modelo.nombre}" está en ${pedidos} ${plural}. ` +
                'Bórralos desde Pedidos y ya podrás quitar el modelo.');
        }
        await this.imagenes.liberarParaBorrar(modelo, caller.rol, `modelo ${id}`);
        await this.modeloRepo.remove(modelo);
        return { mensaje: 'Modelo eliminado' };
    }
    async pedidosQueLoPiden(modeloId) {
        try {
            return await this.encargoRepo
                .createQueryBuilder('encargo')
                .innerJoin('encargo.pedido', 'pedido')
                .where('encargo.modelo_id = :modeloId', { modeloId })
                .andWhere('pedido.negocio = :negocio', { negocio: this.config.clave })
                .getCount();
        }
        catch (error) {
            this.logger.error(`No se pudo comprobar si el modelo ${modeloId} está en pedidos: ${error}`);
            throw new ServiceUnavailableException('No se pudo comprobar los pedidos. Inténtalo de nuevo.');
        }
    }
    async subirImagen(id, file, caller) {
        const modelo = await this.modeloDe(id);
        const actualizado = await this.imagenes.subir(this.modeloRepo, modelo, file, caller.rol, 'modelos', `modelo ${id}`);
        return {
            mensaje: 'Imagen subida correctamente',
            modelo: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async eliminarImagen(id, caller) {
        const modelo = await this.modeloDe(id);
        const actualizado = await this.imagenes.eliminar(this.modeloRepo, modelo, caller.rol, `modelo ${id}`);
        return {
            mensaje: 'Imagen eliminada',
            modelo: actualizado,
            cuota: await this.cuota.getResumen(caller.rol),
        };
    }
    async publicacion(productoId) {
        const publicacion = await this.dulceRepo.findOneBy({
            id: productoId,
            negocio: this.config.clave,
        });
        if (!publicacion) {
            throw new NotFoundException(`No existe el ${this.config.articulo} ${productoId}`);
        }
        return publicacion;
    }
    async modeloDe(id) {
        const modelo = await this.modeloRepo.findOne({
            where: { id },
            relations: { producto: true },
        });
        if (!modelo || modelo.producto.negocio !== this.config.clave) {
            throw new NotFoundException(`No existe el modelo ${id}`);
        }
        return modelo;
    }
    async comprobarNombreLibre(productoId, nombre, exceptoId) {
        if (!nombre)
            throw new BadRequestException('El nombre del modelo no puede estar vacío');
        const existente = await this.modeloRepo.findOneBy({ producto_id: productoId, nombre });
        if (existente && existente.id !== exceptoId) {
            throw new ConflictException(`Este ${this.config.articulo} ya tiene un modelo llamado "${nombre}"`);
        }
    }
    normalizarMoneda(moneda) {
        return moneda?.trim().toUpperCase() || 'CUP';
    }
    limpiarAtributos(atributos) {
        const limpios = {};
        for (const [etiquetaBruta, valorBruto] of Object.entries(atributos ?? {})) {
            const etiqueta = etiquetaBruta.trim();
            const valor = this.textoDelValor(valorBruto, etiqueta);
            if (!etiqueta && !valor)
                continue;
            if (!etiqueta) {
                throw new BadRequestException('Cada característica necesita su nombre ("Peso", no solo el valor)');
            }
            if (!valor) {
                throw new BadRequestException(`Falta el valor de la característica "${etiqueta}"`);
            }
            if (etiqueta.length > LIMITE_ETIQUETA) {
                throw new BadRequestException(`El nombre de una característica no puede pasar de ${LIMITE_ETIQUETA} letras ("${etiqueta.slice(0, 20)}…")`);
            }
            if (valor.length > LIMITE_VALOR) {
                throw new BadRequestException(`El valor de "${etiqueta}" no puede pasar de ${LIMITE_VALOR} letras`);
            }
            limpios[etiqueta] = valor;
        }
        if (Object.keys(limpios).length > LIMITE_ATRIBUTOS) {
            throw new BadRequestException(`Un modelo no puede tener más de ${LIMITE_ATRIBUTOS} características`);
        }
        return limpios;
    }
    textoDelValor(valor, etiqueta) {
        if (valor === null || valor === undefined)
            return '';
        if (typeof valor === 'string')
            return valor.trim();
        if (typeof valor === 'number' || typeof valor === 'boolean')
            return String(valor);
        throw new BadRequestException(`La característica "${etiqueta}" tiene que ser texto (por ejemplo "38 kg")`);
    }
};
ModelosService = ModelosService_1 = __decorate([
    Injectable(),
    __param(0, Inject(NEGOCIO)),
    __param(1, Inject(getRepositoryToken(ProductoModelo))),
    __param(2, Inject(getRepositoryToken(Dulce))),
    __param(3, Inject(getRepositoryToken(Encargo))),
    __metadata("design:paramtypes", [Object, Repository,
        Repository,
        Repository,
        ImagenService,
        StorageQuotaService])
], ModelosService);
export { ModelosService };
//# sourceMappingURL=modelos.service.js.map