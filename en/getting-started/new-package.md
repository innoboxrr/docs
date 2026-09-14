# A new package

A package makes sense when a feature will be used by more than one application, or will be published: a catalog, invoicing, a booking module. It carries its API and its admin module inside, and each application installs it with Composer and npm.

`larapack:new` creates a package that, from the first commit, has the ecosystem version baseline, tests to run, release workflows and the agent guide, and passes `larapack:audit` with zero findings.

## First: where the command comes from

`larapack:new` runs through LaraPack's binary, `builder`, so LaraPack has to be installed somewhere before the package exists. Two ways:

::: code-group

```bash [From an application]
# In an application that already has LaraPack, such as the base app
php vendor/bin/builder larapack:new acme/catalog packages/catalog
```

```bash [From a LaraPack clone]
git clone https://github.com/innoboxrr/larapack-generator.git
cd larapack-generator
composer install
php builder larapack:new acme/catalog ../catalog
```

:::

The directory is resolved from where you run the command. Without it, the package is created in `./<package>`.

## 1. Create the package

```bash
php vendor/bin/builder larapack:new acme/catalog packages/catalog --dry-run
php vendor/bin/builder larapack:new acme/catalog packages/catalog
```

`--dry-run` builds the package in a temporary directory, deletes it, and tells you exactly what it would create.

| Argument or option | Default | What it does |
|---|---|---|
| `name` | — | Composer name, `vendor/package`, lowercase. |
| `directory` | `./<package>` | Where to create it. |
| `--namespace` | Derived from the name | Root namespace. `acme/shop-catalog` gives `Acme\ShopCatalog`. |
| `--description` | `<package>: paquete Laravel generado con LaraPack.` | For `composer.json` and the README. |
| `--license` | `MIT` | With `MIT` it also writes `LICENSE`. |
| `--dry-run` | — | Reports what it would create without writing. |
| `--format` | `txt` | `json` for an agent to read. |

`larapack:new` **refuses a directory that already has a `composer.json`** and never overwrites anything. For an existing project, see [In an existing project](/en/getting-started/existing-project).

::: details What it creates
```
composer.json
.gitignore
.gitattributes
README.md
CHANGELOG.md
VERSION                              0.1.0
AGENTS.md                            points to the LaraPack guide
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
config/acmecatalog.php
.claude/skills/larapack/SKILL.md
```
:::

`composer.json` comes from the ecosystem baseline. An excerpt:

```json
{
    "name": "acme/catalog",
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
            "Acme\\Catalog\\": "src/",
            "Acme\\Catalog\\Database\\Factories\\": "database/factories/"
        }
    }
}
```

The four providers are also listed in `extra.laravel.providers`, so any application that installs the package boots it automatically: migrations, views, config, routes and events.

## 2. Install its dependencies

```bash
cd packages/catalog
composer install
```

From here on, commands run through the package's own `builder`: LaraPack is in its `require-dev`.

## 3. Read the schema and declare the domain

```bash
php vendor/bin/builder larapack:schema
```

Read the schema first; don't guess. Create `laraimport.json` at the package root:

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

Every key is in [The contract: laraimport.json](/en/larapack/laraimport).

## 4. Validate and generate

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

```bash [Both]
php vendor/bin/builder larapack:validate --vue --react
php vendor/bin/builder larapack:import --vue --react --dry-run
php vendor/bin/builder larapack:import --vue --react
```

:::

Without a path, `validate` and `import` read `./laraimport.json`.

In a package, generated code carries the package namespace:

| What | Where it goes |
|---|---|
| PHP code | `src/`, under `Acme\Catalog\` |
| Routes | `routes/api/models/product.php`, URL `api/acme/catalog/product/...`, names `api.acme.catalog.product.*` |
| Vue module | `resources/vue`, with its own `package.json`: `acme-catalog` |
| React module | `resources/react`, with its own `package.json`: `acme-catalog-react` |

The differences from an application are in [Package or application](/en/concepts/package-or-application).

## 5. Write the logic in the slots

Business logic goes in `src/Models/Traits/Operations/`, authorization in the policy, who sees what in `ManagedFilter::canView`, side effects in listeners. If something fits in no slot, it's missing from `laraimport.json`. See [What is generated and where your code goes](/en/larapack/generated-code).

## 6. Check

```bash
php vendor/bin/builder larapack:verify
vendor/bin/phpunit
vendor/bin/pint --test
vendor/bin/phpstan analyse
php vendor/bin/builder larapack:audit
```

- `larapack:verify` compares the code with the contract and the manifest.
- Tests run against in-memory SQLite, so PHP needs `pdo_sqlite` and `sqlite3`. If it fails with "could not find driver":

  ```bash
  php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit
  ```

- LaraPack's output passes `pint --test` and Larastan level 5. A failure there comes from hand-written code: `vendor/bin/pint` formats it.
- `larapack:audit` compares the package against the ecosystem baseline: versions, tests and workflows.

Commit `.larapack/manifest.json`: without it the generator can't tell your code from its own.

## 7. Release

1. Bump `VERSION` (semver) and describe the change in `CHANGELOG.md`: what changed, why, and what upgraders need to do.
2. Push to `main` or `master`.
3. `tests.yml` installs, runs `larapack:audit` and the suite. If it passes, `release.yml` creates the tag from `VERSION`, with no `v` prefix, and Packagist publishes from that tag.

A push with a failing test releases nothing, and an existing tag is never recreated.

::: warning Two things that break releases
- **A `version` key in `composer.json`.** Composer discards every tag that doesn't match it, so the new version stays invisible. `larapack:audit` flags it as an error.
- **Removing `permissions: contents: write` from `release.yml`.** In a repository with read-only default permissions, the workflow never starts and leaves no log. `larapack:new` already writes it.
:::

The interface module has its own `package.json` and is published to npm separately. See [Releasing a version](/en/ci/releasing).

## Using it from an application

### Backend

```bash
composer require acme/catalog
php artisan migrate
php artisan route:json
```

The package assumes the following about the application. The [base application](/en/getting-started/new-app) already meets all of it:

| What | Why |
|---|---|
| `laravel/sanctum` | Routes use `auth:sanctum`. |
| `$middleware->statefulApi()` in `bootstrap/app.php` | The interface calls the API with the session cookie. Without it, every request answers 401. |
| `JsonResource::withoutWrapping()` in `AppServiceProvider` | The table expects `data`, `meta` and `links` at the root; without it the table is empty. |
| `innoboxrr/routes-to-json` | The frontend requests every URL by route name. |
| A `Notifiable` user | Exports notify the user. |
| `isAdmin()` on the user, optional | Each policy's `before()` lets administrators through. |
| The request locale | Row actions and the export email use that language. |

### Frontend

The module installs like any npm package: published, or with `"file:vendor/acme/catalog/resources/vue"` while developing. When installed from a folder, tell Vite to use a single copy of each shared dependency:

::: code-group

```js [Vue: vite.config.js]
resolve: { dedupe: ['vue', 'vue-router', 'pinia'] },
```

```js [React: vite.config.js]
resolve: { dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'] },
```

:::

Then mount it under `/admin`:

::: code-group

```js [Vue: main.js]
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'

import 'acme-catalog/src/theme.js'
import catalog, { routes as catalogRoutes, translations as catalogTranslations } from 'acme-catalog'

import routes from './routes.json'
import App from './App.vue'
import AdminLayout from './AdminLayout.vue'

setRoutes(routes)

// Module translations first, the application's on top.
addTranslations(catalogTranslations)
setLocale(document.documentElement.lang)

const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/admin', component: AdminLayout, children: catalogRoutes }],
})

createApp(App).use(createPinia()).use(router).use(catalog).mount('#app')
```

```jsx [React: main.jsx]
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'
import { ConfirmHostComponent, ToastRegionComponent } from 'innoboxrr-react-form-elements'

import 'acme-catalog-react/src/theme.js'
import { registerModuleRoutes, routes as catalogRoutes, translations as catalogTranslations } from 'acme-catalog-react'

import routes from './routes.json'

setRoutes(routes)
// React Router has no named routes: the module registers its own names with
// the same prefix they are mounted under.
registerModuleRoutes('/admin')

addTranslations(catalogTranslations)
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
    { path: '/admin', element: <AdminLayout />, children: catalogRoutes },
])

createRoot(document.getElementById('app')).render(<RouterProvider router={router} />)
```

:::

In Vue, mount `ToastRegionComponent` and `ConfirmHostComponent` from `innoboxrr-form-elements` once in `App.vue`. Without them toasts don't show and confirmations fall back to `window.confirm`.

::: tip In the base application
The base app loads its own module, `resources/<ui>/index.js`, not package modules. Mounting a package's module means editing `resources/<ui>/app/`, which is your code from installation onwards.
:::
