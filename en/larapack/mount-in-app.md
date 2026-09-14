# Mounting a package in an application

A package generated with LaraPack ships two things: its API, installed with Composer, and its admin module, installed with npm, in Vue, React or both. The generated code doesn't know the application that installs it, but it does assume a few things about it. If one of them is missing, that isn't a defect in the package: this page is the list.

If you generate the models inside the application itself, without a package, go to [A module generated inside the application](#module-in-the-application).

## What the package expects from the application

| What | Why |
|---|---|
| `laravel/sanctum` | The routes use `auth:sanctum`. |
| `$middleware->statefulApi()` in `bootstrap/app.php` | The admin panel calls the API with the session cookie. Without it, every request returns 401. |
| `JsonResource::withoutWrapping()` | The table expects `data`, `meta` and `links` at the root; without it, the table comes out empty. |
| `innoboxrr/routes-to-json` | The front end resolves every URL by its route name. |
| A `Notifiable` user | The export reports back through a notification. Laravel's user already is one. |
| `isAdmin()` on the user, optional | Every policy's `before()` lets the administrator through. Without the method, nobody is an administrator and the policy methods decide. |
| The request locale (`App::setLocale`) | Row actions and the export email come out in that language. |
| `vue-router` 4 and `pinia` 3, or `react-router-dom` 7 and `zustand` 5 | They're what the module declares. Without a version, npm today installs majors the module doesn't accept. |
| A single copy of each shared dependency | The module and the application share state through them. |
| `ToastRegionComponent` and `ConfirmHostComponent`, mounted once | That's where toasts and the confirmation dialog are rendered. |
| The module's translations loaded, and `setLocale()` | Every text in the module is an English key. |

This isn't theoretical: LaraPack's suite generates a package, installs it in a Laravel application and exercises its API and its tests exactly as they come out.

## The backend

```bash
composer require acme/catalogo
php artisan migrate
```

The providers are discovered automatically: the package declares them in `extra.laravel.providers`, and its `AppServiceProvider` loads the migrations, views, configuration and texts.

### Sanctum, session and flat responses

```bash
php artisan install:api
composer show laravel/sanctum
```

::: warning Check that Sanctum got installed
`install:api` uses the `composer` on your PATH and, if it fails, it doesn't say so. `composer show laravel/sanctum` confirms it's there.
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

Sanctum only accepts the session from the domains in `SANCTUM_STATEFUL_DOMAINS`, which by default include the host of `APP_URL`. If login works but every table returns 401, check `APP_URL`, including its port, and `SESSION_DOMAIN`. More cases in [Troubleshooting](/en/help/).

### Configuration, views and texts

The package works as soon as it's installed: it exports to Excel on the `local` disk and notifies by email. To change that, publish its configuration:

```bash
php artisan vendor:publish --provider="Acme\Catalogo\Providers\AppServiceProvider" --tag=config
```

- **`config`** publishes `config/<clave>.php`, named after the package key (`acmecatalogo` for `Acme\Catalogo`). The keys are in [Export to Excel](/en/larapack/export#configuration).
- **`views`** publishes the Excel views to `resources/views/vendor/<clave>`.
- **The package's Laravel texts** live in its `lang/es.json`. Correct them in the application's `lang/es.json`, which takes precedence.

To notify in the database as well, create the notifications table and add `database` to `notification_via`:

```bash
php artisan make:notifications-table
php artisan migrate
```

## routes.json {#routes-json}

The front end doesn't write URLs: it asks for them by name with `innoboxrr-route-resolver`, which is not Ziggy. The chain is:

```text
php artisan route:json             innoboxrr/routes-to-json exports the named routes
  → routes.json
  → setRoutes(routes)              when the front end boots
  → route('api.acme.catalogo.post.index')
```

- The file is written wherever `routes-to-json.path` says (the `JSON_ROUTES_FILE` variable). The base application puts it in `resources/<ui>/routes.json`.
- **Every time a route changes, you have to export it again.** One way not to forget is to chain it into the build script: `"build": "php artisan route:json && vite build"`.
- A route missing from `routes.json` makes the module call the wrong URL. See [Requests, routes and languages](/en/ui/http-routes-i18n).

## The frontend

### Installing the module

The module installs like any npm package: from the registry once published, or from the package folder during development (`"acme-catalogo": "file:vendor/acme/catalogo/resources/vue"`). Install its `peerDependencies` too, with versions:

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

::: danger Install the router and the store with a version
`npm install vue-router pinia` without a version installs vue-router 5 and Pinia 4 today, which the module doesn't declare.
:::

### Vite: a single copy of each {#vite-dedupe}

Installed from a folder, the module brings its own `node_modules`, and Vite would bundle two copies of whatever is shared. Two copies of Vue or React break their hooks and reactivity; two copies of `innoboxrr-form-core` don't share toasts, the confirmation dialog or the theme, which live in the package's state; two copies of axios (the one `innoboxrr-http-request` uses) don't share interceptors or the XSRF header; and in React, two copies of `innoboxrr-react-datatable` would leave `buildPath` without the route names the module registered.

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

The Vue list is the one the base application uses. The minimum is `vue`, `vue-router` and `pinia` in Vue, and `react`, `react-dom`, `react-router-dom` and `zustand` in React; the rest prevents the silent failures described above.

### Booting

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

// The module's texts first and the application's on top, so they can be
// corrected. Without this the screen shows the English keys.
addTranslations(catalogoTranslations)
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))
setLocale(document.documentElement.lang)

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/admin', component: AdminLayout, children: catalogoRoutes },
    ],
})

// The route declares whether it requires a session (meta.auth); the application decides.
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

// With the same prefix the routes are mounted under: it's what buildPath() uses.
registerModuleRoutes('/admin')

addTranslations(catalogoTranslations)
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))
setLocale(document.documentElement.lang)

function AdminLayout() {
    // The route declares whether it requires a session (handle.auth); the application decides.
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

`isLoggedIn()` belongs to the application: the module doesn't know how the session is stored. The base application has its complete guards in [The interface contract](/en/app-base/contract).

### Translations {#translations}

- **The module first, the application after.** `addTranslations` merges dictionaries, and an empty translation (`""`) never overrides an earlier one. Loading the application's texts on top lets you correct any text from the module.
- **`setLocale()` once.** The language is picked by file name (`es.json`), and `es-MX` falls back to `es`.
- **Domain names** (the model, its fields, the labels of an `enum`) arrive as `""` in the module's `es.json`: translate them in the package or in the application's texts.

Where the application's files live is up to you: the example uses `/resources/locales/*.json`, and the base application uses `resources/<ui>/app/lang/*.json`.

### Toasts and confirmation

`ToastRegionComponent` and `ConfirmHostComponent` are mounted **only once**, in the layout or at the root. Without them, creating, saving and deleting show no toast, and the confirmation before deleting or exporting falls back to `window.confirm`.

### Session and CSRF

The module's writes send `_token`, read from the `csrf-token` tag at the moment of sending, and reads send nothing. Put the tag in the layout:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

With Sanctum and `statefulApi()`, the base application also configures axios with `withCredentials` and `withXSRFToken`, and requests `GET /sanctum/csrf-cookie` before logging in. Since `innoboxrr-http-request` uses axios, that configuration only reaches the module if there's a single copy of axios.

### Which routes require a session

Every module route declares `auth: true`, in `meta` in Vue and in `handle` in React. The module protects nothing on its own: your router reads the flag and redirects. Guards should look at the whole chain of matched routes, so child routes (create, detail page, edit) inherit the protection.

### Styles

`import 'acme-catalogo/src/theme.js'` once, at boot. If the admin panel shows up without styles, the module's `package.json` doesn't declare `src/theme.js` in `sideEffects` and Vite dropped the import: see [From 7.7.0 to 7.7.1](/en/larapack/upgrade#from-770-to-771).

### Navigating from React

From a React view, navigate with `buildPath('AdminShowPost', { id })` from `innoboxrr-react-datatable`, never with a hand-written path. See [The generated UI](/en/larapack/ui#navigating-from-react-buildpath).

### Several modules

Every module is installed, deduplicated and booted the same way: its theme, its translations and its routes under the same `/admin`. In React, call `registerModuleRoutes('/admin')` from each one.

::: warning Two models with the same name
Interface route names carry no namespace: a `Post` from two packages produces two `AdminPosts`. Stores and API routes are separated by namespace, but the router doesn't allow two routes with the same name.
:::

## A module generated inside the application {#module-in-the-application}

When the root `composer.json` has type `project`, LaraPack generates the API in `app/` and the module in `resources/<ui>/index.js` and `resources/<ui>/src/`, **without `package.json` or `vite.config.js`**: the application's Vite builds it. This is what changes:

- **Providers.** `larapack:route-service-provider` and `larapack:event-service-provider` create `app/Providers/RouteServiceProvider.php` and `EventServiceProvider.php`. Register them in `bootstrap/providers.php`: Laravel doesn't discover providers in an application's `composer.json`; without the route provider there are no endpoints, and without the event provider the export never notifies anyone.
- **Routes.** URLs are `api/app/<snake>` and names are `api.app.<snake>.*`.
- **npm dependencies.** The application's `package.json` declares the module's dependencies: those in [Module dependencies](/en/larapack/ui#module-dependencies), including the router and the store.
- **Import.** The entry point is imported by path, not by package name. The base application loads it with `import.meta.glob('../index.js')`, so it builds even before any model exists; it mounts the module's routes under `/admin`, loads its translations before its own and imports `src/theme.js` if it exists.
- **Export.** It reads `config/larapack.php`. See [Export to Excel](/en/larapack/export#configuration).

The base application already does all of this: see [The interface contract](/en/app-base/contract) and [Package or application](/en/concepts/package-or-application).

## Checking it

1. `composer show laravel/sanctum` and `php artisan migrate`.
2. `php artisan route:json` and the front-end build.
3. Log in with a user whose `isAdmin()` returns `true` and open `/admin/<modelo>`.
4. The table loads, the texts appear in the page's language and the theme is applied.
5. Creating from the table shows a toast and reloads; editing from the detail page shows a toast; deleting asks first with the theme's confirmation dialog.
6. Ctrl+K opens the command palette, and exporting shows a toast and ends with an email.
