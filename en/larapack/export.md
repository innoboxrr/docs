# Export to Excel

With the `export` action, a model exports to Excel whatever its index is filtering. The file is stored on a disk and reaches whoever requested it through a notification, with a signed link. It works right after generation: the package requires `maatwebsite/excel`, uses the `local` disk and notifies by email.

## End to end

1. **The interface requests it.** "Export" is in the table toolbar and in the command palette. `exportModel()` asks first with the theme's confirmation dialog and sends `POST export`. Once it's accepted, a toast says "The export is being prepared. You will be notified when it is ready.".
2. **`ExportRequest` authorizes** with the policy's `export` ability and completes the request with `paginate: 0`, `managed: true` and `except_view_any: true`: every record, with the visibility defined by `ManagedFilter`.
3. **It fires `ExportEvent`**, with the request data, the user and the request's locale. It responds `{"status": true}`. If something throws, it logs the error and responds 500 with `{"message": "The export could not be generated."}`, translated.
4. **`SendExportNotification`**, the listener, notifies the user with `ExportNotification`, in that locale.
5. **The notification creates the file** the first time it's sent through a channel: `Excel::store(new PostsExports($data), 'exports/<uuid>.xlsx', <disco>)`.
6. **Then it notifies** with a temporary link to the file, valid for one day.

::: warning The export runs in the same request
Neither the generated notification nor the listener implements `ShouldQueue`, so the file is created while `POST export` is being handled. With large tables, implement `ShouldQueue` on the notification so a queue worker creates it.
:::

## What is generated

| File | What it is |
|---|---|
| `src/Http/Requests/<Model>/ExportRequest.php` | Authorizes, completes the filters and fires the event. |
| `src/Http/Events/<Model>/Events/ExportEvent.php` | Carries `data`, `user` and `locale`. |
| `src/Http/Events/<Model>/Listeners/ExportEvent/SendExportNotification.php` | Notifies the user. |
| `src/Http/Events/<Model>/Listeners/ExportEvent/DefaultOperation.php` | **Slot** for other effects. |
| `src/Exports/<Plural>Exports.php` | `FromView`: the query and the view. |
| `resources/views/excel/<snake>.blade.php` | A table with one column per name in `$export_cols`. |
| `src/Notifications/<Model>/ExportNotification.php` | Creates the file and sends the notification. |
| The `export` ability in the policy | Returns `false`: only the admin can export until you decide otherwise. |

Without the `export` action, none of this is generated.

### The query and the columns

```php
public function view(): View
{
    return view(
        config('acmecatalogo.excel_view', 'acmecatalogo::excel.') . 'post',
        [
            'posts' => $this->getQuery(),
            'exportCols' => Post::$export_cols,
        ]
    );
}

public function getQuery()
{
    $builder = new Builder();

    return $builder->lazy(Post::class, $this->data);
}
```

- The rows come from search-surge with the same filters as the index, and through `lazy()`: an export walks the whole table without hydrating it all at once.
- The columns are `$export_cols`, which comes from each property's `exports_cols`. A `secret` property, `payload` in a model with metas, and `password` and `remember_token` in an `authenticatable` model are never included.
- The view writes each column's name in the header and its value in each row. To change the headers or the formatting, edit the view.

### The notification

| Channel | What it sends |
|---|---|
| `mail` | Subject `<APP_NAME> \| Export of <Plural>`, a greeting, body text, a "Download" button with the link and a sign-off, all through `__()`. |
| `database` | `action` (the link), `message` and `img`. That's the shape the bell from `innoboxrr/laravel-notifications` reads. |

The link is the disk's `temporaryUrl()`, expiring after one day; if the disk doesn't support temporary links, `url()`.

::: warning Nobody deletes the files
The email says the file will be deleted after 24 hours, but the only thing that expires is the link: the files remain in the disk's `exports/` folder. Delete them with a scheduled task in the application.
:::

## Configuration {#configuration}

The export reads three keys, with defaults in the code, so it also works without a configuration file:

| Key | Default | What it is |
|---|---|---|
| `excel_view` | `<clave>::excel.` in a package; `excel.` in an application | Prefix of the Excel view. |
| `notification_via` | `['mail']` | The notification's channels. |
| `export_disk` | `'local'` | Disk where the file is stored. In production, usually `s3`. |
| `user_class` | `'App\Models\User'` | Written to the file, but the generated code doesn't read it. |

Where they live:

| | Package | Application |
|---|---|---|
| File | `config/<clave>.php`, with the package key: the namespace in lowercase without separators (`acmecatalogo`) | `config/larapack.php` |
| How it's read | `config('acmecatalogo.export_disk', 'local')` | `config('larapack.export_disk', 'local')` |
| Excel views | Registered under the package namespace by its `AppServiceProvider` | No namespace, in `resources/views/excel` |
| Who creates it | `larapack:new` or `larapack:config`; the application publishes it with `--tag=config` | `larapack:config`, which never writes to `config/app.php` |

```php
// config/larapack.php
return [

    'user_class' => 'App\Models\User',

    'excel_view' => 'excel.',

    // Where the export sends its notification. `database` needs the
    // application's notifications table: php artisan make:notifications-table
    'notification_via' => ['mail'],

    // Where the exported file is stored. `local` works in any
    // application; in production, usually `s3`.
    'export_disk' => 'local',

];
```

## In an application

- **Register the `EventServiceProvider`** in `bootstrap/providers.php` (`larapack:event-service-provider` creates it). Laravel doesn't discover providers in an application's `composer.json`, and without it nothing listens to `ExportEvent`: the file isn't created and no notification arrives, even though the API responds `{"status": true}`.
- **The configuration is `config/larapack.php`**, not Laravel's: `config/app.php` belongs to Laravel.
- An application generated with 7.10.0 or 7.10.1 requested the `app::excel.` view and read `app.*`: see [From 7.10.1 to 7.10.2](/en/larapack/upgrade#from-7101-to-7102).

## Notifying in the database too

```bash
php artisan make:notifications-table
php artisan migrate
```

Then add `database` to `notification_via`:

```php
'notification_via' => ['mail', 'database'],
```

The file is created only once, even if the notification goes out through both channels. The bell in the base application's admin panel reads those notifications: see [laravel-notifications](/en/packages/laravel-notifications).

## What it needs

| What | Why |
|---|---|
| `maatwebsite/excel` | Creates the file. A package created with `larapack:new` already has it in `require`. |
| A `Notifiable` user | Receives the notification. |
| Mail configured, or the `database` channel | How the link gets delivered. |
| The `EventServiceProvider` loaded | Wires the event to its listener. |
| The `export` ability | Starts out as `false`: only the admin passes. |

## When something fails

| Symptom | Cause |
|---|---|
| 403 when exporting | The policy doesn't allow `export`, or the user isn't an admin. |
| The API responds fine but nothing arrives | The `EventServiceProvider` isn't registered, or mail isn't configured. |
| 500 "The export could not be generated." | The details are in the log. |
| "No hint path defined for [app]" | An application generated with 7.10.0 or 7.10.1. |
| The link doesn't open | The disk doesn't serve files: with `local`, check its file-serving configuration, or use a disk with temporary links such as S3. |
