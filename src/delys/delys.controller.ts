import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DelysService } from './delys.service.js';
import { CreateEncargoDto, CreatePedidoDto } from './dto/create-pedido.dto.js';

@Controller('delys')
export class DelysController {
  constructor(private readonly delysService: DelysService) {}

  @Post('pedido')
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.delysService.agregarEncargo(createPedidoDto);
  }

  @Get('pedidos')
  obtenerPedidos() {
    return this.delysService.obtenerTodosPedidos();
  }  
  
  @Get('dulces')
  obtenerDulces() {
    return this.delysService.obtenerTodosDulces();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.delysService.obtenerEncargo(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.delysService.remove(id);
  }

  //SECCION DE OFERTAS
  @Get('ofertas')
  obtenerOfertas() {
    return this.delysService.obtenerOfertas();
  }
}
