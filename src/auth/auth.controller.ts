import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { minutes, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { ROL_SUPERUSUARIO } from './entities/index.js';
import type { RequestConUsuario } from './auth.interfaces.js';
import { Public } from './public.decorator.js';
import { Roles } from './roles.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** N-5 · intentos de acceso: 10 por minuto e IP, que un adivinador de contraseñas no pueda probar a machete. */
  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Alta inicial: mientras el rol no tenga ningún usuario cualquiera puede crear el
   * primero. Si ya existe, hace falta token y se exige el mismo rol.
   *
   * N-5 · también acotada: sin cuenta que validar, es la otra puerta abierta.
   */
  @Public()
  @Post('registro')
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  crearPrimerUsuario(@Body() dto: CreateUsuarioDto, @Req() request: RequestConUsuario) {
    return this.authService.register(dto, request.user);
  }

  /** Alta desde dentro: crea un usuario del mismo rol que quien hace la petición. */
  @Post('usuarios')
  crearUsuario(@Body() dto: CreateUsuarioDto, @Req() request: RequestConUsuario) {
    return this.authService.crearUsuario(dto, this.usuarioActual(request));
  }

  /**
   * Alta de plataforma: solo `admin`. Aquí `rol` sale del cuerpo, no del token:
   * es la única forma de ubicar a un usuario en un proyecto distinto del propio.
   */
  @Roles(ROL_SUPERUSUARIO)
  @Post('admin/usuarios')
  crearUsuarioAdmin(@Body() dto: CreateUsuarioAdminDto, @Req() request: RequestConUsuario) {
    return this.authService.crearUsuarioAdmin(dto, this.usuarioActual(request));
  }

  @Post('cambiar-password')
  @HttpCode(200)
  changePassword(@Body() dto: ChangePasswordDto, @Req() request: RequestConUsuario) {
    return this.authService.changePassword(this.usuarioActual(request), dto);
  }

  @Get('yo')
  yo(@Req() request: RequestConUsuario) {
    return this.usuarioActual(request);
  }

  /** Listar todos los usuarios. Solo admin. */
  @Roles(ROL_SUPERUSUARIO)
  @Get('usuarios')
  listarUsuarios() {
    return this.authService.listarUsuarios();
  }

  /** Actualizar rol y/o estado activo de un usuario. Solo admin. */
  @Roles(ROL_SUPERUSUARIO)
  @Patch('usuarios/:id')
  actualizarUsuario(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUsuarioDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.authService.actualizarUsuario(id, dto, this.usuarioActual(request));
  }

  /** Eliminar un usuario. Solo admin. */
  @Roles(ROL_SUPERUSUARIO)
  @Delete('usuarios/:id')
  eliminarUsuario(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: RequestConUsuario,
  ) {
    return this.authService.eliminarUsuario(id, this.usuarioActual(request));
  }

  /** El JwtAuthGuard ya bloquea las peticiones sin token, esto es solo un seguro. */
  private usuarioActual(request: RequestConUsuario) {
    if (!request.user) throw new UnauthorizedException();

    return request.user;
  }
}
