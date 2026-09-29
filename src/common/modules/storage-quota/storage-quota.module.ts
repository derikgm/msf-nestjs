import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageQuota } from '../../entities/storage-quota.entity.js';
import { StorageQuotaService } from '../../services/storage-quota.service.js';
import { StorageQuotaController } from './storage-quota.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([StorageQuota])],
  controllers: [StorageQuotaController],
  providers: [StorageQuotaService],
  exports: [StorageQuotaService],
})
export class StorageQuotaModule {}
