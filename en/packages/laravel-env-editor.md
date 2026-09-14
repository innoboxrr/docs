# laravel-env-editor

`innoboxrr/laravel-env-editor` **2.1.1** lets you edit the application's `.env` without logging into the server. You can add, change and delete keys, upload another `.env`, and create or restore backups. It works from a web UI or through the `EnvEditor` facade, without breaking the file's structure.

::: warning Whoever reaches this controls the application
The editor reads and rewrites the whole `.env`, including `APP_KEY` and every credential. Only enable it behind an admin check.
:::

## Install

```bash
composer require innoboxrr/laravel-env-editor
php artisan vendor:publish --provider="Innoboxrr\EnvEditor\ServiceProvider" --tag=config
```

It requires PHP `^8.3` and `laravel/framework ^13.0`. The provider and the `EnvEditor` alias are auto-discovered. The UI ships **disabled**; enable it in `config/env-editor.php`.

## Configuration

`config/env-editor.php`:

| Key | Default | What it decides |
|---|---|---|
| `paths.backupDirectory` | `storage_path('env-editor')` | Where `.env` backups are stored |
| `route.enable` | `false` | Register the UI routes |
| `route.prefix` | `env-editor` | URI prefix |
| `route.name` | `env-editor` | Route name prefix |
| `route.middleware` | `['web', 'auth']` | Group middleware. `auth` is the minimum; add your own admin check |
| `route.gate` | `null` | Ability required on every action, on top of the middleware |
| `timeFormat` | `d/m/Y H:i:s` | Date format in the UI and backups |
| `layout` | `env-editor::layout` | The view `index.blade.php` extends |

```php
'route' => [
    'enable' => true,
    'middleware' => ['web', 'auth', 'admin'],
    'gate' => 'manage-env',
],
```

## Environment variables

The package reads no environment variables.

::: tip ENV_EDITOR_ENABLED belongs to the base application
`ENV_EDITOR_ENABLED` doesn't exist in the package or its README. It is defined by the `config/env-editor.php` that laravel-setup copies, as `'enable' => env('ENV_EDITOR_ENABLED', true)`.
:::

## Publishing

All three tags are generic, so always pass `--provider="Innoboxrr\EnvEditor\ServiceProvider"`.

| Tag | What it copies |
|---|---|
| `config` | `config/env-editor.php` |
| `views` | `resources/views/vendor/env-editor` |
| `translations` | `resources/lang/vendor/env-editor` |

## Migrations

It ships no migrations.

## Commands

It registers no commands. Saving the `.env` schedules the `OptimizeApplication` job (`php artisan optimize`) one minute later, **only when the configuration is cached**. Without a config cache, new values are read on the next request.

## HTTP routes

They only exist when `route.enable` is `true`. They live under `/env-editor`, with the `route.middleware` middleware and `env-editor.*` names.

| Method | URI | Name | Fields | Response |
|---|---|---|---|---|
| GET | `/env-editor` | `env-editor.index` | — | The UI, or `{ items, success }` with JSON |
| POST | `/env-editor/key` | `env-editor.key` | `key`, `value`, and optionally `index` or `group` to position it | `{ message, success }` |
| PATCH | `/env-editor/key` | — | `key`, `value` | `{ message, success }` |
| DELETE | `/env-editor/key` | — | `key` | `{ message, success }` |
| DELETE | `/env-editor/clear-cache` | `env-editor.clearConfigCache` | — | Runs `config:clear`; `{ message, success }` |
| GET | `/env-editor/files` | `env-editor.getBackups` | — | The UI, or `{ items, success }` with JSON |
| POST | `/env-editor/files/create-backup` | `env-editor.createBackup` | — | `{ message, success }` |
| POST | `/env-editor/files/restore-backup/{filename?}` | `env-editor.restoreBackup` | — | `{ message, success }` |
| DELETE | `/env-editor/files/destroy-backup/{filename?}` | `env-editor.destroyBackup` | — | `{ message, success }` |
| GET | `/env-editor/files/download/{filename?}` | `env-editor.download` | — | Downloads the backup, or the current `.env` when no name is given |
| POST | `/env-editor/files/upload` | `env-editor.upload` | `file` (text), `replace_current` (boolean) | Stores it as a backup, or replaces the `.env` |

- **Errors.** Responses are 200 with `success: true`, or 400 with `success: false`. An editor error on a JSON request comes back as 400 with `{ message, success: false }`.
- **Backup names.** A name that escapes the backup directory is rejected. Without a name, `restore-backup` and `destroy-backup` answer 400.
- **Unnamed routes.** The `PATCH` and `DELETE` `key` routes have no name, so they don't appear in `routes.json`.

## Policies and gates

It defines no policies. With `route.gate` set, the controller requires `can:<ability>` on every action, after the middleware: a guest gets 401 (or the redirect to login) and a user without the ability gets 403.

```php
// App\Providers\AppServiceProvider::boot()
Gate::define('manage-env', fn (User $user): bool => $user->isAdmin());
```

## Extension points

The `Innoboxrr\EnvEditor\Facades\EnvEditor` facade:

```php
EnvEditor::getEnvFileContent($fileName = '');   // Collection; with a name, reads that backup
EnvEditor::keyExists($key);
EnvEditor::getKey($key, $default = null);
EnvEditor::addKey($key, $value, ['index' => 3]); // or ['group' => 'MAIL']
EnvEditor::editKey($key, $value);
EnvEditor::deleteKey($key);
EnvEditor::getAllBackUps();                      // Collection with date and content
EnvEditor::upload($uploadedFile, $replaceCurrentEnv);
EnvEditor::backUpCurrent();
EnvEditor::getFilePath($fileName = '');          // without a name, the .env path
EnvEditor::deleteBackup($fileName);
EnvEditor::restoreBackUp($fileName);
```

To change the look, publish `views` or point `layout` at your own view.

## In the base application

- **Configuration.** `app:setup` copies its own `config/env-editor.php`:

  ```php
  'route' => [
      'enable' => env('ENV_EDITOR_ENABLED', true),
      'prefix' => 'env-editor',
      'name' => 'env-editor',
      'middleware' => ['web', 'auth', 'admin'],
      'gate' => null,
  ],
  ```

  The `admin` alias is `EnsureUserIsAdmin`, which requires `isAdmin()`. On the generated user, that means being listed in `ADMIN_EMAILS`.
- **Guests.** `bootstrap/app.php` redirects them to `/auth/login`, so the "Route [login] not defined" error never shows up.
- **Menu.** The "Administration" group links to `/env-editor` as "Environment" (`t('Environment')`), in a new tab:
  - in Vue the link is hardcoded in `resources/vue/app/router/menu.js`;
  - in React it lives in `adminTools` in `resources/react/app/config.js`.

To turn it off in production, set `ENV_EDITOR_ENABLED=false` and remove the menu link. The link ignores that variable and would lead to a page that no longer exists.

See [The admin panel](/en/app-base/admin).

## Upgrading

### From 2.0 to 2.1

- **`route.middleware` changes from `['web']` to `['web', 'auth']`.** A configuration published earlier keeps `['web']`, so add `auth` and your admin check by hand.
- **New `route.gate` option**, `null` by default.
- **Safer backups.** Backup names containing `..` are rejected, and `restore-backup` and `destroy-backup` without a name answer 400 instead of 500.
- **Editor errors come back as JSON.**
- **`optimize` is only scheduled** when the configuration is cached.
- **UI assets.** It loads Font Awesome Free 5.15.4 and the production build of Vue 2.7.16.

URIs, route names, the other keys, the tags and the facade are unchanged.

### From 2.1.0 to 2.1.1

Font Awesome and Vue load with `integrity`, like Bootstrap and jQuery.

## Pitfalls

- **Any signed-in user gets in.** Your admin check is missing from `route.middleware`, or the published configuration predates 2.1.0 and only has `['web']`.
- **"Route [login] not defined".** A guest reached an application with no `login` route. Define `redirectGuestsTo()` in `bootstrap/app.php`.
- **You saved a value and the application still uses the old one.** The configuration is cached and `optimize` hasn't run yet. Wait for the job, or use "clear cache".
- **Saving fails.** The web server user can't write the `.env` or `storage/env-editor`.
- **The UI has no styling.** It loads Bootstrap, jQuery, Font Awesome and Vue from a CDN, and the browser can't reach them or a CSP blocks them.
- **Backups contain secrets.** `storage/env-editor` holds full copies of the `.env`. Don't expose it or commit it.
