# routes-to-json

`innoboxrr/routes-to-json` **2.1.0** exports Laravel's named routes to a JSON file the frontend reads. The frontend then resolves every URL the way Blade does: by name, not by a hand-typed string.

A hand-typed URL breaks silently. You rename a route, the backend tests pass, and a button in the SPA quietly returns 404 in production. With the name on both sides, the rename shows up when `routes.json` is regenerated.

```bash
php artisan route:json
```

```json
{
    "auth.login": "auth/login",
    "api.laravel-options.option.index": "api/laravel-options/option/index",
    "lu.upload.display": "lu/upload/{upload_uuid}/display/{filename?}"
}
```

In the frontend, [innoboxrr-route-resolver](/en/ui/http-routes-i18n) resolves them:

```js
import route, { setRoutes } from 'innoboxrr-route-resolver'
import routes from './routes.json'

setRoutes(routes)

route('api.laravel-options.option.index', { paginate: 0 })
```

## Install

```bash
composer require innoboxrr/routes-to-json
```

It requires PHP `^8.3` and `illuminate/support ^13.0`. The provider is auto-discovered.

## Configuration

| Key | Default | What it decides |
|---|---|---|
| `path` | `env('JSON_ROUTES_FILE', resource_path('vue/assets/json/routes.json'))` | Where the JSON is written |

- **Directory.** It is created if it doesn't exist.
- **Relative paths.** They resolve against the project root (`base_path()`), not the working directory, so this also works from `Artisan::call` inside a request or a queued job.
- **An empty `JSON_ROUTES_FILE=`** falls back to the default path.

## Environment variables

| Variable | Default | Use |
|---|---|---|
| `JSON_ROUTES_FILE` | `resources/vue/assets/json/routes.json` | `path` |

## Publishing

| Tag | What it copies |
|---|---|
| `config` | `config/routes-to-json.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\RoutesToJson\Providers\RoutesToJsonServiceProvider" --tag=config
```

## Migrations

It ships no migrations.

## Commands

| Command | Options | What it does |
|---|---|---|
| `route:json` | — | Writes `{ name: uri }` for every route that has a name, as indented JSON. Unnamed routes are skipped |

- **No leading slash.** URIs come out as Laravel stores them, without a leading `/`.
- **Parameters.** They appear in braces, with `?` on optional ones.
- **Not included:** the HTTP method and the domain.

::: tip The command is route:json
The `innoboxrr-route-resolver` README calls it `routes:json`. That command doesn't exist; it's `route:json`.
:::

## HTTP routes

It registers no routes.

## Policies and gates

It defines no policies or abilities.

## Extension points

Only `path`. To keep the file current, regenerate it before building the frontend:

```json
{
    "scripts": {
        "build": "php artisan route:json && vite build"
    }
}
```

## In the base application

- **File path.** `app:setup` writes its own `config/routes-to-json.php`, pointing at the file the interface imports:

  ```php
  'path' => env('JSON_ROUTES_FILE', resource_path('vue/routes.json')), // or react/routes.json
  ```

- **Initial file.** The stubs ship `resources/<ui>/routes.json` as a placeholder, and `app:install` runs `route:json` to write the real one.
- **Boot.** The interface calls `setRoutes(routes)` and asks for every URL with `route('name')`:
  - laravel-auth, laravel-options, laravel-notifications and laravel-uploads routes;
  - the generated user's routes (`api.app.user.*`);
  - the routes of every model you generate.

  In Vue, asking for a missing name throws `Unknown backend route "x". Run php artisan route:json.`
- **Build.** The base application's `npm run build` is just `vite build`; it does **not** run `route:json`. After `larapack:import`, or after adding routes, run it yourself before building.

::: warning Two different default paths
The package writes to `resources/vue/assets/json/routes.json` by default, and its README suggests `resources/react/assets/json/routes.json` for React. The base application reads `resources/vue/routes.json` or `resources/react/routes.json`. If you delete the `config/routes-to-json.php` that `app:setup` left, `route:json` goes back to the package path and the interface keeps reading a stale file.
:::

See [Requests, routes and languages](/en/ui/http-routes-i18n).

## Upgrading

### From 2.0 to 2.1

- **Unnamed routes no longer appear in the JSON.** Before, they all landed under the `""` key and overwrote each other.
- **A relative output path resolves against the project root.**
- **An empty `JSON_ROUTES_FILE=` uses the default path.** Before, the command used a different one (`resources/json/routes.json`) and failed to write.

The command, the `path` key, the variable and the tag are unchanged. The only visible change in the JSON is that the `""` key disappears.

## Pitfalls

- **"Unknown backend route", or a request that goes to the current page.** The file predates the route: run `php artisan route:json` and rebuild.
- **The frontend keeps reading old routes.** `route:json` writes somewhere other than where the interface imports from; check `routes-to-json.path`.
- **You changed `JSON_ROUTES_FILE` and nothing happened.** The configuration is cached: run `php artisan config:clear`.
- **A route is missing.** It has no name. For example, laravel-env-editor's `PATCH` and `DELETE` `key` routes have none.
- **`routes.json` isn't a secret, but it is a map.** It ships inside the built frontend and lists every named route in the application, admin ones included. Each route's middleware is what protects it, not obscurity.
