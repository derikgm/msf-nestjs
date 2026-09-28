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

## Deploying to Wasmer (Overview)

1. Install dependencies and confirm the app starts locally.
2. Deploy from this example directory with `wasmer deploy`.
3. Visit `https://<your-subdomain>.wasmer.app/` once the deployment is live.
