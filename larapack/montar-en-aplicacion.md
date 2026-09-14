# Montar un paquete en una aplicación

Un paquete generado con LaraPack trae dos cosas: su API, que se instala con Composer, y su módulo de administración, que se instala con npm, en Vue, en React o en los dos. Lo generado no conoce la aplicación que lo instala, pero sí da por hecho unas pocas cosas de ella. Si falta alguna, no es un defecto del paquete: esta página es la lista.

Si generas los modelos dentro de la propia aplicación, sin paquete, ve a [Un módulo generado dentro de la aplicación](#modulo-en-la-aplicacion).

## Lo que el paquete espera de la aplicación

| Qué | Por qué |
|---|---|
| `laravel/sanctum` | Las rutas usan `auth:sanctum`. |
| `$middleware->statefulApi()` en `bootstrap/app.php` | El administrador llama a la API con la cookie de sesión. Sin esto, cada petición responde 401. |
| `JsonResource::withoutWrapping()` | La tabla espera `data`, `meta` y `links` en la raíz; sin esto sale vacía. |
| `innoboxrr/routes-to-json` | El front resuelve cada URL por el nombre de su ruta. |
| Un usuario `Notifiable` | La exportación avisa por notificación. El usuario de Laravel ya lo es. |
| `isAdmin()` en el usuario, opcional | El `before()` de cada política deja pasar al administrador. Sin el método, nadie lo es y deciden los métodos de la política. |
| El idioma de la petición (`App::setLocale`) | Las acciones de fila y el correo de exportación salen en ese idioma. |
| `vue-router` 4 y `pinia` 3, o `react-router-dom` 7 y `zustand` 5 | Son los que declara el módulo. Sin versión, npm instala hoy majors que no acepta. |
| Una sola copia de cada dependencia compartida | El módulo y la aplicación comparten estado a través de ellas. |
| `ToastRegionComponent` y `ConfirmHostComponent`, montados una vez | Ahí se pintan los avisos y la confirmación. |
| Las traducciones del módulo cargadas, y `setLocale()` | Todo texto del módulo es una clave en inglés. |

Esto no es teórico: la suite de LaraPack genera un paquete, lo instala en una aplicación Laravel y recorre su API y sus tests tal como salen.

## El backend

```bash
composer require acme/catalogo
php artisan migrate
```

Los proveedores se descubren solos: el paquete los declara en `extra.laravel.providers`, y su `AppServiceProvider` carga las migraciones, las vistas, la configuración y los textos.

### Sanctum, sesión y respuestas planas

```bash
php artisan install:api
composer show laravel/sanctum
```

::: warning Comprueba que Sanctum quedó instalado
`install:api` usa el `composer` del PATH y, si falla, no lo dice. `composer show laravel/sanctum` confirma que está.
:::

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})
```

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

La sesión de Sanctum sólo se acepta desde los dominios de `SANCTUM_STATEFUL_DOMAINS`, que por defecto incluyen el host de `APP_URL`. Si el inicio de sesión funciona pero cada tabla responde 401, revisa `APP_URL`, con su puerto, y `SESSION_DOMAIN`. Más casos en [Solución de problemas](/ayuda/).

### Configuración, vistas y textos

El paquete funciona recién instalado: exporta a Excel en el disco `local` y avisa por correo. Para cambiarlo, publica su configuración:

```bash
php artisan vendor:publish --provider="Acme\Catalogo\Providers\AppServiceProvider" --tag=config
```

- **`config`** publica `config/<clave>.php`, con la clave del paquete (`acmecatalogo` para `Acme\Catalogo`). Las claves están en [Exportar a Excel](/larapack/exportar#configuracion).
- **`views`** publica las vistas de Excel en `resources/views/vendor/<clave>`.
- **Los textos de Laravel** del paquete están en su `lang/es.json`. Corrígelos en el `lang/es.json` de la aplicación, que tiene prioridad.

Para avisar también en la base de datos, crea la tabla de notificaciones y añade `database` a `notification_via`:

```bash
php artisan make:notifications-table
php artisan migrate
```

## routes.json {#routes-json}

El front no escribe URLs: las pide por nombre con `innoboxrr-route-resolver`, que no es Ziggy. La cadena es:

```text
php artisan route:json             innoboxrr/routes-to-json exporta las rutas con nombre
  → routes.json
  → setRoutes(routes)              al arrancar el front
  → route('api.acme.catalogo.post.index')
```

- El archivo se escribe donde diga `routes-to-json.path` (variable `JSON_ROUTES_FILE`). La aplicación base lo deja en `resources/<ui>/routes.json`.
- **Cada vez que cambia una ruta hay que volver a exportarlo.** Una forma de no olvidarlo es encadenarlo en el script de compilación: `"build": "php artisan route:json && vite build"`.
- Una ruta que no está en `routes.json` hace que el módulo llame a una URL equivocada. Ver [Peticiones, rutas e idiomas](/interfaz/http-rutas-i18n).

## El frontend

### Instalar el módulo

El módulo se instala como cualquier paquete npm: publicado, o desde la carpeta del paquete mientras se desarrolla (`"acme-catalogo": "file:vendor/acme/catalogo/resources/vue"`). Instala también sus `peerDependencies`, con versión:

::: code-group

```bash [Vue]
npm install acme-catalogo vue vue-router@4 pinia@3
npm install --save-dev @vitejs/plugin-vue
```

```bash [React]
npm install acme-catalogo-react react@19 react-dom@19 react-router-dom@7 zustand@5
npm install --save-dev @vitejs/plugin-react
```

:::

::: danger Instala el router y el store con versión
`npm install vue-router pinia` sin versión instala hoy vue-router 5 y Pinia 4, que el módulo no declara.
:::

### Vite: una sola copia de cada una {#vite-dedupe}

Instalado desde una carpeta, el módulo trae su propio `node_modules`, y Vite empaquetaría dos copias de lo compartido. Dos copias de Vue o de React rompen sus hooks y su reactividad; dos de `innoboxrr-form-core` no comparten los avisos, la confirmación ni el tema, que viven en el estado del paquete; dos de axios (el que usa `innoboxrr-http-request`) no comparten interceptores ni la cabecera XSRF; y en React, dos de `innoboxrr-react-datatable` dejarían `buildPath` sin los nombres de ruta que registró el módulo.

::: code-group

```js [Vue: vite.config.js]
export default defineConfig({
    // ...
    resolve: {
        dedupe: [
            'axios',
            'pinia',
            'vue',
            'vue-router',
            'innoboxrr-form-core',
            'innoboxrr-form-elements',
            'innoboxrr-http-request',
            'innoboxrr-i18n',
            'innoboxrr-js-validator',
            'innoboxrr-route-resolver',
            'innoboxrr-vue-datatable',
        ],
    },
})
```

```js [React: vite.config.js]
export default defineConfig({
    // ...
    resolve: {
        dedupe: [
            'axios',
            'react',
            'react-dom',
            'react-router-dom',
            'zustand',
            'innoboxrr-form-core',
            'innoboxrr-react-form-elements',
            'innoboxrr-http-request',
            'innoboxrr-i18n',
            'innoboxrr-js-validator',
            'innoboxrr-route-resolver',
            'innoboxrr-react-datatable',
        ],
    },
})
```

:::

La lista de Vue es la que usa la aplicación base. Lo mínimo es `vue`, `vue-router` y `pinia` en Vue, y `react`, `react-dom`, `react-router-dom` y `zustand` en React; el resto evita los fallos silenciosos de arriba.

### Arrancar

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

// Los textos del módulo primero y los de la aplicación encima, para poder
// corregirlos. Sin esto la pantalla sale con las claves en inglés.
addTranslations(catalogoTranslations)
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))
setLocale(document.documentElement.lang)

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/admin', component: AdminLayout, children: catalogoRoutes },
    ],
})

// Qué ruta pide sesión lo declara la ruta (meta.auth); decide la aplicación.
router.beforeEach((to) => (to.matched.some((record) => record.meta.auth) && ! isLoggedIn() ? '/login' : true))

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

// Con el mismo prefijo con el que se montan las rutas: es lo que usa buildPath().
registerModuleRoutes('/admin')

addTranslations(catalogoTranslations)
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))
setLocale(document.documentElement.lang)

function AdminLayout() {
    // Qué ruta pide sesión lo declara la ruta (handle.auth); decide la aplicación.
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

```vue [Vue: App.vue]
<template>
    <RouterView />
    <ToastRegionComponent />
    <ConfirmHostComponent />
</template>

<script setup>
    import { RouterView } from 'vue-router'
    import { ConfirmHostComponent, ToastRegionComponent } from 'innoboxrr-form-elements'
</script>
```

:::

`isLoggedIn()` es de la aplicación: el módulo no sabe cómo guarda la sesión. La aplicación base tiene sus guardas completas en [El contrato de las interfaces](/app-base/contrato).

### Traducciones {#traducciones}

- **El módulo primero, la aplicación después.** `addTranslations` suma diccionarios, y una traducción vacía (`""`) nunca pisa una anterior. Cargando la aplicación encima puedes corregir cualquier texto del módulo.
- **`setLocale()` una vez.** El idioma se elige por el nombre del archivo (`es.json`), y `es-MX` se apoya en `es`.
- **Los nombres del dominio** (el modelo, sus campos, las etiquetas de un `enum`) llegan con `""` en el `es.json` del módulo: tradúcelos en el paquete o en los textos de la aplicación.

La ruta de los archivos de la aplicación es la tuya: el ejemplo usa `/resources/locales/*.json`, y la aplicación base usa `resources/<ui>/app/lang/*.json`.

### Avisos y confirmación

`ToastRegionComponent` y `ConfirmHostComponent` se montan **una sola vez**, en el layout o en la raíz. Sin ellos, crear, guardar y borrar no avisan de nada, y la confirmación antes de borrar o exportar cae en `window.confirm`.

### Sesión y CSRF

Las escrituras del módulo mandan `_token` leído de la etiqueta `csrf-token` en el momento de enviar, y las lecturas no mandan nada. Pon la etiqueta en el layout:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

Con Sanctum y `statefulApi()`, la aplicación base configura además axios con `withCredentials` y `withXSRFToken`, y pide `GET /sanctum/csrf-cookie` antes de iniciar sesión. Como `innoboxrr-http-request` usa axios, esa configuración sólo alcanza al módulo si hay una sola copia de axios.

### Qué rutas piden sesión

Cada ruta del módulo declara `auth: true`, en `meta` en Vue y en `handle` en React. El módulo no protege nada por sí mismo: tu router lo lee y redirige. Los guardas deben mirar toda la cadena de rutas coincidentes, para que las hijas (alta, ficha, edición) hereden la protección.

### Estilos

`import 'acme-catalogo/src/theme.js'` una vez, al arrancar. Si el administrador sale sin estilos, el `package.json` del módulo no declara `src/theme.js` en `sideEffects` y Vite descartó el import: ver [De 7.7.0 a 7.7.1](/larapack/actualizar#de-770-a-771).

### Navegar desde React

Desde una vista React se navega con `buildPath('AdminShowPost', { id })` de `innoboxrr-react-datatable`, nunca con una ruta escrita a mano. Ver [La interfaz generada](/larapack/interfaz#navegar-desde-react-buildpath).

### Varios módulos

Cada módulo se instala, se deduplica y se arranca igual: su tema, sus traducciones y sus rutas bajo el mismo `/admin`. En React, llama a `registerModuleRoutes('/admin')` de cada uno.

::: warning Dos modelos con el mismo nombre
Los nombres de ruta de la interfaz no llevan namespace: un `Post` de dos paquetes produce dos `AdminPosts`. Los stores y las rutas de la API sí están separados por namespace, pero el router no admite dos rutas con el mismo nombre.
:::

## Un módulo generado dentro de la aplicación {#modulo-en-la-aplicacion}

Cuando el `composer.json` de la raíz es de tipo `project`, LaraPack genera la API en `app/` y el módulo en `resources/<ui>/index.js` y `resources/<ui>/src/`, **sin `package.json` ni `vite.config.js`**: lo compila el Vite de la aplicación. Cambia esto:

- **Proveedores.** `larapack:route-service-provider` y `larapack:event-service-provider` crean `app/Providers/RouteServiceProvider.php` y `EventServiceProvider.php`. Regístralos en `bootstrap/providers.php`: Laravel no descubre proveedores en el `composer.json` de una aplicación, sin el de rutas no hay endpoints y sin el de eventos la exportación nunca avisa.
- **Rutas.** Las URLs son `api/app/<snake>` y los nombres, `api.app.<snake>.*`.
- **Dependencias npm.** El `package.json` de la aplicación declara las del módulo: las de [Las dependencias del módulo](/larapack/interfaz#las-dependencias-del-modulo), con el router y el store.
- **Import.** El punto de entrada se importa por ruta, no por nombre de paquete. La aplicación base lo carga con `import.meta.glob('../index.js')`, así que compila también antes de que exista ningún modelo, y monta sus rutas bajo `/admin`, carga sus traducciones antes que las suyas e importa `src/theme.js` si existe.
- **Exportación.** Lee `config/larapack.php`. Ver [Exportar a Excel](/larapack/exportar#configuracion).

La aplicación base ya hace todo esto: ver [El contrato de las interfaces](/app-base/contrato) y [Paquete o aplicación](/conceptos/paquete-o-aplicacion).

## Comprobarlo

1. `composer show laravel/sanctum` y `php artisan migrate`.
2. `php artisan route:json` y la compilación del front.
3. Inicia sesión con un usuario cuyo `isAdmin()` devuelva `true` y abre `/admin/<modelo>`.
4. La tabla carga, los textos salen en el idioma de la página y el tema se aplica.
5. Crear desde la tabla avisa y recarga; editar desde la ficha avisa; borrar pregunta con la confirmación del tema.
6. Ctrl+K abre la paleta, y exportar avisa y termina en un correo.
