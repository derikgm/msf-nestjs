import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { RequestConUsuario } from './auth.interfaces.js';
import { Public } from './public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Alta inicial: mientras el rol no tenga ningún usuario cualquiera puede crear el
   * primero. Si ya existe, hace falta token y se exige el mismo rol.
   */
  @Public()
  @Post('registro')
  crearPrimerUsuario(@Body() dto: CreateUsuarioDto, @Req() request: RequestConUsuario) {
    return this.authService.register(dto, request.user);
  }

  /** Alta desde dentro: crea un usuario del mismo rol que quien hace la petición. */
  @Post('usuarios')
  crearUsuario(@Body() dto: CreateUsuarioDto, @Req() request: RequestConUsuario) {
    return this.authService.crearUsuario(dto, this.usuarioActual(request));
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

  /** El JwtAuthGuard ya bloquea las peticiones sin token, esto es solo un seguro. */
  private usuarioActual(request: RequestConUsuario) {
    if (!request.user) throw new UnauthorizedException();

    return request.user;
  }
}
