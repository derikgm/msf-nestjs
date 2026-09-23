import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ControlService } from './control.service.js';

@Controller()
export class ControlController {
  constructor(private readonly controlService: ControlService) {}

  @Get("ping")
  ping() {
    return this.controlService.ping();
  }

}
