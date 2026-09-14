# All Laravel packages

The base application and the code LaraPack generates rely on twelve Composer packages from the ecosystem. This page covers, for each one:

- what it is for;
- which version is current;
- who installs it;
- whether the base application actually uses it or just leaves it installed.

Each package has its own page with configuration, routes and known pitfalls.

## At a glance

| Package | Version | What it is for | Installed by | Base application |
|---|---|---|---|---|
| [laravel-auth](/en/packages/laravel-auth) | 6.1.0 | JSON authentication under `/auth`: session, registration, passwords, verification, Sanctum tokens, social login and impersonation | `app:setup` | Yes: login, registration, password recovery, password change on the profile, the verification banner and leaving an impersonation |
| [laravel-options](/en/packages/laravel-options) | 2.1.0 | Business settings stored in the database, publicly readable | `app:setup` | Yes: the public site and its editor read and write the `site_name`, `site_description` and `theme` options |
| [laravel-notifications](/en/packages/laravel-notifications) | 2.1.0 | HTTP API over Laravel's database notifications | `app:setup` | Yes: the admin bell |
| [laravel-uploads](/en/packages/laravel-uploads) | 2.1.1 | An `Upload` model and API to upload, display and delete files | `app:setup` | Yes: the profile photo |
| [laravel-audit](/en/packages/laravel-audit) | 2.1.1 | Explicit logging of changes and login attempts, with a query API | `app:setup` | **Installed, no UI.** It creates its tables and nothing writes to them |
| [laravel-env-editor](/en/packages/laravel-env-editor) | 2.1.1 | UI and facade to edit `.env` and its backups | `app:setup` | Yes: the "Environment" menu link, admins only |
| [aws-file-manager](/en/packages/aws-file-manager) | 2.0.0 | A private S3 folder per user, with an API to browse it | `app:setup` | **Installed, no UI.** Its routes exist and answer 503 until S3 is configured |
| [routes-to-json](/en/packages/routes-to-json) | 2.1.0 | `route:json`: exports named routes to a JSON file the frontend reads | `app:setup` | Yes: it writes `resources/<ui>/routes.json`, where every frontend URL comes from |
| [locale-generator](/en/packages/locale-generator) | 2.1.0 | `locale:generate` and `locale:translate` for Laravel's `<locale>.json` files | `app:setup` | Installed; no install step runs it |
| [support](/en/packages/support-traits-search#support) | 2.1.1 | `RequestFormater::flatten` and shared helpers | `app:setup` and `larapack:new` | Yes, through the generated user: it flattens form data before metas are saved |
| [traits](/en/packages/support-traits-search#traits) | 2.1.0 | `MetaOperations` (metas and `payload`) and other traits | `app:setup` and `larapack:new` | Yes, through the generated user: it stores the `avatar` meta |
| [search-surge](/en/packages/support-traits-search#search-surge) | 3.0.3 | Filtering, sorting and pagination for Eloquent models | `app:setup` and `larapack:new` | Yes: admin listings and loading the options |

"Installed by" means who writes it into `composer.json`:
- **`app:setup`** adds all twelve to the application, and `app:install` then runs `composer update`.
- **`larapack:new`** declares `support`, `traits` and `search-surge` in a new package, because the code LaraPack generates uses them.

See [Install the base application](/en/app-base/install).

::: tip Installed is not the same as used
`laravel-audit` and `aws-file-manager` ship with the base application, but no screen calls them:
- **`laravel-audit`** leaves its tables empty until your code calls `log()`.
- **`aws-file-manager`** registers routes that any signed-in user can call as soon as you configure a bucket.

Read their pages before configuring S3.
:::

The base application also installs third-party packages that are not documented here:
- `opcodesio/log-viewer` (the "Logs" menu link, behind the `viewLogViewer` ability for admins)
- `laravel/sanctum`
- `maatwebsite/excel`
- `league/flysystem-aws-s3-v3`
- `algolia/scout-extended`
- `google/recaptcha`
- `staudenmeir/belongs-to-through`
- `staudenmeir/eloquent-has-many-deep`

## What each one requires

| Package | PHP | Laravel | Other dependencies in `require` |
|---|---|---|---|
| laravel-auth | `^8.3` | `illuminate/support ^13.0` | `laravel/sanctum ^4.0`, `laravel/socialite ^5.16` |
| laravel-options | `^8.3` | `illuminate/support ^13.0` | `innoboxrr/search-surge ^3.0`, `innoboxrr/traits ^2.1`. Suggests Sanctum and `maatwebsite/excel` |
| laravel-notifications | `^8.3` | `laravel/framework ^13.0` | `laravel/sanctum ^4.3` |
| laravel-uploads | `^8.3` | `illuminate/support ^13.0` | `innoboxrr/traits ^2.1`, `intervention/image ^3.11`, `intervention/image-laravel ^1.2` |
| laravel-audit | `^8.3` | `illuminate/support ^13.0` | `innoboxrr/search-surge ^3.0`, `innoboxrr/traits ^2.1`. Suggests `maatwebsite/excel` |
| laravel-env-editor | `^8.3` | `laravel/framework ^13.0` | — |
| aws-file-manager | `^8.3` | `laravel/framework ^13.0` | `laravel/sanctum ^4.3`, `aws/aws-sdk-php ^3.316`, `league/flysystem-aws-s3-v3 ^3.28` |
| routes-to-json | `^8.3` | `illuminate/support ^13.0` | — |
| locale-generator | `^8.3` | `illuminate/support ^13.0` | `guzzlehttp/guzzle ^7.7` |
| support | `^8.3` | `illuminate/support ^13.0` | `giggsey/libphonenumber-for-php ^9.0` |
| traits | `^8.2` | `illuminate/* ^12.0 \|\| ^13.0` | — |
| search-surge | `^8.2` | `illuminate/* ^12.0\|^13.0` | — |

The ecosystem baseline is PHP `^8.3` and Laravel `^13.0`. `traits` and `search-surge` also admit PHP 8.2 and Laravel 12. `larapack:audit` reports that as a warning, not an error: a constraint that admits the baseline plus more breaks nothing, but CI then has to test the extra versions too. See [Versions and compatibility](/en/help/versions).

## How they depend on each other

**Three packages are the foundation for the rest.** `traits`, `support` and `search-surge` expose no routes or screens; code uses them.
- **In models LaraPack generates:**
  - the model uses `traits`' `MetaOperations` when it declares `metas`;
  - its `Storage` trait flattens the form with `support`'s `RequestFormater::flatten` before saving metas;
  - its `IndexRequest`, filters and export use `search-surge`.
- **In other packages:** `laravel-options` and `laravel-audit` require `traits` and `search-surge`; `laravel-uploads` requires `traits`.

**Sanctum is the guard for every session route.**
- `laravel-auth`, `laravel-notifications` and `aws-file-manager` declare it.
- `laravel-options` only suggests it.
- `laravel-uploads` and `laravel-audit` use `auth:sanctum` without declaring it.

The application that installs them needs Sanctum and must call `statefulApi()` so the SPA uses the session cookie. The base application does.

**Being an admin is decided by `isAdmin()` on the user model.** No package defines who is an admin. They all check whether the user has an `isAdmin()` method and what it returns:

| Who asks | What it protects |
|---|---|
| The `laravel-auth.impersonate` ability | Impersonating another user |
| `OptionPolicy` | Writing options |
| `UploadPolicy` | Deleting other people's files, and permanent deletion |
| `laravel-audit`'s policies | Its whole API |
| The `admin` middleware and the `viewLogViewer` ability | `/env-editor` and `/log-viewer` in the base application |

In the base application, `isAdmin()` compares the email with `config('auth.admins')`, which comes from `ADMIN_EMAILS` in `.env`. Without that method nobody is an admin, and writes answer 403. See [Authentication and users](/en/app-base/auth).

**`routes-to-json` connects the backend to the frontend.**
1. `php artisan route:json` writes the named routes.
2. The frontend loads them with `setRoutes()`.
3. It asks for each URL with `route('name')`.

No backend URL is typed by hand. See [Requests, routes and languages](/en/ui/http-routes-i18n).

## What the September 2026 releases have in common

The versions in this table were released for a freshly created Laravel 13 application, and they fix the same three problems in every package. If you are coming from an earlier version, this is what changes in your application:

- **Providers extend `Illuminate\Support\ServiceProvider`.** Extending Foundation's `RouteServiceProvider` or `EventServiceProvider` made the application register its own routes again once per package, and send the verification email more than once.
- **No provider reads the cache while booting.** With `CACHE_STORE=database`, Laravel's default, `php artisan migrate` failed on a new application because the `cache` table did not exist yet.
- **Package routes honour `route:cache`.** When routes are cached they are not registered again.

::: warning The `config` tag is generic
Eleven of these packages publish their configuration under the `config` tag. `php artisan vendor:publish --tag=config` without `--provider` copies the configuration of **all** of them at once. Always pass the provider, as shown on each page. `search-surge` uses `search-surge-config`, and `laravel-auth` and `laravel-audit` also have a tag of their own.
:::
