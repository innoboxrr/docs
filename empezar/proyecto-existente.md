# En un proyecto existente

LaraPack no necesita un proyecto recién creado. Genera igual en un paquete que ya existe y en una aplicación Laravel 13 que ya está en marcha. Lo que cambia es dónde escribe y qué tienes que conectar tú, y lo decide el `type` del `composer.json`:

| `type` en `composer.json` | Modo | Escribe en |
|---|---|---|
| `library`, o sin `type` | Paquete | `src/`, con el namespace del paquete |
| Cualquier otro, normalmente `project` | Aplicación | `app/`, con `App\` |

Las diferencias completas están en [Paquete o aplicación](/conceptos/paquete-o-aplicacion).

::: tip ¿Una aplicación recién creada?
Si la aplicación todavía es la de `laravel new`, no sigas esta página: [la aplicación base](/empezar/app-nueva) hace todo esto y además monta el sitio, el acceso y el administrador.
:::

## En un paquete existente

### 1. Comprueba el `composer.json`

- `type` es `library`, o no está.
- `autoload.psr-4` tiene un namespace que apunta a `src/`. De ahí saca LaraPack el namespace, y con él los nombres de las rutas: `Acme\Catalogo\` da `api.acme.catalogo.<modelo>.*`.
- No hay clave `version`. Si la hay, quítala: Composer descarta cada tag que no coincide con ella.

### 2. Instala LaraPack y lo que usa el código generado

```bash
composer require --dev innoboxrr/larapack-generator
composer require innoboxrr/search-surge:^3.0 innoboxrr/support:^2.1 innoboxrr/traits:^2.1 laravel/sanctum:^4.3 maatwebsite/excel:^4.0
```

LaraPack va en `require-dev`: es el generador. El código que genera usa `traits` (modelos y metas), `search-surge` (índices y filtros), `support` (el guardado de metas), Sanctum (`auth:sanctum` en las rutas) y Excel (la exportación), y eso sí va en `require`.

### 3. Proveedores y configuración, una vez

```bash
php vendor/bin/builder larapack:providers
php vendor/bin/builder larapack:config
```

`larapack:providers` crea los proveedores App, Auth, Event y Route y los declara en `extra.laravel.providers`, para que la aplicación que instale el paquete los descubra sola. `larapack:config` crea el archivo de configuración del paquete. El importador no los genera: sin ellos no se cargan ni las rutas ni los eventos.

### 4. Declara, valida y genera

```bash
php vendor/bin/builder larapack:schema
# escribe laraimport.json
php vendor/bin/builder larapack:validate --vue
php vendor/bin/builder larapack:import --vue --dry-run
php vendor/bin/builder larapack:import --vue
```

Cambia `--vue` por `--react`, o usa los dos. El módulo de interfaz queda en `resources/vue` o `resources/react`, con su propio `package.json`.

::: warning Si ya tienes archivos con esos nombres
LaraPack no sobrescribe lo que no escribió él: un archivo que existe se omite, y con `--force` un archivo que el manifiesto no conoce se respeta igual. Mira siempre la salida de `--dry-run` antes de generar sobre código que ya existe.

Si el paquete se generó con LaraPack 5.x, antes del manifiesto, sigue la [Guía de actualización](/larapack/actualizar).
:::

### 5. Alinea el paquete con la línea base

```bash
php vendor/bin/builder larapack:audit
```

`larapack:audit` compara el paquete con las versiones que rigen a todo el ecosistema y con lo que necesita para publicarse: tests de verdad, `tests.yml`, `release.yml`. Cada hallazgo dice qué corregir.

Para tener los workflows, `VERSION`, `pint.json` y `phpstan.neon.dist` iguales que un paquete nuevo, genera uno de referencia **fuera** de tu paquete y copia lo que te falte:

```bash
php vendor/bin/builder larapack:new acme/referencia ../referencia
```

`--dry-run` no sirve para esto: construye el paquete en un directorio temporal y lo borra.

## En una aplicación existente

Una aplicación Laravel 13 en marcha, sin la aplicación base. LaraPack genera la API y el módulo de interfaz; conectar la interfaz a tu aplicación es trabajo tuyo.

### 1. Lo que la aplicación tiene que tener

| Qué | Cómo | Por qué |
|---|---|---|
| Sanctum | `php artisan install:api`, y compruébalo con `composer show laravel/sanctum` | Las rutas generadas usan `auth:sanctum`. `install:api` usa el `composer` del PATH y, si falla, no lo dice. |
| Sesión en la API | `$middleware->statefulApi()` en `bootstrap/app.php` | La interfaz llama a la API con la cookie de sesión. Sin esto, cada petición responde 401. |
| Respuestas sin envoltorio | `JsonResource::withoutWrapping()` en `AppServiceProvider::boot()` | La tabla espera `data`, `meta` y `links` en la raíz. Sin esto sale vacía. |
| Rutas por nombre | `innoboxrr/routes-to-json` | El front pide cada URL por nombre. |
| Usuario `Notifiable` | El `User` de Laravel ya lo es | La exportación avisa al usuario. |
| `isAdmin()` en el usuario | Opcional | El `before()` de cada política deja pasar al administrador. Sin el método, nadie lo es. |

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})

// app/Providers/AppServiceProvider.php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

Si quieres el mismo criterio que la aplicación base, un administrador es quien tiene su correo en `ADMIN_EMAILS`:

```php
// config/auth.php
'admins' => array_values(array_filter(array_map('trim', explode(',', (string) env('ADMIN_EMAILS', ''))))),

// app/Models/User.php
public function isAdmin(): bool
{
    $admins = array_map('strtolower', (array) config('auth.admins', []));

    return in_array(strtolower((string) $this->email), $admins, true);
}
```

### 2. Instala LaraPack y sus dependencias

```bash
composer require --dev innoboxrr/larapack-generator
composer require innoboxrr/search-surge:^3.0 innoboxrr/support:^2.1 innoboxrr/traits:^2.1 innoboxrr/routes-to-json:^2.1 maatwebsite/excel:^4.0
```

### 3. Declara, valida y genera

Crea `laraimport.json` en la raíz de la aplicación y genera:

::: code-group

```bash [Vue]
php artisan larapack:validate laraimport.json --vue
php artisan larapack:import laraimport.json --vue --dry-run
php artisan larapack:import laraimport.json --vue
```

```bash [React]
php artisan larapack:validate laraimport.json --react
php artisan larapack:import laraimport.json --react --dry-run
php artisan larapack:import laraimport.json --react
```

:::

En una aplicación:

- El código va a `app/`. La API de `OrderLine` queda en `routes/api/models/order_line.php`, con la URL `api/app/order_line/...` y los nombres `api.app.order_line.*`.
- Las factories van a `Database\Factories` y los tests a `Tests\Feature\Models`. Los tests extienden tu `tests/TestCase.php` e inician sesión con la factory del modelo de `auth.providers.users.model`.
- Si una tabla ya tiene una migración de creación que LaraPack no escribió, como la `users` de Laravel, `larapack:import` la omite y no escribe alteraciones contra ella. Si esa tabla necesita más columnas, escribe tú la migración.

### 4. Crea y registra los proveedores

```bash
php artisan larapack:route-service-provider
php artisan larapack:event-service-provider
```

**Regístralos en `bootstrap/providers.php`.** Laravel no descubre proveedores en el `composer.json` de una aplicación:

```php
// bootstrap/providers.php
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\EventServiceProvider::class,
    App\Providers\RouteServiceProvider::class,
];
```

Sin el `RouteServiceProvider` no existe ninguna ruta generada. Sin el `EventServiceProvider`, una exportación nunca avisa a quien la pidió.

### 5. Migra y exporta las rutas

Dile a `routes-to-json` dónde escribir. Una ruta relativa se resuelve desde la raíz del proyecto:

```dotenv
JSON_ROUTES_FILE=resources/vue/routes.json
```

```bash
php artisan migrate
php artisan route:json
```

Cada vez que añadas un endpoint, vuelve a ejecutar `route:json`.

La exportación funciona sin configurar nada: guarda en el disco `local` y avisa por correo. Para cambiarlo, `php artisan larapack:config` crea `config/larapack.php` con `notification_via`, `export_disk` y `excel_view`. Nunca escribe en `config/app.php`.

### 6. Conecta la interfaz

En una aplicación el módulo **no tiene `package.json` ni `vite.config.js`**: lo compila el Vite de tu aplicación, así que tu `package.json` tiene que declarar lo que el módulo usa.

::: code-group

```bash [Vue]
npm install axios vue vue-router@4 pinia@3 innoboxrr-form-core innoboxrr-form-elements innoboxrr-vue-datatable innoboxrr-http-request innoboxrr-i18n innoboxrr-js-validator innoboxrr-route-resolver
npm install --save-dev vite@8 @vitejs/plugin-vue@6 laravel-vite-plugin
```

```bash [React]
npm install axios react react-dom react-router-dom@7 zustand@5 innoboxrr-form-core innoboxrr-react-form-elements innoboxrr-react-datatable innoboxrr-http-request innoboxrr-i18n innoboxrr-js-validator innoboxrr-route-resolver
npm install --save-dev vite@8 @vitejs/plugin-react@6 laravel-vite-plugin
```

:::

Después, en la entrada de tu interfaz: configura axios para la sesión, carga las rutas y los textos, y monta las rutas del módulo bajo `/admin`. Estos ejemplos suponen que la entrada está en `resources/js/`:

::: code-group

```js [Vue: resources/js/app.js]
import axios from 'axios'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'

import '../vue/src/theme.js'
import adminModule, { routes as moduleRoutes, translations } from '../vue/index.js'
import routes from '../vue/routes.json'

import App from './App.vue'
import AdminLayout from './AdminLayout.vue'

// La API se llama con la cookie de sesión de Sanctum.
axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true
axios.defaults.headers.common.Accept = 'application/json'

setRoutes(routes)
addTranslations(translations)
setLocale(document.documentElement.lang)

const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/admin', component: AdminLayout, children: moduleRoutes }],
})

// Las rutas del módulo declaran `meta.auth`; qué hacer sin sesión lo decide la aplicación.
// isLoggedIn() es tu forma de saberlo.
router.beforeEach((to) => (to.matched.some((record) => record.meta.auth) && ! isLoggedIn() ? '/login' : true))

createApp(App).use(createPinia()).use(router).use(adminModule).mount('#app')
```

```jsx [React: resources/js/app.jsx]
import axios from 'axios'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'
import { ConfirmHostComponent, ToastRegionComponent } from 'innoboxrr-react-form-elements'
import 'innoboxrr-react-form-elements/src/css/form-elements.css'

import '../react/src/theme.js'
import { registerModuleRoutes, routes as moduleRoutes, translations } from '../react/index.js'
import routes from '../react/routes.json'

axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true
axios.defaults.headers.common.Accept = 'application/json'

setRoutes(routes)
// El mismo prefijo con el que se montan: la tabla construye sus enlaces por nombre.
registerModuleRoutes('/admin')

addTranslations(translations)
setLocale(document.documentElement.lang)

function AdminLayout() {
    // Las rutas del módulo declaran `handle.auth`; qué hacer sin sesión lo decide la aplicación.
    return (
        <>
            <Outlet />
            <ToastRegionComponent />
            <ConfirmHostComponent />
        </>
    )
}

const router = createBrowserRouter([
    { path: '/admin', element: <AdminLayout />, children: moduleRoutes },
])

createRoot(document.getElementById('app')).render(<RouterProvider router={router} />)
```

:::

En Vue, monta `ToastRegionComponent` y `ConfirmHostComponent` de `innoboxrr-form-elements` una vez en `App.vue`, junto al `<RouterView />`.

Laravel tiene que servir la vista de la SPA en cualquier ruta de `/admin`. La vista lleva el idioma de la aplicación en el atributo `lang` de `<html>` (lo lee `setLocale`), un `<div id="app">` y la directiva `@vite` de tu entrada:

```php
// routes/web.php
Route::view('/admin/{any?}', 'admin')->where('any', '.*')->middleware('auth');
```

```blade
{{-- resources/views/admin.blade.php --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @vite('resources/js/app.js')
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

::: tip Tu login sirve
Si la aplicación ya inicia sesión con su propio login web, en el mismo dominio, la interfaz usa esa misma cookie de sesión. Si el login lo hace la SPA, antes del POST de login pide `GET /sanctum/csrf-cookie`.
:::

::: warning APP_URL
La dirección con la que abres la aplicación tiene que estar en `SANCTUM_STATEFUL_DOMAINS`, que por omisión incluye el host y el puerto de `APP_URL`. Si no, la sesión funciona en las páginas pero la API responde 401. Ver [Requisitos](/empezar/requisitos#app-url-sanctum-y-las-cookies).
:::

### 7. Comprueba

```bash
php artisan larapack:verify
php artisan test
```

Versiona `laraimport.json` y `.larapack/manifest.json` junto con lo generado.

## Ampliar lo que ya usa LaraPack

Si el proyecto ya genera con LaraPack, añadir un modelo, una columna o una regla es el flujo normal: editar `laraimport.json`, `validate`, `import --dry-run`, `import --force` y revisar lo que el importador dice que conservó. Ver [Regenerar sin destruir](/larapack/regenerar).
