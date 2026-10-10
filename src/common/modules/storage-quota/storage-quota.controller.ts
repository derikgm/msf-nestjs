import { Controller, Get, Req } from '@nestjs/common';
import { StorageQuotaService } from '../../services/storage-quota.service.js';
import type { RequestConUsuario } from '../../../auth/auth.interfaces.js';
import { usuarioActual } from '../../utils/auth.util.js';

@Controller('storage')
export class StorageQuotaController {
  constructor(private readonly quotaService: StorageQuotaService) {}

  /** Cuota del proyecto al que pertenece el usuario: la comparten todos los de su rol. */
  @Get('quota')
  getQuota(@Req() request: RequestConUsuario) {
    return this.quotaService.getResumen(usuarioActual(request).rol);
  }
}