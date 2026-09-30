import { Controller, Get } from '@nestjs/common';
import { ControlService } from './control.service.js';
import { Public } from '../auth/public.decorator.js';

@Controller()
export class ControlController {
  constructor(private readonly controlService: ControlService) {}

  @Public()
  @Get('ping')
  ping() {
    return this.controlService.ping();
  }
}
