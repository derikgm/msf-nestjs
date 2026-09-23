import { Injectable, NotFoundException } from '@nestjs/common';
import {  CreatePedidoDto } from './dto/create-pedido.dto.js';
import { Dulce, Encargo, Pedido } from './interfaces/delys.interfaces.js';
import { randomUUID } from 'crypto';
import { ofertas } from './data/ofertas.js';
import { ConfigService } from '@nestjs/config';
import { Database } from '@sqlitecloud/drivers';
import { toPlainArray } from '../common/utils/rowset.util.js';

@Injectable()
export class DelysService {
  private db: Database

  pedidos: Pedido[] = [];
  dulces: Dulce[] = ofertas;

  constructor(private configService: ConfigService){
    //TODO: buscar como cambiar esto a algo que funcione mejor
    this.db = new Database(configService.get(`SQLITECLOUD_URL`)!);
  }

  agregarEncargo(createPedidoDto: CreatePedidoDto) {
    const { encargos } = createPedidoDto;

    let precio_total = 0;
    const encargosMapeados: Encargo[] = encargos.map((e) => {
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

    const pedido: Pedido = {
      id: randomUUID(), // o el generador que uses
      encargos: encargosMapeados,
      precio_total,
    };

    this.pedidos.push(pedido);

    return { ok: true, pedido };
  }

  async obtenerTodosDulces() {
    try {
      const data = await this.db.sql(`SELECT * FROM dulce`);

      const dulces = toPlainArray<Dulce>(data);

      return {dulces};
    } catch (e) {
      console.log("Un error ocurrio: ", e)
    }
  }

  async obtenerTodosPedidos() {
    // const data = await this.db.sql(`SELECT * FROM dulce`);

    // const dulces = toPlainArray<Dulce>(data);

    // return {dulces};
  }

  obtenerEncargo(id: string) {
    const encargo = this.pedidos.find(e => e.id == id);

    if(!encargo)
      throw new NotFoundException();

    return encargo;
  }

  remove(id: string) {
    this.obtenerEncargo(id);

    this.pedidos = this.pedidos.filter(e => !(e.id == id))

    return {ok: true};
  }

  //Seccion de ofertas:
  obtenerOfertas() {
    return `Seccion de ofertas...`;
  }

}