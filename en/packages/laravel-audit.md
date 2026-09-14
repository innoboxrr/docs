# laravel-audit

`innoboxrr/laravel-audit` **2.1.1** records who changed what, when and from where. It also keeps a log of login attempts, and provides an admin API to browse both.

Logging is **explicit**: you decide which operations deserve an audit row and call `log()` there. Nothing is audited automatically.

::: warning In the base application it is installed, but does nothing
The base application installs the package and sets `LARAVEL_AUDIT_EXPORT_DISK`, and `migrate` creates its tables. But:
- nothing in the application calls `log()` or `trackLoginAttempt()`;
- laravel-auth doesn't call them either;
- there is no screen and no menu entry.

The tables stay empty until you write the code in [Extension points](#extension-points).
:::

## Install

```bash
composer require innoboxrr/laravel-audit
php artisan vendor:publish --tag=laravel-audit-config   # optional
php artisan migrate
```

It requires PHP `^8.3`, `illuminate/support ^13.0`, `innoboxrr/search-surge ^3.0` and `innoboxrr/traits ^2.1`. It expects from the application:

- **Sanctum.** Every route uses `auth:sanctum`, although the package doesn't declare it.
- **`isAdmin()` on the user** (optional). An admin can use the whole API.
- **`isAllowTo($ability, $model)` on the user** (optional). It decides for users who aren't admins. Without either method, the answer is 403.
- **`maatwebsite/excel`** (suggested). Only needed to export; without it, exports answer 501.

## Configuration

`config/laravel-audit.php`:

| Key | Default | What it decides |
|---|---|---|
| `db_prefix` | `''` | Prefix for the `audits`, `actions` and `login_attempts` tables |
| `user_class` | `App\Models\User` | The model behind an audit's user |
| `excel_view` | `innoboxrrlaravelaudit::excel.` | Prefix of the export views |
| `notification_via` | `['mail', 'database']` | Channels for the export notice. `database` needs the `notifications` table |
| `export_disk` | `env('LARAVEL_AUDIT_EXPORT_DISK', 'local')` | Disk for exports |
| `builder.basePath` | `base_path('vendor/innoboxrr/laravel-audit/')` | Where search-surge looks for `index` filters |
| `builder.filtersPath` | `src/Models/Filters` | Filters folder, relative to `basePath` |
| `builder.filtersNamespace` | `Innoboxrr\LaravelAudit\Models\Filters` | Filters namespace |

## Environment variables

| Variable | Default | Use |
|---|---|---|
| `LARAVEL_AUDIT_EXPORT_DISK` | `local` | `export_disk` |

## Publishing

| Tag | What it copies |
|---|---|
| `laravel-audit-config` (or `config`) | `config/laravel-audit.php` |

The Excel views are not published.

## Migrations

They load from the package, and all of them use `db_prefix`: set it **before** migrating.

| Table | Columns |
|---|---|
| `audits` | `id`, `before` and `after` (longText, nullable), `route` (text), `ip_address`, `user_agent`, `loggable_id`, `loggable_type`, `user_id`, `action_id`, timestamps, `deleted_at` |
| `actions` | `id`, `type`, `actionable_id`, `actionable_type`, `description` (nullable), timestamps, `deleted_at` |
| `login_attempts` | `id`, `email`, `status` (boolean), `ip_address`, `user_agent`, timestamps, `deleted_at` |

A fourth migration changes `audits.route` from `string` to `text`.

## Commands

It registers no commands.

## HTTP routes

There are three resources: `audit`, `action` and `login_attempt`. Each lives in the `api` group, under `/api/innoboxrr/laravel-audit/{resource}/`, named `api.innoboxrr.laravel.audit.{resource}.*`, with `auth:sanctum` on every route. The id field is `audit_id`, `action_id` or `login_attempt_id`.

| Method | URI | Name | Fields | Response |
|---|---|---|---|---|
| GET | `policies` | `policies` | `id` (optional) | `{ <action>: bool, ... }` |
| GET | `policy` | `policy` | `policy`, `id` | `{ <policy>: bool }` |
| GET | `index` | `index` | search-surge data: `paginate` (`0` returns everything), `page`, `orderBy`, `orderMode` and the filters | Collection |
| GET | `show` | `show` | `{resource}_id`, `load_relations` | One record |
| POST | `create` | `create` | The model fields (no validation rules) | The record |
| PUT | `update` | `update` | `{resource}_id` and the fields | The record |
| DELETE | `delete` | `delete` | `{resource}_id` | Soft delete |
| POST | `restore` | `restore` | `{resource}_id` | The record |
| DELETE | `force-delete` | `force.delete` | `{resource}_id` | Permanent delete |
| POST | `export` | `export` | The `index` filters | `{ status: true }`. 501 without `maatwebsite/excel` |

For example, the audit listing is `GET /api/innoboxrr/laravel-audit/audit/index`, named `api.innoboxrr.laravel.audit.audit.index`.

**Exporting.** `export` stores an `.xlsx` on `export_disk` and notifies through `notification_via`.

## Policies and gates

`AuditPolicy`, `ActionPolicy` and `LoginAttemptPolicy` are registered with `Gate::policy()`:
- **`before()`** lets users whose `isAdmin()` returns `true` through on **every** ability, including `update` and `forceDelete`.
- **For any other user**, each ability (`index`, `viewAny`, `view`, `create`, `update`, `delete`, `restore`, `forceDelete`, `export`) asks `$user->isAllowTo($ability, $model)` when that method exists, and denies otherwise.

::: warning An admin can edit and delete the audit trail
The API exposes `create`, `update`, `delete` and `force-delete` on audits, and an admin passes all of them. If you need an immutable trail, replace the policies from the application with `Gate::policy()`, or don't expose those routes.
:::

## Extension points

### Recording audits

```php
use Innoboxrr\LaravelAudit\Support\Traits\Auditable;

class Invoice extends Model
{
    use Auditable;
}
```

```php
// Update: fill first, then log, then save.
// `before` is the stored row and `after` what is about to be written.
$invoice->fill($request->validated());
$invoice->log('update');
$invoice->save();

// Create or delete: log once the model has an id.
$invoice = Invoice::create($data);
$invoice->log('create');

$invoice->audits; // morphMany of Innoboxrr\LaravelAudit\Models\Audit
```

`log(string $type)` does the following:
- **Stores** `before` (the original, as JSON), `after` (the attributes as JSON when the model has unsaved changes, otherwise `null`), the URL, IP, user agent, the signed-in user and an `Action`.
- **The `Action`** is one per type and record, created the first time.
- **It only writes** inside an HTTP request with a signed-in user. In commands, queued jobs and guest requests it does nothing and returns `null`.

### Recording login attempts

```php
use Innoboxrr\LaravelAudit\Support\Traits\LoginAttempts;

class User extends Authenticatable
{
    use LoginAttempts;
}

$user->trackLoginAttempt(true);   // or false
$user->loginAttempts;             // hasMany, matched by email
```

### On a model LaraPack generates

LaraPack regenerates the model, but never rewrites its `Operations` trait. A trait can use another trait, so the package's traits go there. In the base application the user is `app/Models/User.php` and its operations trait is `app/Models/Traits/Operations/UserOperations.php`:

```php
trait UserOperations
{
    use \Innoboxrr\LaravelAudit\Support\Traits\LoginAttempts;
}
```

laravel-auth signs in with the `web` guard, which fires Laravel's `Login` and `Failed` events. To record attempts, listen to them from an application provider:

```php
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;

Event::listen(Login::class, fn (Login $event) => $event->user->trackLoginAttempt(true));
Event::listen(Failed::class, fn (Failed $event) => $event->user?->trackLoginAttempt(false));
```

An attempt with an email that doesn't exist has no user, so it isn't recorded. `Login` also fires when laravel-auth signs someone in without a password: on registration, with social login, and when starting or leaving an impersonation. Those count as successful attempts too. See [What is generated and where your code goes](/en/larapack/generated-code).

## In the base application

- **Installation.** `app:setup` requires `innoboxrr/laravel-audit ^2.1` and adds `LARAVEL_AUDIT_EXPORT_DISK=local` to `.env`. `app:install` migrates its tables.
- **Usage.** Nothing else: no screen, no menu, no calls to `log()`. Its routes exist and appear in `routes.json`.
- **Permissions.** The routes only answer admins, because the generated user has `isAdmin()` but no `isAllowTo()`.

## Upgrading

### From 2.0 to 2.1

- **The export disk default moved from `s3` to `local`.** If you exported to S3 without publishing the configuration, set `LARAVEL_AUDIT_EXPORT_DISK=s3`.
- **The configuration now publishes** with `--tag=laravel-audit-config` or `--tag=config`. Before, the README's command published nothing.
- **Exporting without `maatwebsite/excel` answers 501**, with a message saying what to install.
- **Policies check `isAdmin()` and `isAllowTo()` with `method_exists`**, so a user without those methods gets 403 instead of a fatal error.
- **`innoboxrr/search-surge` and `innoboxrr/traits` moved to `require`**, and `doctrine/dbal` was removed.
- **Fixed:**
  - `policy`, which answered 500;
  - `index` for `action` and `login_attempt`;
  - exports;
  - rollback with a prefix;
  - `log()` without a `User-Agent`.

### From 2.1.0 to 2.1.1

Provider fixes: the application no longer registers its routes twice, the verification email is no longer sent twice, and the three policies are actually registered. URIs, names, middleware and responses are unchanged.

## Pitfalls

- **The `audits` table is empty.** Nothing calls `log()`. It also doesn't write from a command, a queued job or a request without a user.
- **`after` is `null`.** You called `log()` when the model had no unsaved changes, for example after `save()`.
- **The tables were created without a prefix.** `db_prefix` is read while migrating, so change it before the first migration.
- **A non-admin user gets 403 on everything.** Their model has no `isAllowTo()`.
- **The export notice link doesn't download the file.** The notice builds the link from `config('app.aws_url')`, which Laravel 13 doesn't define. Find the file on `export_disk`.
- **`create` stores whatever it receives.** Its validation rules are empty.
