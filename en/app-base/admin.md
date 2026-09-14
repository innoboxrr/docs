# The admin panel

`/admin` is the signed-in part of the base application. Every route under `/admin` needs a session, and the LaraPack module routes are mounted as its children.

## The layout

`AdminLayout` uses the form-core shell (`fe-shell`):

- **Header:** the menu button (on narrow screens), the site name (`site_name`, or "Administrator" when missing) linked to `/admin`, the notifications bell, the dark-mode button and the user menu.
- **Sidebar:** the menu.
- **Content:** the impersonation and verification notices, and the screen.

On mobile the sidebar closes on navigation, with `Escape` and by tapping the backdrop. There is a "Skip to content" link for keyboard users.

The **user menu** has "Profile" and "Sign out" ("Log out" in React). After signing out, Vue goes to `/auth/login` and React to `/`, also clearing the notifications.

## The menu

The menu **is built, not written**: a model you generate shows up on its own at the next build.

1. **Home** (`admin.dashboard`), always first.
2. Every **first-level** LaraPack module route with a title and **no parameters**, in the order the module exports it, except those in `adminOnly`. `user/:id` needs a record and cannot be opened from a menu.
3. For an admin session, an **"Administration"** group with:
   - the module routes in `adminOnly`;
   - **Site** (`/admin/site`);
   - **Logs** (`/log-viewer`, in a new tab);
   - **Environment** (`/env-editor`, in a new tab).

| Entry data | Where it comes from |
|---|---|
| Label | The route's `meta.title` (Vue) or `handle.title` (React), translated when read |
| Icon | `meta.icon` or `handle.icon`; defaults to `box`. Accepts a form-core icon map name or an Iconify name (`mdi:web`). |
| Target | The route name (Vue) or `adminBase` plus its `path` (React) |

The routes LaraPack generates come with a title and `auth: true`, but no icon. The exact shape `buildMenu` returns in each interface is in [With Vue](/en/app-base/vue) and [With React](/en/app-base/react).

## `adminOnly`

`resources/<ui>/app/config.js` exports the module routes only admins see:

::: code-group

```js [Vue]
// resources/vue/app/config.js — route names
export const adminOnly = [
    'AdminUsers',
]
```

```js [React]
// resources/react/app/config.js — route ids
export const adminOnly = ['AdminUsers']
```

:::

Being in `adminOnly` does two things:

- **In the menu**, the entry moves to the "Administration" group, which only exists for admins.
- **In the guards**, entering requires `is_admin`. Without it, the interface goes to `/admin` with a toast. Guards look at the whole route chain, so protecting the list also protects the detail and edit views.

LaraPack names each model's first-level route `Admin<Plural>`: `AdminUsers`, `AdminProducts`. The children are `AdminCreate<Model>`, `AdminShow<Model>` and `AdminEdit<Model>`.

::: warning `adminOnly` does not protect data
It decides what is shown. The backend is what protects. The policies LaraPack generates are **closed by default**: only an admin passes. A new model outside `adminOnly` shows in everyone's menu, but its endpoints answer 403 to non-admins until you open its policy. See [Customize and extend](/en/app-base/customize).
:::

## What is admin-only

| What | Who decides it in the backend |
|---|---|
| `/admin/site` | The route carries `meta.admin` / `handle.admin`. Saving goes through the laravel-options policy: `before()` only lets `isAdmin()` through. |
| `/log-viewer` | The `viewLogViewer` gate in `AppServiceProvider`: a user with `isAdmin()`. |
| `/env-editor` | `config/env-editor.php`: the `web`, `auth` and `admin` (`EnsureUserIsAdmin`) middleware. Turn it off with `ENV_EDITOR_ENABLED=false`. |
| Users module | `adminOnly` in the interface; `UserPolicy` in the backend. |

::: danger The `.env` editor reads and rewrites secrets
Anyone who opens `/env-editor` sees passwords and keys. It is enabled by default in the base application, behind `admin`. If you do not need it in production, set `ENV_EDITOR_ENABLED=false`.
:::

## Home

`/admin` greets the user ("Hello, `<name>`") and shows one card per menu entry, excluding Home. Cards that open a new tab carry a marker.

| | Vue | React |
|---|---|---|
| Greeting | First name | Full name |
| No entries | A card to "Profile" | "There is nothing here yet. Generate a model with LaraPack and it will appear in the menu." |

## The notifications bell

It uses [laravel-notifications](/en/packages/laravel-notifications) 2.1. Its routes carry the `innoboxrr.notifications.` prefix.

| When | What it requests |
|---|---|
| When the admin panel mounts, every 60 s and when the tab becomes visible | The unread count (`index.unread.count`) |
| When the bell opens | The latest 10 (`index` with `limit: 10`) |
| When a notification is clicked | `mark.as.read`, then navigates to its action |
| "Mark all as read" | `mark.all.as.read` |

- **The action.** It comes from the `mark.as.read` response or `data.action`. An internal path (`/admin/…`) navigates with the router; an `http(s)://` URL with `location`; anything else goes nowhere.
- **The text.** It is `data.message` (or `data.title`) and is **always rendered as text**, never as HTML.
- **The date.** `created_at`, formatted with `Intl.DateTimeFormat` in the interface language.
- The count shows "99+" from 100 up. A failed count request is not shown: the next attempt retries.

For a notification to show in the bell, send it on the `database` channel with a `message` and, optionally, an `action`:

```php
use Illuminate\Notifications\Notification;

class ReportReady extends Notification
{
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'Your report is ready.',
            'action' => '/admin',
        ];
    }
}

$user->notify(new ReportReady);
```

The `notifications` table is created by `php artisan notifications:install`, one of the `app:install` steps.

## Dark mode

- The button toggles between light and dark and stores the choice in `localStorage` under the `theme` key.
- The choice is applied as `data-theme="dark"` or `data-theme="light"` on `<html>`. With no choice nothing is written, and form-core follows `prefers-color-scheme`.
- An inline script in `resources/views/app.blade.php` applies the choice before painting, so the page does not flash light.
- The same button is on the authentication screens and, in React, in the site header.
- Everything built on the `--fe-*` variables switches on its own: the admin panel, the site and the tables.

## Languages

The base application's strings are written in English with `t()` from [innoboxrr-i18n](/en/ui/http-routes-i18n), and translated in `resources/<ui>/app/lang/es.json`:

```js
t('Hello, :name', { name: 'Ana' })   // "Hola, Ana" with the es locale
```

- **Locale.** `setLocale(document.documentElement.lang)`, which Blade takes from `APP_LOCALE` (`app:setup` sets it to `es`). innoboxrr-i18n is not reactive: the locale is set once, before mounting. To change it, change `APP_LOCALE` and reload.
- **Order.** The LaraPack module's translations load first, then the application's: when a key repeats, the application's wins.
- **Untranslated.** A `""` value counts as untranslated and does not override an earlier one. A key with no translation shows as is, in English.
- **Another language.** Add `resources/<ui>/app/lang/<locale>.json`; the locale comes from the file name. English needs no file, because the keys already are English.
- **Generated modules.** LaraPack deliberately leaves the Spanish translations of model and field names empty (`src/locales/es.json` with `""`). Translate them in the application's `lang/es.json`, which wins and is not regenerated.

The two interfaces do not use exactly the same keys (for example "Sign in" in Vue and "Log in" in React). Each ships its own complete `lang/es.json`.
