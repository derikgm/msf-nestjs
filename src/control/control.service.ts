import { Injectable } from '@nestjs/common';

@Injectable()
export class ControlService {
  ping() {
    return { ok: true };
  }
}