# Frontends

Aquí se clonan los clientes de esta API: **Delys**, **Domus** y los que falten.

## La regla

> **Cada frontend es su propio repositorio de git. Nada de lo que hay dentro de esta carpeta se sube a `msf-nestjs`.**

El código de un frontend, su historial, sus ramas y su despliegue viven en su propio repo (por ejemplo `derikgm/Delys`). Esta carpeta es solo el lugar donde se trabaja: un punto de encuentro para tener la API y sus consumidores a la vista al mismo tiempo.

Esto **no es un monorepo**. Es un directorio de trabajo con repositorios independientes dentro. La diferencia importa, porque git no mezcla repositorios: si se intentara versionar un repo desde otro, git no guardaría los archivos sino una referencia al commit del repo interno, y al clonar `msf-nestjs` la carpeta llegaría vacía.

### Por qué está en `.gitignore` con una excepción

```gitignore
frontends/**
!frontends/README.md
```

La `!` (negación) es necesaria y no es un capricho. Si la regla fuera `frontends/`, git excluiría el directorio completo, y **no se puede re-incluir un archivo si su directorio padre está excluido**: el README tampoco se versionaría. Por eso se ignora el contenido con `frontends/**` y se abre una sola excepción para este archivo.

Efecto: `git status` nunca muestra el código de los frontends, pero `frontends/` sigue siendo visible en el explorador y este README viaja con el repo para que la convención se entienda en cualquier máquina.

Cada frontend se autoexcluye. Su `node_modules/`, `dist/` y `.angular/` no necesitan regla propia: `frontends/**` ya los cubre, y su `.gitignore` interno refuerza lo mismo dentro de su repo.

## Cómo clonar un frontend

```bash
cd frontends
git clone <url> <nombre>
cd <nombre>
git checkout <rama-de-trabajo>
npm ci
```

Delys usa su rama `develop_complex`, que es la que se está desarrollando y probando contra esta API.

## Qué hay aquí ahora

| Carpeta | Estado | Repo |
| --- | --- | --- |
| `delys/` | clonado, en `develop_complex` | `derikgm/Delys` |
| `domus/` | carpeta vacía, lista para el proyecto | — |

## Sobre `domus/`

Está creada y vacía, esperando a que el proyecto exista. En un clon nuevo de `msf-nestjs` no aparecerá (git no guarda carpetas vacías): se crea con un solo comando al clonar el repo, que es justo lo que la convención pide.

Cuando exista, dos cosas a tener presentes:

- **Comparte la API, no el código.** Tendrá su propio cliente HTTP con la URL base. El de Delys está en `frontends/delys/src/app/datos/api.ts`.
- **Aislamiento por rol.** `RolesGuard` (`Decisiones.md`, punto 1.3) deja a un usuario `delys` fuera de las rutas `@Roles('domus')` y viceversa, y `storage_quota` lleva la cuota por rol, así que las imágenes de Domus no consumen la de Delys.

Pendiente por decidir: las rutas de pedidos e imágenes de `DelysController` están marcadas `@Roles('delys')`, así que un token `domus` las recibe con `403`. Si Domus necesita catálogo y pedidos propios, habrá que decidir si se replica el módulo o se generaliza el de Delys.

## Ventaja para trabajar con IA

Tener la API y sus consumidores en el mismo lugar permite levantar el backend y probar de verdad el payload que genera cada frontend, en lugar de asumir el contrato. De momento el contrato se verifica probando a mano: **no hay todavía una prueba automatizada** que replique exactamente el body que envía Delys a `POST /delys/pedido` (pendiente X-5/N-23). Conviene añadirla y repetirla cuando se toque cualquiera de los dos lados.
