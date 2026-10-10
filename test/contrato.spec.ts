/**
 * X-5 / N-23 · Tests de contrato de los endpoints críticos.
 *
 * No dependen de una base de datos viva: los servicios que tocan Postgres o
 * Supabase se mockean y se prueba la API real —guardas, pipes de validación,
 * multer 2 y la forma de las respuestas—, que es lo que han roto los bugs de
 * M-1/M-2/X-1.
 *
 * Contratos cubiertos:
 *   1. `POST /auth/login` con credenciales inválidas → `401` `{statusCode, mensaje}`.
 *   2. `GET /adc/productos` → `200` con las claves `productos` y `secciones`,
 *      y sin `imagen_bytes` ni `negocio` (N-15).
 *   3. `POST /adc/productos/:id/imagen` (multipart) → clave `producto` (no
 *      `dulce`); sin token → `401` antes de que multer parseé nada.
 */
import 'reflect-metadata';

import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdcController } from '../src/adc/adc.controller.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtAuthGuard } from '../src/auth/auth.guard.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import { CatalogoService } from '../src/common/services/catalogo.service.js';
import { DulceImagenService } from '../src/common/services/dulce-imagen.service.js';
import { HttpErrorFilter } from '../src/common/filters/http-error.filter.js';

const SECRETO_PRUEBA = 'clave-de-prueba-de-los-tests';

// El servicio de auth se mockea para no tocar la tabla `usuario`; el login con
// credenciales inválidas lanza lo mismo que lanza el real (ver
// `AuthService.login`, `"Usuario o contraseña incorrectos"`).
const authServiceMock = {
  login: vi.fn(async () => {
    throw new UnauthorizedException('Usuario o contraseña incorrectos');
  }),
  usuarioActivo: vi.fn(async () => true),
};

// Catálogo de ADC tal como lo devolvería la proyección (N-15): sin
// `imagen_bytes` ni `negocio`.
const catalogoServiceMock = {
  obtenerTodosDulces: vi.fn(async () => ({
    dulces: [
      {
        id: 7,
        nombre: 'Inversor 1500W',
        precio: 18500,
        moneda: 'CUP',
        imagen_url: null,
        seccion_id: 4,
        seccion: { id: 4, nombre: 'electronico' },
      },
    ],
  })),
  listarSecciones: vi.fn(async () => ({
    secciones: [{ id: 4, nombre: 'electronico' }],
  })),
};

// La subida real va a Supabase Storage; aquí el servicio devuelve el contrato
// y el test comprueba que el controlador lo traduce a `producto` y que multer
// 2 parseó el multipart.
const imagenServiceMock = {
  subir: vi.fn(async () => ({
    mensaje: 'Imagen subida correctamente',
    dulce: {
      id: 7,
      nombre: 'Inversor 1500W',
      precio: 18500,
      moneda: 'CUP',
      imagen_url: 'https://proyecto.supabase.co/storage/v1/object/public/adc/dulces/inversor.png',
      seccion_id: 4,
      seccion: { id: 4, nombre: 'electronico' },
    },
    cuota: {
      rol: 'adc',
      bytes_usados: 1024,
      limite_bytes: 20971520,
      bytes_disponibles: 20970496,
    },
  })),
};

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Contratos de la API (X-5, sin base de datos viva)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: SECRETO_PRUEBA }),
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ttl: minutes(1), limit: 300 }],
        }),
      ],
      controllers: [AuthController, AdcController],
      providers: [
        // Los mismos guardas globales y el filtro de errores de `app.module.ts`.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: HttpErrorFilter },
        { provide: AuthService, useValue: authServiceMock },
        { provide: CatalogoService, useValue: catalogoServiceMock },
        { provide: DulceImagenService, useValue: imagenServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);

    // El mismo ValidationPipe global de `server.js`.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /auth/login con credenciales inválidas responde 401 con { statusCode, mensaje }', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ usuario: 'nadie', password: 'clave-que-no-es' });

    expect(res.status).toBe(401);
    expect(res.body.statusCode).toBe(401);
    expect(typeof res.body.mensaje).toBe('string');
    expect(authServiceMock.login).toHaveBeenCalledOnce();
  });

  it('no deja pasar campos que el DTO no conoce (forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ usuario: 'nadie', password: 'clave-que-no-es', rol: 'admin' });

    expect(res.status).toBe(400);
    // El pipe de validación manda el mensaje como array: 'property rol should not exist'.
    expect(JSON.stringify(res.body.mensaje)).toContain('rol');
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('GET /adc/productos devuelve productos y secciones, sin imagen_bytes ni negocio', async () => {
    const res = await request(app.getHttpServer()).get('/adc/productos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.productos)).toBe(true);
    expect(Array.isArray(res.body.secciones)).toBe(true);

    const producto = res.body.productos[0];
    expect(producto).toMatchObject({
      id: 7,
      nombre: 'Inversor 1500W',
      precio: 18500,
      moneda: 'CUP',
      imagen_url: null,
      seccion_id: 4,
      seccion: 'electronico',
    });
    // Proyección N-15: los campos internos no viajan en la API pública.
    expect(producto.imagen_bytes).toBeUndefined();
    expect(producto.negocio).toBeUndefined();
  });

  it('POST /adc/productos/:id/imagen parsea el multipart (multer 2) y responde con la clave producto', async () => {
    const token = await jwtService.signAsync({
      sub: '11111111-1111-4111-8111-111111111111',
      usuario: 'jefa',
      rol: 'adc',
    });

    const res = await request(app.getHttpServer())
      .post('/adc/productos/7/imagen')
      .set('Authorization', `Bearer ${token}`)
      .attach('imagen', PNG_1X1, { filename: 'inversor.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    // El contrato del panel de ADC: la clave es `producto`, nunca `dulce`.
    expect(res.body.producto).toBeDefined();
    expect(res.body.dulce).toBeUndefined();
    expect(res.body.mensaje).toBe('Imagen subida correctamente');

    // Multer 2 parseó el archivo y se lo pasó al servicio con su mimetype.
    expect(imagenServiceMock.subir).toHaveBeenCalledOnce();
    const [id, file] = imagenServiceMock.subir.mock.calls[0];
    expect(id).toBe(7);
    expect(file.mimetype).toBe('image/png');
  });

  it('POST /adc/productos/:id/imagen sin token responde 401 antes de que multer mire el archivo', async () => {
    // Archivo de un tipo no permitido a propósito: si el guard corre antes que
    // el interceptor de multer, sale 401 y nunca un 400 por tipo.
    //
    // Se manda el body crudo con su boundary a mano: con `.attach()` el cliente
    // escribe el stream cuando el server ya respondió 401 y cierra, y supertest
    // aborta con "Aborted" en vez de recibir la respuesta.
    const body =
      '------msf\r\n' +
      'Content-Disposition: form-data; name="imagen"; filename="falso.txt"\r\n' +
      'Content-Type: text/plain\r\n\r\n' +
      'no es una imagen\r\n' +
      '------msf--\r\n';

    const res = await request(app.getHttpServer())
      .post('/adc/productos/7/imagen')
      .set('Content-Type', 'multipart/form-data; boundary=----msf')
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.statusCode).toBe(401);
    expect(imagenServiceMock.subir).not.toHaveBeenCalled();
  });
});