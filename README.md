# NestJS + Wasmer

This example shows how to run **NestJS** on **Wasmer Edge** as an HTTP server.

## Demo

`https://<your-subdomain>.wasmer.app/` (deploy to get a live URL)

## How it Works

* `server.js` exposes a small Node HTTP endpoint for the runtime example.
* `package.json` includes NestJS core, platform, and RxJS dependencies.
* Wasmer Edge runs the Node.js process and forwards HTTP traffic to the configured port.

## Running Locally

```bash
npm install
npm run build   # compila src/ a dist/ (server.js carga dist/app.module.js)
npm start
```

Open `http://127.0.0.1:3000/ping` to hit the server locally. Set `PORT=...` if you want to use a different port.

`npm run dev` compila y arranca en un solo paso. La conexión a Postgres sale de `DATABASE_URL` (`.env`) y TypeORM sincroniza el esquema de `src/delys/entities` al arrancar.

## Autenticación

Todo endpoint exige un token **salvo los marcados con `@Public()`** (`src/auth/public.decorator.ts`): el `JwtAuthGuard` está registrado como `APP_GUARD`, así que si agregas una ruta nueva nace protegida y solo hay que abrirla a propósito.

| Ruta | Token |
| --- | --- |
| `GET /ping`, `GET /delys/dulces`, `GET /delys/ofertas`, `POST /auth/login` | no |
| `POST /delys/pedido`, `GET /delys/pedidos`, `GET /delys/:id`, `DELETE /delys/:id` | sí |

Variables de entorno (`.env`):

| Variable | Para qué sirve |
| --- | --- |
| `AUTH_JWT_SECRET` | Firma de los tokens. Genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `AUTH_PASSWORD_HASH` | Hash de la contraseña (nunca la contraseña en claro) |
| `AUTH_JWT_EXPIRES_IN` | Vigencia del token: `30m`, `8h`, `7d` |

Si falta `AUTH_JWT_SECRET` o `AUTH_PASSWORD_HASH` la app **no arranca**: es preferible fallar al inicio que devolver 500 en la primera petición.

Para cambiar la contraseña:

```bash
npm run hash-password -- "mi contraseña nueva"   # imprime el hash
# pégalo en AUTH_PASSWORD_HASH dentro de .env y reinicia
```

Uso:

```bash
# 1. Obtener token
curl -X POST localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d '{"password":"mi contraseña"}'
# -> { "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 28800 }

# 2. Usarlo en las rutas protegidas
curl localhost:3000/delys/pedidos -H 'Authorization: Bearer eyJ...'
```

La contraseña se compara con `scrypt` + `timingSafeEqual` (`src/auth/password.util.ts`), sin dependencias nativas. En Wasmer **no subas `.env`**: define `DATABASE_URL`, `AUTH_JWT_SECRET`, `AUTH_PASSWORD_HASH` y `AUTH_JWT_EXPIRES_IN` como variables de entorno del despliegue.

Pendiente para producción: limitar intentos de login (`@nestjs/throttler`) y registrar los accesos en un log de auditoría.

## Deploying to Wasmer (Overview)

1. Install dependencies and confirm the app starts locally.
2. Deploy from this example directory with `wasmer deploy`.
3. Visit `https://<your-subdomain>.wasmer.app/` once the deployment is live.
