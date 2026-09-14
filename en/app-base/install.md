# Install the base application

Installation takes two commands on purpose. `app:setup` **writes** files and installs nothing, so you can review with `git diff` what changed. `app:install` **installs**: dependencies, tables, the example site and the compiled interface. `app:init` does both in a row.

## Requirements

- PHP 8.3 or newer and Composer.
- Node 20 or newer and npm 10.
- A **fresh** Laravel 13 application created with `laravel new` or `composer create-project laravel/laravel`, with its database configured in `.env`.

::: warning `APP_URL` must be the address you open the application with
Include the port. The admin panel calls the API with the session cookie, and Sanctum only accepts it from the domains in `SANCTUM_STATEFUL_DOMAINS`: by default `localhost`, `127.0.0.1:8000` and the `APP_URL` host. With any other address, login works but every admin table answers 401 and sends you back to login.
:::

## In short

::: code-group

```bash [Vue]
composer create-project laravel/laravel my-app
cd my-app
# Configure the database and APP_URL in .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup
git status && git diff

# Put your email in ADMIN_EMAILS, in .env
php artisan app:install
composer run dev
```

```bash [React]
composer create-project laravel/laravel my-app
cd my-app
# Configure the database and APP_URL in .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup --react
git status && git diff

# Put your email in ADMIN_EMAILS, in .env
php artisan app:install
composer run dev
```

:::

Register at `/auth/register` with an email listed in `ADMIN_EMAILS` and open `/admin`.

## `app:setup`

```bash
php artisan app:setup [--react] [--force]
```

| Option | What it does |
|---|---|
| `--react` | Builds the interface in React. Without it, Vue. |
| `--force` | Configures even if the application does not look fresh. |

### When it refuses

`app:setup` replaces files that an application in use will already have changed, so it only runs on an application that looks new. That means all four of these hold:

- `resources/views/welcome.blade.php` exists;
- there is no `laraimport.json` at the root;
- `resources/vue/app` does not exist;
- `resources/react/app` does not exist.

Otherwise it fails with "La aplicación ya no parece recién creada…" (the application no longer looks freshly created).

### The seven tasks

They run in this order. Each one shows as a progress line.

#### 1. Composer dependencies

Edits `composer.json` without installing anything:

- Removes `lab404/laravel-impersonate` from `require` and `require-dev`.
- Adds or upgrades in `require` the list from [What it includes](/en/app-base/): laravel-auth `^6.1.0`, laravel-options, laravel-notifications, laravel-uploads, laravel-env-editor, laravel-audit, aws-file-manager, locale-generator, routes-to-json, search-surge, support, traits, `laravel/sanctum ^4.3`, `maatwebsite/excel ^4.0`, `opcodesio/log-viewer ^3.24`, `league/flysystem-aws-s3-v3 ^3.0`, `algolia/scout-extended ^5.0`, `google/recaptcha ^1.3` and the two staudenmeir packages.
- Adds `innoboxrr/larapack-generator ^7.10.2` to `require-dev`.

A dependency already present with another version is replaced; if it was in the other section, it is moved. The sections are sorted as with `sort-packages`: `php` first, then `ext-*`, then by name. The file is rewritten with four-space indentation.

#### 2. Environment variables

Edits `.env.example` and `.env`, each one if it exists. There are two groups:

| Key | Value | When |
|---|---|---|
| `APP_LOCALE` | `es` | **Always**, even if it had another value |
| `APP_FALLBACK_LOCALE` | `en` | **Always** |
| `APP_FAKER_LOCALE` | `es_MX` | **Always** |
| `SESSION_DRIVER` | `database` | **Always** |
| `ADMIN_EMAILS` | empty | Only if missing |
| `LARAVEL_UPLOADS_DISK` | `public` | Only if missing |
| `LARAVEL_OPTIONS_EXPORT_DISK` | `local` | Only if missing |
| `LARAVEL_AUDIT_EXPORT_DISK` | `local` | Only if missing |
| `VITE_APP_NAME` | `${APP_NAME}` | Only if missing |
| `VITE_GOOGLE_LOGIN` | `false` | Only if missing |
| `VITE_FACEBOOK_LOGIN` | `false` | Only if missing |
| `VITE_MICROSOFT_LOGIN` | `false` | Only if missing |

A value with spaces, `#` or quotes is written in double quotes, and a reference like `${APP_NAME}` is left as is.

::: tip Want the interface in English?
`APP_LOCALE=es` is forced. Change it back to `en` after `app:setup`: the interface keys are English, so English needs no translation file.
:::

::: warning Nobody reads the `VITE_*` variables
Neither interface reads any `VITE_*` variable. The three social login variables are written, but **social login is not wired in the interfaces**: there are no buttons or screens. See [Authentication and users](/en/app-base/auth).
:::

#### 3. Admins in `config/auth.php`

Adds, at the end of the array, the key that `isAdmin()` reads in the generated user:

```php
'admins' => array_values(array_filter(array_map('trim', explode(',', (string) env('ADMIN_EMAILS', ''))))),
```

If the file already contains the text `'admins'` anywhere, it is left alone.

#### 4. Backend

Copies `stubs/app/common` over the application root, **overwriting** whatever exists: `bootstrap/app.php`, `bootstrap/providers.php`, `routes/web.php`, `app/Providers/AppServiceProvider.php`, `app/Http/Middleware/EnsureUserIsAdmin.php`, `config/env-editor.php`, the `0001_01_01_000010_add_payload_and_soft_deletes_to_users_table.php` migration, `database/seeders/SiteOptionsSeeder.php` and `laraimport.json`. What each one does is in [What it includes](/en/app-base/).

Then it **deletes** `resources/views/welcome.blade.php`, `resources/js/` and `resources/css/`.

#### 5. Interface

Copies `stubs/app/vue` or `stubs/app/react` over the root, overwriting: `package.json`, `vite.config.js`, `resources/views/app.blade.php`, `resources/<ui>/app/**`, and a placeholder `resources/<ui>/routes.json` that `php artisan route:json` rewrites.

#### 6. Routes for the front end

Writes `config/routes-to-json.php` so `route:json` puts the routes where the interface reads them:

```php
return [
    'path' => env('JSON_ROUTES_FILE', resource_path('vue/routes.json')), // or react/routes.json
];
```

#### 7. Users, with LaraPack

1. Deletes `app/Models/User.php`.
2. Runs `larapack:import laraimport.json --vue` (or `--react`) with `--root` set to the application. It generates the `User` model with `authenticatable`, its API, policies, factory, tests, and the interface module in `resources/<ui>/index.js` and `resources/<ui>/src/`.
3. Runs `larapack:route-service-provider` and `larapack:event-service-provider`, which `bootstrap/providers.php` already registers.
4. Copies `stubs/app/overrides`: an `app/Policies/UserPolicy.php` that lets each person view and edit their own account. The policy LaraPack generates is closed by default, and the profile screen would not work.

If LaraPack fails, `app:setup` stops with "`<command>` terminó con error:" followed by LaraPack's output, instead of reporting success.

When it finishes it prints: "Listo. Revisa los cambios y ejecuta: php artisan app:install" (done, review the changes and run `app:install`).

### What it replaces, deletes and generates

| Effect | Files |
|---|---|
| Modifies | `composer.json`, `.env`, `.env.example`, `config/auth.php` |
| Overwrites | `bootstrap/app.php`, `bootstrap/providers.php`, `routes/web.php`, `app/Providers/AppServiceProvider.php`, `app/Http/Middleware/EnsureUserIsAdmin.php`, `config/env-editor.php`, `config/routes-to-json.php`, `database/seeders/SiteOptionsSeeder.php`, `laraimport.json`, `package.json`, `vite.config.js`, `resources/views/app.blade.php`, `resources/<ui>/app/**`, `resources/<ui>/routes.json`, `app/Policies/UserPolicy.php` |
| Deletes | `resources/views/welcome.blade.php`, `resources/js/`, `resources/css/`, `app/Models/User.php` |
| Generates (LaraPack) | `app/Models/User.php` and the rest of the user's files, its routes in `routes/api/models/`, `RouteServiceProvider`, `EventServiceProvider`, `resources/<ui>/index.js`, `resources/<ui>/src/**`, `.larapack/manifest.json` |

::: danger `--force` on an application in use
The copies overwrite without asking. Running `--force` on an application you have worked on loses your `laraimport.json` (it goes back to only the user), your changes in `resources/<ui>/app`, the seeder, the middleware and the `bootstrap/` files, and `app/Models/User.php` is deleted and regenerated. Use `--force` only to repeat the installation on a new application, with everything committed to git.
:::

## Review and name the admins

```bash
git status
git diff
```

Then put the emails of the people who administer in `.env`, separated by commas. The comparison is case-insensitive:

```ini
ADMIN_EMAILS=you@example.com,someone@example.com
```

What being an admin changes is in [Authentication and users](/en/app-base/auth).

## `app:install`

```bash
php artisan app:install [--pretend] [--without-build] [--composer=composer] [--npm=npm]
```

| Option | Default | What it does |
|---|---|---|
| `--pretend` | — | Prints each step as `label: command` and runs nothing. |
| `--without-build` | — | Skips `npm install` and `npm run build`. |
| `--composer` | `composer` | The Composer executable. If it ends in `.phar`, it is run with the same PHP binary that runs artisan. |
| `--npm` | `npm` | The npm executable; called with `install` and with `run build`. |

The steps, in order (labels as printed):

| # | Label | Command |
|---|---|---|
| 1 | Dependencias de Composer | `composer update --no-interaction` |
| 2 | Tabla de tokens de Sanctum | `php artisan vendor:publish --tag=sanctum-migrations` |
| 3 | Tabla de notificaciones | `php artisan notifications:install` |
| 4 | Base de datos | `php artisan migrate --force` |
| 5 | Sitio de ejemplo | `php artisan db:seed --class=Database\Seeders\SiteOptionsSeeder --force` |
| 6 | Enlace público del almacenamiento | `php artisan storage:link` |
| 7 | Rutas para la interfaz | `php artisan route:json` |
| 8 | Dependencias de npm | `npm install` |
| 9 | Compilación de la interfaz | `npm run build` |

Worth knowing:

- **It is `composer update`, not `composer install`.** `app:setup` changed the constraints in `composer.json`, so `composer.lock` has to be resolved again.
- **Each step is a separate process.** After `composer update`, the new packages' providers only exist for a freshly started artisan.
- **It stops at the first failure** with "Falló «label»: command" and exits with an error. Earlier steps stay done.
- It has no time limit. Outside Windows it uses a TTY if the terminal supports one.
- **It does not run `install:api`.** The base application does not use `routes/api.php`. The SPA uses the session through `statefulApi()`, LaraPack's `RouteServiceProvider` loads the API routes, and Sanctum's token table comes from step 2.

::: tip Composer on Windows
If the `composer` on your PATH runs on a PHP older than 8.3, as Laragon's does, it cannot resolve packages that need PHP 8.3. Pass a `composer.phar` instead: it runs with the PHP of `php artisan`.

```bash
php artisan app:install --composer=C:/path/to/composer.phar
```
:::

When it finishes: "La aplicación está lista. Regístrate con un correo de ADMIN_EMAILS para entrar al administrador." (the application is ready; register with an `ADMIN_EMAILS` address to open the admin panel).

```bash
composer run dev
```

## `app:init`

`app:setup` and `app:install` in one go, for anyone who does not need to review the changes before installing.

```bash
php artisan app:init [domain] [--react] [--force] [--without-build]
```

| Argument or option | What it does |
|---|---|
| `domain` | Optional. After installing, calls `configure:domain` with it. Read its warnings below first. |
| `--react` | Passed to `app:setup`. |
| `--force` | Passed to `app:setup`. |
| `--without-build` | Passed to `app:install`. |

If a step exits with an error, `app:init` stops and returns that code.

::: warning `app:init` does not accept `--composer` or `--npm`
`app:install` always runs with the `composer` and `npm` on your PATH. If you need a `composer.phar`, run `app:setup` and `app:install --composer=…` separately.
:::

## `configure:domain`

```bash
php artisan configure:domain my-app.test
```

::: danger Not recommended
This is a legacy command, only for **Windows with Laragon installed at `C:\laragon`**, and the configuration it writes is not secure. Set up the domain with your environment's own tools and set `APP_URL` in `.env` by hand.
:::

What it does, in order:

1. **`hosts`.** Writes `update_hosts.bat` at the project root and runs it with `start /wait`. The `.bat` asks for administrator rights through PowerShell (`RunAs`) and appends `127.0.0.1 <domain> # Add by Laravel Setup` to `C:\Windows\System32\drivers\etc\hosts`. If the process returns 0, it deletes the `.bat`.
2. **nginx.** Writes `C:\laragon\etc\nginx\sites-enabled\<domain>.conf`: listens on 80 and on 443 with SSL, `root` at the application's `public/`, `allow 127.0.0.1; deny all;`, and the `C:/laragon/etc/ssl/laragon.crt` certificate.
3. **`.env`.** Replaces `APP_URL=` with `https://<domain>` and `SESSION_DOMAIN=` with `.<domain>`, only on lines that already exist.
4. **Restart nginx.** It only prints "Reinicia el servidor Nginx…": **it does not restart it**.

Known problems:

- The paths are hard-coded. With Laragon on another drive (for example `D:\laragon`) the nginx file cannot be written.
- `ssl_protocols TLSv1 TLSv1.1 TLSv1.2` and `ssl_ciphers ALL:!ADH:!EXPORT56:RC4+RSA:+HIGH:+MEDIUM:+LOW:+SSLv3:+EXP` allow insecure protocols and ciphers.
- Laragon's certificate is not issued for your domain, so the browser will warn.
- `allow 127.0.0.1; deny all;` only lets in local IPv4.
- The domain is not validated and is written into a `.bat` that runs with administrator rights.
- It reports success with exit code 0 even if a step failed.
- It does not touch `SANCTUM_STATEFUL_DOMAINS`. With `APP_URL` at `https://<domain>`, Sanctum's default rule covers the domain, but if you set that variable by hand you will have to add it.

## Environment variables that matter

| Key | Read by | What it decides |
|---|---|---|
| `APP_URL` | Laravel and Sanctum | The address the session is valid for. It must match the browser's, port included. |
| `SANCTUM_STATEFUL_DOMAINS` | Sanctum | Domains the SPA can use the cookie from. If unset, the default list applies, which includes the `APP_URL` host. |
| `SESSION_DOMAIN` | Laravel | The session cookie domain. |
| `SESSION_DRIVER` | Laravel | `app:setup` sets it to `database`. |
| `APP_LOCALE` | Laravel and the interface | `app:setup` sets it to `es`. It becomes the `<html>` `lang` and therefore the interface language. |
| `ADMIN_EMAILS` | `config('auth.admins')` | Who administers. |
| `LARAVEL_UPLOADS_DISK` | laravel-uploads | The uploads disk. The package defaults to `s3`; the base application sets `public`. |
| `LARAVEL_OPTIONS_EXPORT_DISK`, `LARAVEL_AUDIT_EXPORT_DISK` | laravel-options, laravel-audit | Disk for their exports. |
| `ENV_EDITOR_ENABLED` | `config/env-editor.php` | Whether the `.env` editor exists at `/env-editor`. Defaults to `true`. |
| `JSON_ROUTES_FILE` | `config/routes-to-json.php` | Another path for `routes.json`. If you change it, the interface must import it from there. |
| `VITE_APP_NAME`, `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN`, `VITE_MICROSOFT_LOGIN` | Nobody | Written, but the interfaces do not read them. |

## Common problems

**You log in, but every table answers 401 and you are back at login.** The browser is not on the `APP_URL` address (host or port), or `SANCTUM_STATEFUL_DOMAINS` or `SESSION_DOMAIN` do not cover it. The Vue interface detects this after login and says "You signed in, but the session was not kept. Check the session and Sanctum domains."; the React one goes back to login.

**Two applications log each other out.** Cookies on `127.0.0.1` are shared across ports. Serve the second one on `localhost`.

**"La aplicación ya no parece recién creada".** If `app:setup` failed halfway, it has already deleted `welcome.blade.php`. Fix the cause and repeat with `--force` on the same new application.

**"larapack:import terminó con error:".** What follows is LaraPack's output. It is usually `laraimport.json`: validate it with `php artisan larapack:validate laraimport.json --vue` (or `--react`). See [LaraPack commands](/en/larapack/commands).

**"Unknown backend route "…". Run php artisan route:json."** (Vue). The route is not in `routes.json`. Run `php artisan route:json` after adding or generating endpoints, and rebuild.

**The "Administration" group does not show.** `ADMIN_EMAILS` does not include your email, or the configuration is cached (`php artisan config:clear`). The interface reads the session at boot: reload the page.

**Generated models' labels show in English.** By design: LaraPack leaves its Spanish translations empty. Translate them as explained in [The admin panel](/en/app-base/admin).

**An application created with laravel-setup 6.x.** There is no automatic migration: version 7 is for new applications.
