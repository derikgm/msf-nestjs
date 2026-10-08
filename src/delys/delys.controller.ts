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
import { minutes, SkipThrottle, Throttle } from '@nestjs/throttler';
import { interceptorDeImagen } from '../common/uploads/imagen.archivo.js';
import { usuarioActual } from '../common/utils/auth.util.js';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import type { RequestConUsuario } from '../auth/auth.interfaces.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('delys')
export class DelysController {
  constructor(
    private readonly catalogo: CatalogoService,
    private readonly imagenService: DulceImagenService,
  ) {}

  // Catálogo: público, sin token. Los GET públicos están fuera del rate limit
  // (N-5): la vitrina recorre catálogo, secciones e imágenes en cada visita y un
  // 429 se vería como un fallo de la web, no como un abuso.
  @Public()
  @SkipThrottle()
  @Get('dulces')
  obtenerDulces() {
    return this.catalogo.obtenerTodosDulces();
  }

  @Public()
  @SkipThrottle()
  @Get('ofertas')
  obtenerOfertas() {
    return this.catalogo.obtenerOfertas();
  }

  // Secciones de la pastelería: lectura pública para la vitrina y alta desde el
  // panel. Aquí la sección "dulces" sí aparece: es donde vive todo el catálogo
  // de Delys (los productos viejos se migran ahí), así que esconderla rompería
  // la vitrina. En ADC se hace al revés (ver `AdcController`).
  @Public()
  @SkipThrottle()
  @Get('secciones')
  obtenerSecciones() {
    return this.catalogo.listarSecciones();
  }

  @Roles('delys')
  @Post('secciones')
  crearSeccion(@Body() createSeccionDto: CreateSeccionDto) {
    return this.catalogo.crearSeccion(createSeccionDto.nombre);
  }

  // Gestión del catálogo desde el panel de la pastelería. Estas tres rutas son
  // la contrapartida de que `POST /delys/pedido` ya no escriba el catálogo: el
  // pedido no lo toca, pero quien administra la vitrina sí puede.
  // El id del dulce lo asigna el servidor; ver `CatalogoService.crearDulce()`.
  @Roles('delys')
  @Post('dulces')
  crearDulce(@Body() createDulceDto: CreateDulceDto) {
    return this.catalogo.crearDulce(createDulceDto);
  }

  @Roles('delys')
  @Patch('dulces/:id')
  actualizarDulce(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() updateDulceDto: UpdateDulceDto,
  ) {
    return this.catalogo.actualizarDulce(id, updateDulceDto);
  }

  @Roles('delys')
  @Delete('dulces/:id')
  eliminarDulce(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.catalogo.eliminarDulce(id, usuarioActual(request));
  }

  // Imágenes: multipart/form-data con el archivo en el campo "imagen".
  // La cuota es la del rol del token, no la que mande el cliente.
  // Sin `storage`, multer usa memoryStorage: el binario llega en file.buffer
  // y no se toca el disco del servidor.
  @Roles('delys')
  @Post('dulces/:id/imagen')
  @UseInterceptors(interceptorDeImagen('imagen'))
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

    return this.imagenService.subir(id, file, usuarioActual(request));
  }

  @Roles('delys')
  @Delete('dulces/:id/imagen')
  eliminarImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.imagenService.eliminar(id, usuarioActual(request));
  }

  // Alta de pedidos: pública. El cliente de la pastelería no tiene cuenta, así que
  // no puede llevar token; el resto de rutas de pedidos sí lo exigen, porque esas
  // son las del panel (ver, borrar). N-5: acotada a 10 por minuto e IP.
  @Public()
  @Post('pedido')
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.catalogo.crearPedido(createPedidoDto);
  }

  @Roles('delys')
  @Get('pedidos')
  obtenerPedidos() {
    return this.catalogo.obtenerTodosPedidos();
  }

  @Roles('delys')
  @Get('pedidos/:id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.obtenerPedido(id);
  }

  @Roles('delys')
  @Delete('pedidos/:id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogo.remove(id);
  }
}
