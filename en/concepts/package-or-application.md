# Package or application

LaraPack generates the same architecture in two places: inside a Composer **package** or directly inside a Laravel **application**. Models, policies, requests and the interface module are the same. What changes is where they go, how their routes are named, who registers the providers, and how the interface is built.

## How it decides

By the `type` field of the root `composer.json`:

| `type` | Mode |
|---|---|
| `library`, or no `type` | Package: writes to `src/` |
| Any other value; in Laravel, `project` | Application: writes to `app/` |

The namespace comes from `autoload.psr-4`: the entry pointing at `src/` in a package, or at `app/` in an application (`App\`).

There's no option to force a mode: if LaraPack writes somewhere unexpected, check `type`.

## The differences

| Aspect | Package | Application |
|---|---|---|
| Code | `src/`, under the package namespace | `app/`, under `App\` |
| Routes file | `routes/api/models/<snake>.php` | `routes/api/models/<snake>.php` |
| URL | `api/<namespace>/<snake>/...`, e.g. `api/acme/catalog/order_line/index` | `api/app/<snake>/...`, e.g. `api/app/order_line/index` |
| Route names | `api.acme.catalog.order_line.*` | `api.app.order_line.*` |
| Providers | In `composer.json` `extra.laravel.providers`: Laravel discovers them | **Must be added to `bootstrap/providers.php`** |
| Factories | Package namespace | `Database\Factories` |
| Tests | Testbench `TestCase` plus its own `tests/User.php` | `Tests\Feature\Models`, with the app's `tests/TestCase.php`; they sign in using the factory of the `auth.providers.users.model` model |
| Interface module | `resources/vue` or `resources/react`, with its own `package.json` and `vite.config.js` | `resources/<ui>/index.js` and `resources/<ui>/src/`, no `package.json` |
| Module npm name | `vendor-package` (Vue) and `vendor-package-react` (React) | Not published |
| Module npm dependencies | Declared by its `package.json` | Declared by the application's `package.json` |
| Export configuration | The package config file, e.g. `config/acmecatalog.php` | `config/larapack.php`, created by `larapack:config` |
| Excel views | Under the package view namespace | No namespace: `excel.<model>`, in `resources/views/excel` |
| Create migrations LaraPack didn't write | — | Skipped: not compared, not altered |

## Routes

The generated `RouteServiceProvider` mounts each file in `routes/api/models/` with the namespace in the prefix. For `Acme\Catalog` and for `App\`:

::: code-group

```php [Package]
Route::middleware('api')
    ->prefix('api/acme/catalog/' . $name)
    ->as('api.acme.catalog.' . $name . '.')
    ->group($file);
```

```php [Application]
Route::middleware('api')
    ->prefix('api/app/' . $name)
    ->as('api.app.' . $name . '.')
    ->group($file);
```

:::

`$name` is the file name, the model in snake_case: `OrderLine` goes to `order_line.php`. The JS contract's `API_ROUTE_PREFIX` rebuilds that same prefix, and `larapack:verify` checks they match.

## Providers

::: code-group

```json [Package: composer.json]
{
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\Catalog\\Providers\\AppServiceProvider",
                "Acme\\Catalog\\Providers\\AuthServiceProvider",
                "Acme\\Catalog\\Providers\\EventServiceProvider",
                "Acme\\Catalog\\Providers\\RouteServiceProvider"
            ]
        }
    }
}
```

```php [Application: bootstrap/providers.php]
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\EventServiceProvider::class,
    App\Providers\RouteServiceProvider::class,
];
```

:::

In a package, `larapack:new` or `larapack:providers` lists them, and the application that installs the package discovers them. In an application, `larapack:route-service-provider` and `larapack:event-service-provider` create them, but **Laravel doesn't discover providers from an application's `composer.json`**: you have to register them. Without the route provider no generated endpoint exists; without the event provider, exports never notify.

The base application ships with both registered.

## The interface module

**In a package** the module is its own npm package. It's published, and the application installs it and mounts it by hand: loads its translations, mounts its routes under `/admin`, and installs the plugin (Vue) or registers its routes (React). See [Using it from an application](/en/getting-started/new-package#using-it-from-an-application).

```
packages/catalog/
  composer.json                → acme/catalog                (Composer)
  resources/vue/package.json   → acme-catalog                (npm)
  resources/react/package.json → acme-catalog-react          (npm)
```

**In an application** the module isn't published: the application's Vite builds it. LaraPack doesn't write a `package.json` or `vite.config.js` inside `resources/`, and your `package.json` must declare the module's dependencies (the innoboxrr UI packages, the router and the store). The base application already declares them and loads the module on its own.

## Exports

| | Package | Application |
|---|---|---|
| Configuration | The package's, e.g. `config/acmecatalog.php` for `Acme\Catalog` | `config/larapack.php` |
| Keys the export reads | `excel_view`, `notification_via`, `export_disk` (plus `user_class`) | `larapack.excel_view`, `larapack.notification_via`, `larapack.export_disk` |
| Default | Email and the `local` disk | Email and the `local` disk, even without the file |

In an application, `larapack:config` creates `config/larapack.php` and never writes to `config/app.php`, which belongs to Laravel. To also notify through the database, create the notifications table with `php artisan make:notifications-table` and add `database` to `notification_via`.

## Migrations

In both modes, when re-importing, LaraPack compares the JSON columns with the table's migrations and writes `<date>_alter_<table>_table.php` with the changes.

In an application there's one more case: **a create migration LaraPack didn't write is skipped**. Laravel's own `users` migration is the typical example: it isn't compared with the laraimport and no alter migrations are written against it. If that table needs more columns, write the migration yourself. The base application already ships one that adds `payload` and soft deletes to `users`.

## Which one to choose

| Choose a package if… | Choose the application if… |
|---|---|
| The feature will be used by more than one application. | The domain belongs to this application and no other. |
| You want to publish and version it separately, with its own CI and `CHANGELOG`. | You want to generate and see the result without publishing anything. |
| Another team maintains it. | It's the base application with your models. |

A package costs more up front: its own repository, CI, releases, and wiring into each application. In exchange, each application upgrades it with Composer and npm.

LaraPack has no command to move models from an application into a package. If you need to, create the package with [`larapack:new`](/en/getting-started/new-package), move those models' declarations into its `laraimport.json`, generate there, and move your logic into the package's slots.
