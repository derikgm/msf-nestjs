import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Usuario } from './entities/index.js';
import { requireEnv } from '../common/utils/env.util.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: requireEnv(config, 'AUTH_JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Global: todo endpoint exige token salvo los marcados con @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Se activa con @Roles(); sin el decorador solo manda el JwtAuthGuard
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
