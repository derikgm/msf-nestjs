import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DelysService } from '../delys/delys.service.js';
import { DulceImagenService, type MulterFile } from '../delys/dulce-imagen.service.js';
import { CreateDulceDto } from '../delys/dto/create-dulce.dto.js';
import { CreatePedidoDto } from '../delys/dto/create-pedido.dto.js';
import { UpdateDulceDto } from '../delys/dto/update-dulce.dto.js';
import type { AuthUser, RequestConUsuario } from '../auth/auth.interfaces.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';

/** Mismo tope y mismos tipos que en Delys: es el mismo Storage y el mismo plan. */
const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Rutas de ADC: el espejo de `DelysController` con dos diferencias.
 *
 * 1. Se llaman `productos` y no `dulces`, tal como pide el enunciado del punto
 *    6 (`GET /adc/productos`). Los de Delys siguen en `/delys/dulces`.
 * 2. Lo de gestión exige el rol `adc` (y la ruta pública de pedido se abre
 *    igual que en Delys: quien pide paneles no tiene cuenta).
 *
 * **La lógica no está duplicada**: el controlador solo llama a su propio
 * `DelysService`, y el módulo lo proporciona con `CONFIG_ADC`, de modo que sus
 * consultas filtran por `negocio = 'adc'`. Tablas y servicio se comparten; las
 * filas no se pisan.
 *
 * Las claves de la respuesta hablan de `producto` (y no de `dulce`), que es el
 * idioma de este negocio: el servicio devuelve `dulce` porque así lo lee el
 * panel de Delys, y aquí se traducen.
 */
@Controller('adc')
export class AdcController {
  constructor(
    private readonly delysService: DelysService,
    private readonly imagenService: DulceImagenService,
  ) {}

  // Catálogo: público, sin token, igual que la vitrina de Delys.
  @Public()
  @Get('productos')
  async obtenerProductos() {
    const { dulces } = await this.delysService.obtenerTodosDulces();

    return { productos: dulces };
  }

  // Gestión del catálogo desde el panel de ADC. El id lo asigna el servidor,
  // igual que en Delys (ver `DelysService.crearDulce()`).
  @Roles('adc')
  @Post('productos')
  async crearProducto(@Body() createDulceDto: CreateDulceDto) {
    const { mensaje, dulce } = await this.delysService.crearDulce(createDulceDto);

    return { mensaje, producto: dulce };
  }

  @Roles('adc')
  @Patch('productos/:id')
  async actualizarProducto(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateDulceDto: UpdateDulceDto,
  ) {
    const { mensaje, dulce } = await this.delysService.actualizarDulce(id, updateDulceDto);

    return { mensaje, producto: dulce };
  }

  @Roles('adc')
  @Delete('productos/:id')
  eliminarProducto(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.delysService.eliminarDulce(id, this.usuarioActual(request));
  }

  // Imágenes: multipart/form-data con el archivo en el campo "imagen". La cuota
  // y el bucket son los del rol del token; el producto se busca además por
  // `negocio`, para que un token de ADC no toque las fotos de Delys.
  @Roles('adc')
  @Post('productos/:id/imagen')
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 },
      fileFilter: (_req, file, callback) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}. Usa ${TIPOS_PERMITIDOS.join(', ')}`,
            ),
            false,
          );
        }

        return callback(null, true);
      },
    }),
  )
  subirImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @UploadedFile() file: MulterFile | undefined,
    @Req() request: RequestConUsuario,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Falta el archivo. Envíalo como multipart/form-data en el campo "imagen"',
      );
    }

    return this.imagenService.subir(id, file, this.usuarioActual(request));
  }

  @Roles('adc')
  @Delete('productos/:id/imagen')
  eliminarImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.imagenService.eliminar(id, this.usuarioActual(request));
  }

  // Alta de pedidos: pública, por la misma razón que en Delys (el cliente no
  // tiene cuenta). El resto de rutas de pedidos son del panel y piden token.
  @Public()
  @Post('pedido')
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.delysService.crearPedido(createPedidoDto);
  }

  @Roles('adc')
  @Get('pedidos')
  obtenerPedidos() {
    return this.delysService.obtenerTodosPedidos();
  }

  @Roles('adc')
  @Get('pedidos/:id')
  obtenerPedido(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.delysService.obtenerPedido(id);
  }

  @Roles('adc')
  @Delete('pedidos/:id')
  borrarPedido(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.delysService.remove(id);
  }

  /** El JwtAuthGuard ya bloquea sin token; esto solo evita el undefined si se reutiliza. */
  private usuarioActual(request: RequestConUsuario): AuthUser {
    if (!request.user) throw new BadRequestException('Petición sin usuario autenticado');

    return request.user;
  }
}
