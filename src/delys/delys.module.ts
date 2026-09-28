import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DelysService } from './delys.service.js';
import { DelysController } from './delys.controller.js';
import { entities } from './entities/index.js';

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  controllers: [DelysController],
  providers: [DelysService],
})
export class DelysModule {}
