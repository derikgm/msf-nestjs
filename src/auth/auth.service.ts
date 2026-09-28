import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity.js';
import { verifyPassword } from './password.util.js';
import { AuthUser } from './auth.interfaces.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  /** Busca al usuario por nombre de usuario y verifica la contraseña. */
  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepository.findOne({
      where: { usuario: dto.usuario.toLowerCase() },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!verifyPassword(dto.password, usuario.password_hash)) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return {
      access_token: await this.jwtService.signAsync({
        sub: usuario.id,
        usuario: usuario.usuario,
        rol: usuario.rol,
      }),
      token_type: 'Bearer',
      expires_in: 8 * 60 * 60,
    };
  }
}
