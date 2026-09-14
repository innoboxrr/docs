# laravel-options

`innoboxrr/laravel-options` **2.1.0** stores the settings that belong to the business rather than to the deployment in the database: the site name, its description, the layout of its pages. Credentials and API keys belong in `.env`. What an admin decides shouldn't need a deploy to change.

Options are read without a session, because the public site needs them before anyone signs in. That is why `index` and `show` are **public**.

::: warning Never store secrets in an option
Anyone can list every option with `GET /api/laravel-options/option/index?paginate=0`. API keys, tokens, passwords and credentials belong in `.env`.
:::

## Install

```bash
composer require innoboxrr/laravel-options
php artisan migrate
php artisan options:seed
```

It requires PHP `^8.3`, `illuminate/support ^13.0`, `innoboxrr/search-surge ^3.0` and `innoboxrr/traits ^2.1`. The application also needs:

- **Sanctum** (suggested). Write routes use `auth:sanctum`, so the application needs it.
- **`maatwebsite/excel`** (suggested, `^3.1 || ^4.0`). Only needed to export.
- **`isAdmin()` on the user.** Whoever writes options is an admin.

## Configuration

`config/laravel-options.php`:

| Key | Default | What it decides |
|---|---|---|
| `export_disk` | `env('LARAVEL_OPTIONS_EXPORT_DISK', 'local')` | Disk where the exported `.xlsx` is stored |
| `notification_via` | `['mail']` | Channels for the export notice. `database` needs the `notifications` table |
| `excel_view` | `laravel-options::excel.` | Prefix of the export view |
| `user_class` | `App\Models\User` | Not used by the package |

## Environment variables

| Variable | Default | Use |
|---|---|---|
| `LARAVEL_OPTIONS_EXPORT_DISK` | `local` | `export_disk` |

## Publishing

All three tags are generic, so always pass the provider.

| Tag | What it copies |
|---|---|
| `config` | `config/laravel-options.php` |
| `views` | `resources/views/vendor/laravel-options` (the Excel view) |
| `vue` | `resources/vue/vendor/laravel-options`: a `models/option.js` and a **Vuex** store |

```bash
php artisan vendor:publish --provider="Innoboxrr\LaravelOptions\Providers\AppServiceProvider" --tag=config
```

::: warning The vue tag belongs to the old interface
`--tag=vue` publishes a Vuex store, and the ecosystem's interfaces no longer use Vuex. The base application ships its own options store in Pinia (Vue) and Zustand (React). Don't publish it in a new application.
:::

## Migrations

They load from the package; you don't need to publish them.

| Table | Columns |
|---|---|
| `options` | `id`, `name` (nullable), `key` (unique), `value` (text, nullable), `created_at`, `updated_at`, `deleted_at` |

Deletion is soft, so `key` must also be unique among deleted options.

## Commands

| Command | Options | What it does |
|---|---|---|
| `options:seed` | — | Creates `site_name`, `site_description` and `theme` **only if they don't exist**, including among deleted options. It leaves values changed from the admin panel alone and never revives a deleted option. It runs with `--force`, so it also seeds in production |

## Reading options in PHP

```php
use Innoboxrr\LaravelOptions\Models\Option;

Option::value('site_name');            // 'Mi Sitio'
Option::value('theme');                // ['home' => [...]]: JSON objects and arrays come back decoded
Option::value('banner', 'hidden');     // the default when the key is missing, deleted or null
```

Values are stored as text. `Option::value()` decodes JSON objects and arrays and returns anything else as stored, so `"2024"` or `"true"` stay strings. There is no cache: every call is a query.

## HTTP routes

All routes live under `/api/laravel-options/option/`, in the `api` group, named `api.laravel-options.option.*`. The controller applies `auth:sanctum` to everything except `index` and `show`.

| Method | URI | Name | Who | Fields | Response |
|---|---|---|---|---|---|
| GET | `index` | `index` | Anyone | `paginate` (10 by default; `0` returns all), `page`, `orderBy`, `orderMode`, `key` (partial match) | Collection of options |
| GET | `show` | `show` | Anyone | `option_id` | One option |
| GET | `policies` | `policies` | Signed in | `id` (optional) | `{ <action>: bool, ... }` for every controller action |
| GET | `policy` | `policy` | Signed in | `policy` (`index`, `view`, `viewAny`, `create`, `update`, `delete`, `restore`, `forceDelete`, `export`), `id` (required for per-record abilities) | `{ <policy>: bool }` |
| POST | `create` | `create` | Admins | `name` (required, max 255), `key` (required, unique, max 255), `value` (text, array or empty) | The new option |
| PUT | `update` | `update` | Admins | `option_id` (required, must exist), `name` (nullable), `key` (when sent, required and unique), `value` (text, array or empty) | The option |
| DELETE | `delete` | `delete` | Admins | `option_id` | The option, soft-deleted |
| POST | `restore` | `restore` | Admins | `option_id` | The option |
| DELETE | `force-delete` | `force.delete` | Nobody, until you allow it | `option_id` | — |
| POST | `export` | `export` | Admins | The `index` filters | `{ status: true }`. 501 without `maatwebsite/excel`; 500 with `{ message }` when it fails |

- **Each option** carries `id`, `name`, `key`, `value`, the timestamps, and an `actions` array inherited from the old interface.
- **An array `value`** is stored as JSON, the same way the seeder stores it.
- **`index` is paginated by search-surge:** 10 per page and at most 1000. `paginate=0` returns the whole list, which is usually what a site wants.
- **A guest** gets 401 on writes; a user without permission gets 403.

**Exporting.** `export` builds an `.xlsx` on `export_disk`, once, even when the notice goes out through several channels. The email links to a one-day temporary URL when the disk supports it, and to the disk URL otherwise.

## Policies and gates

`OptionPolicy` is registered explicitly for `Option`:

- **`before()`** lets users whose `isAdmin()` returns `true` do everything except `forceDelete`.
- **Every ability method** returns `false`, so without being an admin nothing can be written.
- **Permanent deletion** starts switched off, for admins too.

To change it, register your own policy from the application. Application providers boot after package providers, so yours wins:

```php
Gate::policy(\Innoboxrr\LaravelOptions\Models\Option::class, \App\Policies\OptionPolicy::class);
```

## Extension points

- **Events.** Every write fires an event from `Innoboxrr\LaravelOptions\Http\Events\Option\Events`: `CreateEvent`, `UpdateEvent`, `DeleteEvent`, `RestoreEvent`, `ForceDeleteEvent` and `ExportEvent`. The per-record ones expose `$option`, `$data` and `$response`. This is where you invalidate your own cache, since `Option::value()` doesn't cache:

  ```php
  use Illuminate\Support\Facades\Cache;
  use Illuminate\Support\Facades\Event;
  use Innoboxrr\LaravelOptions\Http\Events\Option\Events\UpdateEvent;

  Event::listen(UpdateEvent::class, fn (UpdateEvent $event) => Cache::forget('option.'.$event->option->key));
  ```

- **The policy**, with `Gate::policy()` as shown above.
- **The Excel view**, by publishing `views` or changing `excel_view`.

## In the base application

- **Seeding.** `app:install` does not run `options:seed`. It runs `db:seed --class=Database\Seeders\SiteOptionsSeeder --force`. That seeder belongs to the application and creates, only when missing:
  - `site_name`, from `config('app.name')`;
  - `site_description`;
  - a complete `theme` with the site's five pages.
- **Boot.** The `options` store, in Pinia or Zustand, loads `api.laravel-options.option.index` with `paginate=0` before the router mounts. It stores each value decoded the same way `Option::value()` does. Read it with `option('site_name')` or `option('theme.home.title')`.
- **Site and editor.** The public site renders its pages from `theme`. The editor at `/admin/site`, admins only, saves `site_name`, `site_description` and `theme` with `update`, or with `create` when the option doesn't exist.
- **Save payloads differ.** Vue sends `{ option_id, value }` and React sends `{ option_id, name, key, value }`. Both are valid because `key` is only validated when present.
- **Environment.** `app:setup` adds `LARAVEL_OPTIONS_EXPORT_DISK=local`.
- **No generic options screen.** The admin panel only has the site editor.

See [The site and its editor](/en/app-base/site).

## Upgrading

### From 2.0 to 2.1

- **Configuration defaults changed:**
  - `export_disk` goes from `s3` to `env('LARAVEL_OPTIONS_EXPORT_DISK', 'local')`;
  - `notification_via` goes from `['mail', 'database']` to `['mail']`;
  - `excel_view` goes from `innoboxrrlaraveloptions::excel.` to `laravel-options::excel.`.

  A configuration you already published keeps its values, so check `export_disk` and `notification_via`.
- **`Option::value()` is now a method of its own.** Before, `Option::value('column')` reached the query builder and returned that column from the first row.
- **`options:seed` no longer restores** default values for keys that exist.
- **`OptionPolicy` is registered explicitly.** Before, an admin could get 403 on every write.
- **Dependencies moved.** `laravel/sanctum` becomes a suggestion; `innoboxrr/traits` and `innoboxrr/search-surge` move to `require`.

## Pitfalls

- **Options missing on the site.** `index` pages by 10. Ask for `paginate=0`.
- **An admin gets 403 when saving.** The user has no `isAdmin()`, it returns `false`, or the package is older than 2.1.0.
- **`force-delete` answers 403 to an admin.** That is deliberate. Allow it with your own policy.
- **`update` or `delete` without `option_id` answer 404, not 422.** The option is looked up before validation.
- **An option is `"true"` or `"10"` and you treat it as a boolean or number.** Only JSON objects and arrays are decoded.
- **`vendor:publish --tag=config` copied other packages' configuration.** Pass `--provider`.
- **The export doesn't show up in the bell.** `notification_via` is `['mail']`. Add `database` in the published configuration.
- **`php artisan migrate` failed on a new application** with `CACHE_STORE=database` before 2.1.0.
