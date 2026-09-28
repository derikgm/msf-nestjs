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
import { Public } from '../auth/public.decorator.js';

@Controller('delys')
export class DelysController {
  constructor(private readonly delysService: DelysService) {}

  // Rutas del catálogo: públicas, sin token.
  @Public()
  @Get('dulces')
  obtenerDulces() {
    return this.delysService.obtenerTodosDulces();
  }

  @Public()
  @Get('ofertas')
  obtenerOfertas() {
    return this.delysService.obtenerOfertas();
  }

  // Rutas de pedidos: protegidas por el JwtAuthGuard global.
  @Post('pedido')
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.delysService.crearPedido(createPedidoDto);
  }

  @Get('pedidos')
  obtenerPedidos() {
    return this.delysService.obtenerTodosPedidos();
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
