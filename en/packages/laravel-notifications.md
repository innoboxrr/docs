# laravel-notifications

`innoboxrr/laravel-notifications` **2.1.0** exposes the signed-in user's Laravel database notifications over HTTP. You can list them, count them, mark them as read and delete them. The admin bell is built on it.

It defines no models or notifications of its own. It works with the `notifications` relation from the `Illuminate\Notifications\Notifiable` trait, so any notification you send through the `database` channel shows up here.

## Install

```bash
composer require innoboxrr/laravel-notifications
php artisan notifications:install
php artisan migrate
```

It requires PHP `^8.3`, `laravel/framework ^13.0` and `laravel/sanctum ^4.3`. The user must use `Notifiable`. Laravel's `App\Models\User` already does, and so does the user LaraPack generates with `authenticatable`.

## Configuration

The configuration loads without publishing it, under the `innoboxrrlaravelnotifications` key.

| Key | Default |
|---|---|
| `user_class` | `App\Models\User` |
| `notification_via` | `['mail', 'database']` |
| `excel_view` | `innoboxrrlaravelnotifications::excel.` |
| `export_disk` | `s3` |

The routes read none of these keys; they always work with the signed-in user. The keys are kept for applications that read them.

## Environment variables

The package reads no environment variables.

## Publishing

| Tag | What it copies |
|---|---|
| `config` | `config/innoboxrrlaravelnotifications.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\LaravelNotifications\Providers\AppServiceProvider" --tag=config
```

## Migrations

The package ships no migrations of its own. It needs Laravel's `notifications` table, which a new application doesn't have; `notifications:install` publishes it.

## Commands

| Command | Options | What it does |
|---|---|---|
| `notifications:install` | — | Publishes Laravel's migration (`make:notifications-table`) only when there is no `*_create_notifications_table.php` and no table yet. You can run it as often as you like. If the database doesn't answer yet, it publishes the migration |

`php artisan make:notifications-table` does the same, but fails when the migration already exists. That makes it unsuitable for an installer that runs more than once.

## HTTP routes

All routes live in the `web` group, and the controller requires `auth:sanctum`. They only touch the signed-in user's notifications.

| Method | URI | Name | Fields | JSON response |
|---|---|---|---|---|
| GET | `/innoboxrr/notifications/notifications` | `innoboxrr.notifications.index` | `limit` (optional integer ≥ 1) | Array of notifications, newest first |
| GET | `/innoboxrr/notifications/notifications/unread` | `innoboxrr.notifications.index.unread` | `limit` (optional) | Array of unread notifications |
| GET | `/innoboxrr/notifications/notifications/unread/count` | `innoboxrr.notifications.index.unread.count` | — | `{ count }` |
| POST | `/innoboxrr/notifications/notifications/markAsRead` | `innoboxrr.notifications.mark.all.as.read` | — | `{ success, count }` |
| DELETE | `/innoboxrr/notifications/notifications` | `innoboxrr.notifications.delete.all` | — | `{ success, count }` |
| POST | `/innoboxrr/notifications/notifications/{notificationId}/markAsRead` | `innoboxrr.notifications.mark.as.read` | — | `{ success, id, action, read_at }`. 404 with `{ success: false, message }` if it isn't the user's |
| GET | `/notification/read/{notificationId}` | `read.noification` | — | Redirects to `data.action`, or `/` when there is none. With JSON it answers like the previous route |

- **`limit`** returns the N most recent notifications; without it you get all of them. The response is always an array, never a paginator, and an invalid `limit` answers 422.
- **Each notification** is the table row as is: `id`, `type`, `notifiable_type`, `notifiable_id`, `data`, `read_at`, `created_at`, `updated_at`.
- **Without JSON**, `mark.all.as.read` and `delete.all` answer plain text: `Notifications marked as read` and `Notifications deleted`.
- **`read.noification`** is meant for an email link: a normal navigation that marks the notification and takes the user to its action.

**Authentication and CSRF.** The routes are designed for a same-domain SPA that uses the session cookie:
1. The SPA requests `GET /sanctum/csrf-cookie` and receives `XSRF-TOKEN`.
2. axios sends it back as `X-XSRF-TOKEN` on every POST or DELETE.
3. Without that header, a write answers 419.

A guest asking for JSON gets 401; without JSON, Laravel redirects to the login page.

::: tip The read.noification name
The typo is historic and kept because applications already build links with that name. Laravel doesn't allow two names for one route, so there is no correctly spelled alias.
:::

## Policies and gates

There are no policies or abilities. Every query starts from `$request->user()->notifications()`, so nobody can see or change another user's notifications.

## Extension points

Send notifications through the `database` channel. The admin bell reads these keys from `data`:

```php
public function via(object $notifiable): array
{
    return ['mail', 'database'];
}

public function toArray(object $notifiable): array
{
    return [
        'message' => 'New order',
        'action' => '/admin/orders/7', // where opening it takes the user
        'img' => $this->sender->avatar_url,
        'from_name' => $this->sender->name,
    ];
}
```

::: warning The action starts with /
The base application's interfaces only navigate when `action` is either an internal path starting with `/` or an `http(s)://` URL. An action like `admin/orders/7`, without the slash, is marked as read but goes nowhere. The email link (`read.noification`) does resolve it, because Laravel performs that redirect.
:::

## In the base application

- **Installation.** `app:install` runs `notifications:install` before `migrate`.
- **The admin bell**, in Vue and React:
  - **Unread count.** It requests `index.unread.count` when the admin panel mounts, every 60 seconds, and when the tab becomes visible again. The interval is `notificationsInterval` in `resources/react/app/config.js`; in Vue it is fixed in `stores/notifications.js`.
  - **Latest list.** Opening the bell fetches the latest 10 with `index` and `limit=10`.
  - **Opening a notification.** It calls `mark.as.read`, then navigates to `action`: an internal path through the router, an absolute URL through `location`.
  - **"Mark all".** It calls `mark.all.as.read`.
- **Rendering.** `data.message` (or `data.title`) is rendered as text, never as HTML.
- **Not used by the interfaces:** `index.unread`, `delete.all` and `read.noification`.

See [The admin panel](/en/app-base/admin).

## Upgrading

### From 2.0 to 2.1

- **JSON responses when the request asks for JSON:**
  - marking one as read answers `{ success, id, action, read_at }` instead of redirecting, and a JSON 404 when it isn't the user's;
  - marking all and deleting all answer `{ success, count }`.

  Without JSON, the email link still redirects and the bulk routes still answer text.
- **Added:** `limit`, the `index.unread.count` route and the `notifications:install` command. The configuration now loads and publishes with `--tag=config`.
- **`composer.json` requires `laravel/framework ^13.0` and `laravel/sanctum ^4.3`** instead of `illuminate/support`.
- **Providers extend `Illuminate\Support\ServiceProvider`.** If your application extended one, review its methods: `map()`, `mapPolicies()` and folder-based observer discovery were removed.
- **URIs, route names and configuration keys are unchanged.**

## Pitfalls

- **500 when opening the bell on a new application.** The table is missing: run `php artisan notifications:install` and `php artisan migrate`.
- **419 when marking as read.** The CSRF cookie is missing, or axios doesn't send `X-XSRF-TOKEN`.
- **A notification doesn't show up.** It wasn't sent through `database`. Check the sender's `notification_via`: laravel-options and LaraPack notify only by `mail` by default.
- **Opening it doesn't navigate.** `data.action` doesn't start with `/` or `http`.
- **You expected a paginator.** `index` returns an array; use `limit`.
- **`make:notifications-table` fails because the migration already exists.** Use `notifications:install`.
