var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ofertas } from './data/ofertas.js';
import { ConfigService } from '@nestjs/config';
import { Database } from '@sqlitecloud/drivers';
import { toPlainArray } from '../common/utils/rowset.util.js';
let DelysService = class DelysService {
    configService;
    db;
    pedidos = [];
    dulces = ofertas;
    constructor(configService) {
        this.configService = configService;
        this.db = new Database(configService.get(`SQLITECLOUD_URL`));
    }
    agregarEncargo(createPedidoDto) {
        const { encargos } = createPedidoDto;
        let precio_total = 0;
        const encargosMapeados = encargos.map((e) => {
            const subtotal = e.dulce.precio * e.cantidad;
            precio_total += subtotal;
            return {
                dulce: {
                    id: e.dulce.id,
                    nombre: e.dulce.nombre,
                    precio: e.dulce.precio,
                },
                cantidad: e.cantidad,
            };
        });
        const pedido = {
            id: randomUUID(),
            encargos: encargosMapeados,
            precio_total,
        };
        this.pedidos.push(pedido);
        return { ok: true, pedido };
    }
    async obtenerTodosDulces() {
        try {
            const data = await this.db.sql(`SELECT * FROM dulce`);
            const dulces = toPlainArray(data);
            return { dulces };
        }
        catch (e) {
            console.log("Un error ocurrio: ", e);
        }
    }
    async obtenerTodosPedidos() {
    }
    obtenerEncargo(id) {
        const encargo = this.pedidos.find(e => e.id == id);
        if (!encargo)
            throw new NotFoundException();
        return encargo;
    }
    remove(id) {
        this.obtenerEncargo(id);
        this.pedidos = this.pedidos.filter(e => !(e.id == id));
        return { ok: true };
    }
    obtenerOfertas() {
        return `Seccion de ofertas...`;
    }
};
DelysService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], DelysService);
export { DelysService };
//# sourceMappingURL=delys.service.js.map