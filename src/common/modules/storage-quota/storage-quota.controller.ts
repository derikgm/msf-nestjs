import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { StorageQuotaService } from '../../services/storage-quota.service.js';
import type { AuthUser, RequestConUsuario } from '../../../auth/auth.interfaces.js';

@Controller('storage')
export class StorageQuotaController {
  constructor(private readonly quotaService: StorageQuotaService) {}

  /** Cuota del proyecto al que pertenece el usuario: la comparten todos los de su rol. */
  @Get('quota')
  getQuota(@Req() request: RequestConUsuario) {
    return this.quotaService.getResumen(this.usuarioActual(request).rol);
  }

  private usuarioActual(request: RequestConUsuario): AuthUser {
    if (!request.user) throw new UnauthorizedException();

    return request.user;
  }
}
