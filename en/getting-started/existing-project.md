# In an existing project

LaraPack doesn't need a fresh project. It generates just the same inside an existing package or a running Laravel 13 application. What changes is where it writes and what you have to wire up yourself, and the `type` in `composer.json` decides it:

| `type` in `composer.json` | Mode | Writes to |
|---|---|---|
| `library`, or no `type` | Package | `src/`, under the package namespace |
| Anything else, usually `project` | Application | `app/`, under `App\` |

The full list of differences is in [Package or application](/en/concepts/package-or-application).

::: tip A freshly created application?
If the app is still what `laravel new` produced, skip this page: [the base application](/en/getting-started/new-app) does all of this and also sets up the site, authentication and admin panel.
:::

## In an existing package

### 1. Check `composer.json`

- `type` is `library`, or absent.
- `autoload.psr-4` has a namespace pointing at `src/`. LaraPack reads the namespace from there, and route names derive from it: `Acme\Catalog\` gives `api.acme.catalog.<model>.*`.
- There is no `version` key. If there is, remove it: Composer discards every tag that doesn't match it.

### 2. Install LaraPack and what the generated code uses

```bash
composer require --dev innoboxrr/larapack-generator
composer require innoboxrr/search-surge:^3.0 innoboxrr/support:^2.1 innoboxrr/traits:^2.1 laravel/sanctum:^4.3 maatwebsite/excel:^4.0
```

LaraPack goes in `require-dev`: it's the generator. The code it generates uses `traits` (models and metas), `search-surge` (indexes and filters), `support` (meta saving), Sanctum (`auth:sanctum` on routes) and Excel (exports), and those belong in `require`.

### 3. Providers and config, once

```bash
php vendor/bin/builder larapack:providers
php vendor/bin/builder larapack:config
```

`larapack:providers` creates the App, Auth, Event and Route providers and lists them in `extra.laravel.providers`, so any application installing the package discovers them. `larapack:config` creates the package config file. The importer doesn't generate these: without them neither routes nor events load.

### 4. Declare, validate and generate

```bash
php vendor/bin/builder larapack:schema
# write laraimport.json
php vendor/bin/builder larapack:validate --vue
php vendor/bin/builder larapack:import --vue --dry-run
php vendor/bin/builder larapack:import --vue
```

Swap `--vue` for `--react`, or use both. The interface module goes into `resources/vue` or `resources/react`, with its own `package.json`.

::: warning If you already have files with those names
LaraPack doesn't overwrite what it didn't write: an existing file is skipped, and with `--force` a file the manifest doesn't know is still left alone. Always read the `--dry-run` output before generating over existing code.

If the package was generated with LaraPack 5.x, before the manifest existed, follow the [Upgrade guide](/en/larapack/upgrade).
:::

### 5. Align the package with the baseline

```bash
php vendor/bin/builder larapack:audit
```

`larapack:audit` compares the package against the versions that govern the whole ecosystem and against what it needs to release: real tests, `tests.yml`, `release.yml`. Each finding says what to fix.

To get workflows, `VERSION`, `pint.json` and `phpstan.neon.dist` identical to a new package's, generate a reference package **outside** yours and copy what you're missing:

```bash
php vendor/bin/builder larapack:new acme/reference ../reference
```

`--dry-run` won't do here: it builds the package in a temporary directory and deletes it.

## In an existing application

A running Laravel 13 application, without the base app. LaraPack generates the API and the interface module; wiring the interface into your application is up to you.

### 1. What the application must have

| What | How | Why |
|---|---|---|
| Sanctum | `php artisan install:api`, then confirm with `composer show laravel/sanctum` | Generated routes use `auth:sanctum`. `install:api` uses the PATH `composer` and fails silently. |
| Session on the API | `$middleware->statefulApi()` in `bootstrap/app.php` | The interface calls the API with the session cookie. Without it, every request answers 401. |
| Unwrapped responses | `JsonResource::withoutWrapping()` in `AppServiceProvider::boot()` | The table expects `data`, `meta` and `links` at the root. Without it the table is empty. |
| Named routes | `innoboxrr/routes-to-json` | The frontend requests every URL by name. |
| A `Notifiable` user | Laravel's `User` already is | Exports notify the user. |
| `isAdmin()` on the user | Optional | Each policy's `before()` lets administrators through. Without the method, nobody is one. |

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

If you want the same rule as the base app, an administrator is anyone whose email is in `ADMIN_EMAILS`:

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

### 2. Install LaraPack and its dependencies

```bash
composer require --dev innoboxrr/larapack-generator
composer require innoboxrr/search-surge:^3.0 innoboxrr/support:^2.1 innoboxrr/traits:^2.1 innoboxrr/routes-to-json:^2.1 maatwebsite/excel:^4.0
```

### 3. Declare, validate and generate

Create `laraimport.json` at the application root and generate:

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

In an application:

- Code goes to `app/`. The API for `OrderLine` lives in `routes/api/models/order_line.php`, with URL `api/app/order_line/...` and names `api.app.order_line.*`.
- Factories go to `Database\Factories` and tests to `Tests\Feature\Models`. Tests extend your `tests/TestCase.php` and sign in using the factory of the `auth.providers.users.model` model.
- If a table already has a create migration LaraPack didn't write, such as Laravel's `users`, `larapack:import` skips it and writes no alter migrations against it. If that table needs more columns, write the migration yourself.

### 4. Create and register the providers

```bash
php artisan larapack:route-service-provider
php artisan larapack:event-service-provider
```

**Register them in `bootstrap/providers.php`.** Laravel doesn't discover providers from an application's `composer.json`:

```php
// bootstrap/providers.php
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\EventServiceProvider::class,
    App\Providers\RouteServiceProvider::class,
];
```

Without the `RouteServiceProvider` no generated route exists. Without the `EventServiceProvider`, an export never notifies whoever requested it.

### 5. Migrate and export routes

Tell `routes-to-json` where to write. A relative path resolves from the project root:

```dotenv
JSON_ROUTES_FILE=resources/vue/routes.json
```

```bash
php artisan migrate
php artisan route:json
```

Every time you add an endpoint, run `route:json` again.

Exports work with no configuration: they store to the `local` disk and notify by email. To change that, `php artisan larapack:config` creates `config/larapack.php` with `notification_via`, `export_disk` and `excel_view`. It never writes to `config/app.php`.

### 6. Wire up the interface

In an application the module **has no `package.json` or `vite.config.js`**: your application's Vite builds it, so your `package.json` must declare what the module uses.

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

Then, in your interface's entry point: configure axios for the session, load routes and translations, and mount the module's routes under `/admin`. These examples assume the entry point lives in `resources/js/`:

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

// The API is called with Sanctum's session cookie.
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

// Module routes declare `meta.auth`; what happens without a session is the app's call.
// isLoggedIn() is however your app knows.
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
// Same prefix the routes are mounted under: the table builds its links by name.
registerModuleRoutes('/admin')

addTranslations(translations)
setLocale(document.documentElement.lang)

function AdminLayout() {
    // Module routes declare `handle.auth`; what happens without a session is the app's call.
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

In Vue, mount `ToastRegionComponent` and `ConfirmHostComponent` from `innoboxrr-form-elements` once in `App.vue`, next to `<RouterView />`.

Laravel must serve the SPA view on any `/admin` path. The view carries the application locale in the `lang` attribute of `<html>` (which `setLocale` reads), a `<div id="app">` and the `@vite` directive for your entry point:

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

::: tip Your login works
If the application already signs users in through its own web login on the same domain, the interface uses that same session cookie. If the SPA handles login, request `GET /sanctum/csrf-cookie` before the login POST.
:::

::: warning APP_URL
The address you open the app with must be in `SANCTUM_STATEFUL_DOMAINS`, which by default includes the `APP_URL` host and port. Otherwise the session works on pages but the API answers 401. See [Requirements](/en/getting-started/requirements#app-url-sanctum-and-cookies).
:::

### 7. Check

```bash
php artisan larapack:verify
php artisan test
```

Commit `laraimport.json` and `.larapack/manifest.json` together with the generated code.

## Extending a project that already uses LaraPack

If the project already generates with LaraPack, adding a model, a column or a rule is the normal flow: edit `laraimport.json`, `validate`, `import --dry-run`, `import --force`, and review what the importer says it kept. See [Regenerate without destroying](/en/larapack/regenerate).
