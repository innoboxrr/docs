# Un paquete nuevo

Un paquete tiene sentido cuando una funcionalidad se va a usar en más de una aplicación, o se publica: un catálogo, una facturación, un módulo de reservas. Lleva su API y su módulo de administración dentro, y cada aplicación lo instala con Composer y npm.

`larapack:new` crea un paquete que desde el primer commit tiene la línea base de versiones, tests que correr, workflows de publicación y la guía para agentes, y pasa `larapack:audit` sin un solo hallazgo.

## Antes: de dónde sale el comando

`larapack:new` se ejecuta con el binario de LaraPack, `builder`, así que LaraPack tiene que estar instalado en algún sitio antes de que exista el paquete. Hay dos formas:

::: code-group

```bash [Desde una aplicación]
# En una aplicación que ya tiene LaraPack, por ejemplo la aplicación base
php vendor/bin/builder larapack:new acme/catalogo packages/catalogo
```

```bash [Desde un clon de LaraPack]
git clone https://github.com/innoboxrr/larapack-generator.git
cd larapack-generator
composer install
php builder larapack:new acme/catalogo ../catalogo
```

:::

El directorio se interpreta desde donde ejecutas el comando. Sin él, el paquete se crea en `./<paquete>`.

## 1. Crea el paquete

```bash
php vendor/bin/builder larapack:new acme/catalogo packages/catalogo --dry-run
php vendor/bin/builder larapack:new acme/catalogo packages/catalogo
```

`--dry-run` construye el paquete en un directorio temporal, lo borra y te dice exactamente qué crearía.

| Argumento u opción | Por omisión | Qué hace |
|---|---|---|
| `name` | — | Nombre Composer, `vendor/paquete`, en minúsculas. |
| `directory` | `./<paquete>` | Dónde crearlo. |
| `--namespace` | Sale del nombre | Namespace raíz. `acme/shop-catalog` da `Acme\ShopCatalog`. |
| `--description` | `<paquete>: paquete Laravel generado con LaraPack.` | Para `composer.json` y el README. |
| `--license` | `MIT` | Con `MIT` también escribe `LICENSE`. |
| `--dry-run` | — | Dice qué crearía sin escribir nada. |
| `--format` | `txt` | `json` para que lo lea un agente. |

`larapack:new` **no trabaja sobre un directorio que ya tenga `composer.json`** y no sobrescribe nada. Para un proyecto existente, ver [En un proyecto existente](/empezar/proyecto-existente).

::: details Lo que crea
```
composer.json
.gitignore
.gitattributes
README.md
CHANGELOG.md
VERSION                              0.1.0
AGENTS.md                            apunta a la guía de LaraPack
LICENSE
.github/workflows/tests.yml
.github/workflows/release.yml
pint.json
phpstan.neon.dist
phpunit.xml.dist
tests/TestCase.php
tests/User.php
tests/Feature/PackageBootsTest.php
src/Providers/AppServiceProvider.php
src/Providers/AuthServiceProvider.php
src/Providers/EventServiceProvider.php
src/Providers/RouteServiceProvider.php
config/acmecatalogo.php
.claude/skills/larapack/SKILL.md
```
:::

El `composer.json` sale de la línea base del ecosistema. Un extracto:

```json
{
    "name": "acme/catalogo",
    "type": "library",
    "require": {
        "php": "^8.3",
        "illuminate/support": "^13.0",
        "innoboxrr/search-surge": "^3.0",
        "innoboxrr/support": "^2.1",
        "innoboxrr/traits": "^2.1",
        "laravel/sanctum": "^4.3",
        "maatwebsite/excel": "^4.0"
    },
    "require-dev": {
        "innoboxrr/larapack-generator": "^7.10",
        "larastan/larastan": "^3.0",
        "laravel/pint": "^1.18",
        "orchestra/testbench": "^11.0",
        "phpunit/phpunit": "^12.0 || ^13.0"
    },
    "autoload": {
        "psr-4": {
            "Acme\\Catalogo\\": "src/",
            "Acme\\Catalogo\\Database\\Factories\\": "database/factories/"
        }
    }
}
```

Los cuatro proveedores quedan además en `extra.laravel.providers`, así que la aplicación que instale el paquete lo arranca sola: migraciones, vistas, configuración, rutas y eventos.

## 2. Instala sus dependencias

```bash
cd packages/catalogo
composer install
```

Desde aquí, los comandos se ejecutan con el `builder` del propio paquete: LaraPack está en su `require-dev`.

## 3. Lee el esquema y declara el dominio

```bash
php vendor/bin/builder larapack:schema
```

Primero se lee el esquema; no se adivina. Crea `laraimport.json` en la raíz del paquete:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "Product",
            "props": [
                {
                    "name": "name",
                    "type": "string",
                    "datatable": true,
                    "form": true,
                    "form_component": "TextInputComponent",
                    "form_submit": true
                }
            ]
        }
    ]
}
```

Todas las claves están en [El contrato: laraimport.json](/larapack/laraimport).

## 4. Valida y genera

::: code-group

```bash [Vue]
php vendor/bin/builder larapack:validate --vue
php vendor/bin/builder larapack:import --vue --dry-run
php vendor/bin/builder larapack:import --vue
```

```bash [React]
php vendor/bin/builder larapack:validate --react
php vendor/bin/builder larapack:import --react --dry-run
php vendor/bin/builder larapack:import --react
```

```bash [Los dos]
php vendor/bin/builder larapack:validate --vue --react
php vendor/bin/builder larapack:import --vue --react --dry-run
php vendor/bin/builder larapack:import --vue --react
```

:::

Sin ruta, `validate` e `import` leen `./laraimport.json`.

En un paquete, lo generado lleva el namespace del paquete:

| Qué | Dónde queda |
|---|---|
| Código PHP | `src/`, con `Acme\Catalogo\` |
| Rutas | `routes/api/models/product.php`, URL `api/acme/catalogo/product/...`, nombres `api.acme.catalogo.product.*` |
| Módulo Vue | `resources/vue`, con su propio `package.json`: `acme-catalogo` |
| Módulo React | `resources/react`, con su propio `package.json`: `acme-catalogo-react` |

Las diferencias con una aplicación están en [Paquete o aplicación](/conceptos/paquete-o-aplicacion).

## 5. Escribe la lógica en los huecos

La lógica de negocio va en `src/Models/Traits/Operations/`, la autorización en la política, quién ve qué en `ManagedFilter::canView`, los efectos secundarios en los listeners. Si algo no cabe en ningún hueco, falta en `laraimport.json`. Ver [Qué se genera y dónde va tu código](/larapack/que-se-genera).

## 6. Comprueba

```bash
php vendor/bin/builder larapack:verify
vendor/bin/phpunit
vendor/bin/pint --test
vendor/bin/phpstan analyse
php vendor/bin/builder larapack:audit
```

- `larapack:verify` compara el código con el contrato y el manifiesto.
- Los tests corren sobre SQLite en memoria: PHP necesita `pdo_sqlite` y `sqlite3`. Si falla con «could not find driver»:

  ```bash
  php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit
  ```

- Lo que genera LaraPack pasa `pint --test` y el nivel 5 de Larastan. Un fallo ahí es algo escrito a mano: `vendor/bin/pint` lo formatea.
- `larapack:audit` compara el paquete con la línea base del ecosistema: versiones, tests y workflows.

Versiona `.larapack/manifest.json`: sin él, el generador no distingue tu código del suyo.

## 7. Publica

1. Sube `VERSION` (semver) y describe el cambio en `CHANGELOG.md`: qué cambió, por qué y qué tiene que hacer quien actualice.
2. Empuja a `main` o `master`.
3. `tests.yml` instala, ejecuta `larapack:audit` y corre la suite. Si pasa, `release.yml` crea el tag a partir de `VERSION`, sin prefijo `v`, y Packagist publica con ese tag.

Un push con un test roto no publica nada, y un tag que ya existe no se vuelve a crear.

::: warning Dos cosas que rompen la publicación
- **Una clave `version` en `composer.json`.** Composer descarta cada tag que no coincide con ella: la versión nueva quedaría invisible. `larapack:audit` lo marca como error.
- **Quitar `permissions: contents: write` de `release.yml`.** En un repositorio con permisos de sólo lectura, el workflow no arranca y no deja log. `larapack:new` ya lo escribe.
:::

El módulo de interfaz tiene su propio `package.json` y se publica en npm aparte. Ver [Publicar una versión](/ci/publicar).

## Usarlo desde una aplicación

### Backend

```bash
composer require acme/catalogo
php artisan migrate
php artisan route:json
```

El paquete da por hecho esto de la aplicación. La [aplicación base](/empezar/app-nueva) ya lo cumple todo:

| Qué | Por qué |
|---|---|
| `laravel/sanctum` | Las rutas usan `auth:sanctum`. |
| `$middleware->statefulApi()` en `bootstrap/app.php` | La interfaz llama a la API con la cookie de sesión. Sin esto, cada petición responde 401. |
| `JsonResource::withoutWrapping()` en el `AppServiceProvider` | La tabla espera `data`, `meta` y `links` en la raíz; sin esto sale vacía. |
| `innoboxrr/routes-to-json` | El front pide cada URL por el nombre de la ruta. |
| Usuario `Notifiable` | La exportación avisa al usuario. |
| `isAdmin()` en el usuario, opcional | El `before()` de cada política deja pasar al administrador. |
| El idioma de la petición | Las acciones de cada fila y el correo de exportación salen en ese idioma. |

### Frontend

El módulo se instala como cualquier paquete npm: publicado, o con `"file:vendor/acme/catalogo/resources/vue"` mientras se desarrolla. Instalado desde una carpeta, dile a Vite que use una sola copia de cada dependencia compartida:

::: code-group

```js [Vue: vite.config.js]
resolve: { dedupe: ['vue', 'vue-router', 'pinia'] },
```

```js [React: vite.config.js]
resolve: { dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'] },
```

:::

Y se monta bajo `/admin`:

::: code-group

```js [Vue: main.js]
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'

import 'acme-catalogo/src/theme.js'
import catalogo, { routes as catalogoRoutes, translations as catalogoTranslations } from 'acme-catalogo'

import routes from './routes.json'
import App from './App.vue'
import AdminLayout from './AdminLayout.vue'

setRoutes(routes)

// Los textos del módulo primero y los de la aplicación encima.
addTranslations(catalogoTranslations)
setLocale(document.documentElement.lang)

const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/admin', component: AdminLayout, children: catalogoRoutes }],
})

createApp(App).use(createPinia()).use(router).use(catalogo).mount('#app')
```

```jsx [React: main.jsx]
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'
import { ConfirmHostComponent, ToastRegionComponent } from 'innoboxrr-react-form-elements'

import 'acme-catalogo-react/src/theme.js'
import { registerModuleRoutes, routes as catalogoRoutes, translations as catalogoTranslations } from 'acme-catalogo-react'

import routes from './routes.json'

setRoutes(routes)
// React Router no tiene rutas con nombre: el módulo registra las suyas con el
// mismo prefijo con el que se montan.
registerModuleRoutes('/admin')

addTranslations(catalogoTranslations)
setLocale(document.documentElement.lang)

function AdminLayout() {
    return (
        <>
            <Outlet />
            <ToastRegionComponent />
            <ConfirmHostComponent />
        </>
    )
}

const router = createBrowserRouter([
    { path: '/admin', element: <AdminLayout />, children: catalogoRoutes },
])

createRoot(document.getElementById('app')).render(<RouterProvider router={router} />)
```

:::

En Vue, `ToastRegionComponent` y `ConfirmHostComponent` de `innoboxrr-form-elements` se montan una vez en `App.vue`. Sin ellos no se ven los avisos y la confirmación cae en `window.confirm`.

::: tip En la aplicación base
La aplicación base carga su propio módulo, `resources/<ui>/index.js`, y no los de los paquetes. Montar el de un paquete es editar `resources/<ui>/app/`, que desde la instalación es código tuyo.
:::
