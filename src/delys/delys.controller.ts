import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DelysService } from './delys.service.js';
import { DulceImagenService, type MulterFile } from './dulce-imagen.service.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import type { AuthUser, RequestConUsuario } from '../auth/auth.interfaces.js';
import { Public } from '../auth/public.decorator.js';
import { Roles } from '../auth/roles.decorator.js';

/** Tope de transporte: el máximo por archivo del plan Free de Supabase Storage. */
const TAMANO_MAXIMO_ARCHIVO = 50 * 1024 * 1024;

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Controller('delys')
export class DelysController {
  constructor(
    private readonly delysService: DelysService,
    private readonly imagenService: DulceImagenService,
  ) {}

  // Catálogo: público, sin token.
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

  // Pedidos: JwtAuthGuard + @Roles('delys').
  @Roles('delys')
  @Post('pedido')
  agregarPedido(@Body() createPedidoDto: CreatePedidoDto) {
    return this.delysService.crearPedido(createPedidoDto);
  }

  @Roles('delys')
  @Get('pedidos')
  obtenerPedidos() {
    return this.delysService.obtenerTodosPedidos();
  }

  @Roles('delys')
  @Get('pedidos/:id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.delysService.obtenerPedido(id);
  }

  @Roles('delys')
  @Delete('pedidos/:id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.delysService.remove(id);
  }

  /** El JwtAuthGuard ya bloquea sin token, esto solo evita el undefined si se reutiliza. */
  private usuarioActual(request: RequestConUsuario): AuthUser {
    if (!request.user) throw new BadRequestException('Petición sin usuario autenticado');

    return request.user;
  }
}
