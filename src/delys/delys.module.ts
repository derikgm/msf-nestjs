import { Module } from '@nestjs/common';
import { DelysService } from './delys.service.js';
import { DelysController } from './delys.controller.js';

@Module({
  controllers: [DelysController],
  providers: [DelysService],
})
export class DelysModule {}
