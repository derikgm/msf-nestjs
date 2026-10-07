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
import { minutes, Throttle } from '@nestjs/throttler';
import { CatalogoService } from '../common/services/catalogo.service.js';
import { DulceImagenService, type MulterFile } from '../common/services/dulce-imagen.service.js';
import { CreatePedidoDto } from '../common/dto/create-pedido.dto.js';
import { CreateDulceDto } from '../common/dto/create-dulce.dto.js';
import { CreateSeccionDto } from '../common/dto/create-seccion.dto.js';
import { UpdateDulceDto } from '../common/dto/update-dulce.dto.js';
import type { AuthUser, RequestConUsuario } from '../auth/auth.interfaces.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';

/** Tope de transporte: el máximo por archivo del plan Free de Supabase Storage. */
const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('delys')
export class DelysController {
  constructor(
    private readonly catalogo: CatalogoService,
    private readonly imagenService: DulceImagenService,
  ) {}

  // Catálogo: público, sin token.
  @Public()
  @Get('dulces')
  obtenerDulces() {
    return this.catalogo.obtenerTodosDulces();
  }

  @Public()
  @Get('ofertas')
  obtenerOfertas() {
    return this.catalogo.obtenerOfertas();
  }

  // Secciones de la pastelería: lectura pública para la vitrina y alta desde el
  // panel. Aquí la sección "dulces" sí aparece: es donde vive todo el catálogo
  // de Delys (los productos viejos se migran ahí), así que esconderla rompería
  // la vitrina. En ADC se hace al revés (ver `AdcController`).
  @Public()
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
    return this.catalogo.eliminarDulce(id, this.usuarioActual(request));
  }

  // Imágenes: multipart/form-data con el archivo en el campo "imagen".
  // La cuota es la del rol del token, no la que mande el cliente.
  // Sin `storage`, multer usa memoryStorage: el binario llega en file.buffer
  // y no se toca el disco del servidor.
  @Roles('delys')
  @Post('dulces/:id/imagen')
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

  @Roles('delys')
  @Delete('dulces/:id/imagen')
  eliminarImagen(
    @Param('id', new ParseIntPipe()) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.imagenService.eliminar(id, this.usuarioActual(request));
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

  /** El JwtAuthGuard ya bloquea sin token, esto solo evita el undefined si se reutiliza. */
  private usuarioActual(request: RequestConUsuario): AuthUser {
    if (!request.user) throw new BadRequestException('Petición sin usuario autenticado');

    return request.user;
  }
}
