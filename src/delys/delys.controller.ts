import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { DelysService } from './delys.service.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';

@Controller('delys')
export class DelysController {
  constructor(private readonly delysService: DelysService) {}

  @Post('pedido')
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.delysService.crearPedido(createPedidoDto);
  }

  @Get('pedidos')
  obtenerPedidos() {
    return this.delysService.obtenerTodosPedidos();
  }

  @Get('dulces')
  obtenerDulces() {
    return this.delysService.obtenerTodosDulces();
  }

  //SECCION DE OFERTAS (debe ir antes de ':id' o ":id" se lo come)
  @Get('ofertas')
  obtenerOfertas() {
    return this.delysService.obtenerOfertas();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.delysService.obtenerPedido(id);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.delysService.remove(id);
  }
}
