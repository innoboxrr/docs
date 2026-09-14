# Requirements

## Software

| What | Version | Why |
|---|---|---|
| PHP | 8.3 or newer | Required by Laravel 13 and every package in the ecosystem. |
| Laravel | 13 | Generated code uses Laravel 13 features: `casts()`, `#[UsePolicy]` attributes, controllers with `HasMiddleware`. |
| Composer | 2 | |
| Node | 20.19 or newer on the 20 line, or 22.12 or newer | What Vite requires. |
| npm | 10 or newer | |
| Database | Whatever you use with Laravel | The base app stores sessions in the database (`SESSION_DRIVER=database`). |

To run tests against in-memory SQLite (a generated package's tests do), PHP needs the `pdo_sqlite` and `sqlite3` extensions. Without them tests fail with "could not find driver".

## Ecosystem versions

An application created today with the base app asks for these versions. If you assemble the ecosystem by hand, use the same ones.

::: details Composer packages
| Package | Constraint |
|---|---|
| `innoboxrr/larapack-generator` (dev) | `^7.10` |
| `innoboxrr/laravel-setup` (dev) | `^7.0` |
| `innoboxrr/laravel-auth` | `^6.1.0` |
| `innoboxrr/laravel-options` | `^2.1` |
| `innoboxrr/laravel-notifications` | `^2.1` |
| `innoboxrr/laravel-uploads` | `^2.1` |
| `innoboxrr/laravel-audit` | `^2.1` |
| `innoboxrr/laravel-env-editor` | `^2.1` |
| `innoboxrr/aws-file-manager` | `^2.0` |
| `innoboxrr/locale-generator` | `^2.1` |
| `innoboxrr/routes-to-json` | `^2.1` |
| `innoboxrr/search-surge` | `^3.0` |
| `innoboxrr/support` | `^2.1` |
| `innoboxrr/traits` | `^2.1` |
| `laravel/sanctum` | `^4.3` |
| `maatwebsite/excel` | `^4.0` |
| `opcodesio/log-viewer` | `^3.24` |
:::

::: details npm packages
| Package | Vue | React |
|---|---|---|
| Framework | `vue ^3.5` | `react ^19`, `react-dom ^19` |
| Router | `vue-router ^4.5` | `react-router-dom ^7` |
| State | `pinia ^3` | `zustand ^5` |
| Form components | `innoboxrr-form-elements ^6.7` | `innoboxrr-react-form-elements ^3.7` |
| Table | `innoboxrr-vue-datatable ^3.1` | `innoboxrr-react-datatable ^3.1` |
| Theme, toasts, icons | `innoboxrr-form-core ^2.8` | `innoboxrr-form-core ^2.8` |
| Requests | `innoboxrr-http-request ^2.0` | same |
| Named routes | `innoboxrr-route-resolver ^2.0` | same |
| Translations | `innoboxrr-i18n ^1.2` | same |
| Validation | `innoboxrr-js-validator ^2.0` | same |
| Build | `vite ^8`, `@vitejs/plugin-vue ^6` | `vite ^8`, `@vitejs/plugin-react ^6` |
:::

::: warning Install the router and the store with a version
`npm install vue-router pinia` without a version installs majors the generated module doesn't accept. Write `vue-router@4 pinia@3`, or `react-router-dom@7 zustand@5`.
:::

## `APP_URL`, Sanctum and cookies

The admin panel calls the API with Laravel's session cookie, through Sanctum. Sanctum only treats requests as session-authenticated when they come from a domain in `SANCTUM_STATEFUL_DOMAINS`. If you don't set that variable, the list is:

```
localhost, localhost:3000, 127.0.0.1, 127.0.0.1:8000, ::1, and the APP_URL host with its port
```

::: danger APP_URL must be the address you open the app with
Host **and port**. If you browse from an address that isn't on the list, login succeeds but every admin table answers 401 and sends you back to the login screen.
:::

| How you open the app | `APP_URL` |
|---|---|
| `composer run dev` or `php artisan serve` | `http://127.0.0.1:8000` |
| A local Laragon or Valet host | `http://my-app.test` |
| A different port | `http://127.0.0.1:8001`, port included |

Two more things:

- **`SESSION_DOMAIN`**: leave it `null` locally. A domain that doesn't match the one you browse means the cookie is never stored: login seems to work and the session never arrives.
- **Two apps on `127.0.0.1` with different ports share cookies** and log each other out. Open the second one on `localhost`.

## Mail

Password reset sends an email, and the Excel export notifies by email with a signed link. Locally, `MAIL_MAILER=log` (the value in a fresh app) writes them to `storage/logs/laravel.log`.

## Windows and Laragon

- **The `composer` on your PATH may run on a different PHP.** Laragon's can be PHP 8.2, which can't resolve packages that need 8.3. Use a `composer.phar` with the right PHP:

  ```bash
  php composer.phar update
  php artisan app:install --composer=C:/path/to/composer.phar
  ```

  `app:install` runs a `.phar` with the same PHP that runs artisan.
- **`php artisan install:api` uses the PATH `composer` and fails silently.** Check afterwards:

  ```bash
  composer show laravel/sanctum
  ```

## For an AI agent

The agent needs a shell to run `php artisan`, `composer` and `npm`, and write access to the project. Every step of the loop returns an exit code, and `validate`, `import` and `verify` accept `--format=json`. See [Preparing the project](/en/ai/setup).
