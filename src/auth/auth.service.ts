import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import { verifyPassword } from './password.util.js';
import { requireEnv } from '../common/utils/env.util.js';
import { parseDurationToSeconds } from '../common/utils/duration.util.js';

const USUARIO = 'admin';

@Injectable()
export class AuthService {
  private readonly passwordHash: string;
  private readonly expiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.passwordHash = requireEnv(config, 'AUTH_PASSWORD_HASH');
    this.expiresIn = parseDurationToSeconds(
      config.get<string>('AUTH_JWT_EXPIRES_IN') ?? '8h',
    );
  }

  /** Valida la contraseña y devuelve un token para las rutas protegidas. */
  async login(dto: LoginDto) {
    if (!verifyPassword(dto.password, this.passwordHash)) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return {
      access_token: await this.jwtService.signAsync({ sub: USUARIO }),
      token_type: 'Bearer',
      expires_in: this.expiresIn,
    };
  }
}
