# The front ↔ back contract

The interface module and the Laravel API don't know each other through code: they know each other through agreements. If one side changes, the other has to change too. This page explains each agreement, what happens when it breaks, and how you notice.

It applies equally to Vue and React: each model's contract, `models/<entity>/index.js`, is the same file in both.

## 1. Named routes and `routes.json`

The frontend **never writes a URL**. It asks for each one by its Laravel route name:

```
php artisan route:json          innoboxrr/routes-to-json
  → routes.json                 the named routes, exported
  → setRoutes(routes)           innoboxrr-route-resolver, at boot
  → route('api.app.product.index')
```

```js
import route from 'innoboxrr-route-resolver'

route('api.app.product.index')              // /api/app/product/index
route('api.app.product.index', { page: 2 }) // /api/app/product/index?page=2
```

`route()` takes positional or named parameters, sends the ones the route doesn't use to the query string, and throws if a required one is missing. It is not Ziggy.

**Where `routes.json` is written.** That's `path` in `config/routes-to-json.php`, or the `JSON_ROUTES_FILE` variable:

| Project | Path |
|---|---|
| Base application | `resources/<ui>/routes.json`, configured by `app:setup` |
| `routes-to-json` default | `resources/vue/assets/json/routes.json` |

A relative path resolves from the project root.

::: warning After adding an endpoint, export again
A route that isn't in `routes.json` doesn't exist for the frontend. The base app says so with `Unknown backend route "api.app.product.index". Run php artisan route:json.`; in other projects the request can end up hitting the current page. `app:install` exports once; after that it's on you, or on a script such as `"build": "php artisan route:json && vite build"`.
:::

## 2. The route prefix

Every model contract declares its prefix:

```js
// resources/<ui>/src/models/product/index.js
export const API_ROUTE_PREFIX = 'api.app.product.'
```

And uses it for everything: `route(API_ROUTE_PREFIX + 'index')`. That prefix must rebuild exactly the `->as()` of the `RouteServiceProvider`, which mounts each file in `routes/api/models/` like this:

```php
Route::middleware('api')
    ->prefix('api/app/' . $name)      // $name: the file, in snake_case
    ->as('api.app.' . $name . '.')
    ->group($file);
```

| Project | Model | URL | Name prefix |
|---|---|---|---|
| Application | `OrderLine` | `api/app/order_line/...` | `api.app.order_line.` |
| Package `Acme\Catalog` | `OrderLine` | `api/acme/catalog/order_line/...` | `api.acme.catalog.order_line.` |

The model is snake_case in both modes. `larapack:verify` checks that both sides match (`route-prefix`) and fails if they don't.

## 3. The Sanctum session

The interface doesn't use tokens: it calls the API with **Laravel's session cookie**, just like a regular page. Four things are needed:

| Where | What |
|---|---|
| `bootstrap/app.php` | `$middleware->statefulApi()`: the API accepts the session on requests from a trusted domain. |
| axios | `withCredentials: true` to send the cookie and `withXSRFToken: true` to send the `X-XSRF-TOKEN` header. Since axios 1.6 that header isn't sent without it, not even same-origin. |
| Before logging in | `GET /sanctum/csrf-cookie`, which sets the `XSRF-TOKEN` cookie. |
| `.env` | The address you browse is in `SANCTUM_STATEFUL_DOMAINS`. |

The base app does it like this:

```js
axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true
axios.defaults.headers.common.Accept = 'application/json'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
```

There's a single axios copy in the application, and the generated module reaches it through `innoboxrr-http-request`: the application's interceptors cover the module's requests too.

**Trusted domains.** Without `SANCTUM_STATEFUL_DOMAINS`, Sanctum trusts `localhost`, `localhost:3000`, `127.0.0.1`, `127.0.0.1:8000`, `::1` and the `APP_URL` host with its port.

::: danger When they don't match
If you browse from an address that isn't on the list, the API doesn't see the session: **login succeeds and every table answers 401**. Put the exact address in `APP_URL`, host and port. If you set `SESSION_DOMAIN`, it must match the domain you browse; locally, leave it `null`.
:::

**How the base app's interface reacts:**

- **419**: the CSRF token expired. It fetches a new cookie and retries the request once.
- **401**: the session is gone. It clears state and sends you to login with `?redirect=` back to where you were.

**GET requests carry no token.** The CSRF token only protects state-changing requests. The tables (`innoboxrr-vue-datatable` and `innoboxrr-react-datatable` 3.1.1 or newer) no longer send it on GET, so it doesn't end up in URLs or server logs.

**Anything that changes state goes through POST, PUT or DELETE**, packages included. For instance, leaving an impersonation, `auth.revert.impersonate`, is a POST with a CSRF token as of `innoboxrr/laravel-auth` 6.1.0: over GET, another site could end an administrator's impersonation with an image tag. Both base app interfaces (`innoboxrr/laravel-setup` 7.0.1) already call it with POST.

## 4. Response shape

The tables read `data`, `meta` and `links` **at the root** of the index response. Laravel wraps Resources in an extra `data`, so the application has to remove it:

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

::: warning Without it, the table is empty
There's no error: the request answers 200 and the table can't find the rows. The base app already includes this.
:::

The index paginates with search-surge. Besides filters, it accepts `paginate`, `page`, `orderBy` and `orderMode`, among others.

## 5. Permissions

Before showing a button, the interface asks what the user may do:

- `api.app.product.policies` answers, for the current user and an optional record, one permission per action: `index`, `view`, `create`, `update`, `delete`… Bulk actions use the permission of their single action.
- The table resolves each row's permissions before opening its menu, and if the index answers 403 it explains that instead of showing an empty table.

The interface only hides buttons. **The request is what protects**: in `authorize()` it asks the policy before doing anything.

## 6. Actions

There are three lists of actions, and the table renders all three.

**Row actions** come from the server, in the `actions` array the Resource adds to each record:

```php
[
    'id' => 'delete',
    'name' => __('Delete'),
    'success' => __('Record deleted'),
    'callback' => 'deleteModel',
    'icon' => 'delete',
    'route' => false,
    'policy' => false,
    'params' => ['id' => $this->id],
]
```

| Key | What it does |
|---|---|
| `route: true` | Navigates to `params.to.name`, a frontend route such as `AdminShowProduct`. |
| `route: false` | Calls `model[callback](params)`: `callback` must be a function exported from `models/<entity>/index.js`. |
| `success` | The toast shown when it finishes. |
| `icon` | A semantic name (`show`, `edit`, `delete`), not a CSS class. |

Because the Resource is a slot, adding a row action means adding it to that array and exporting its function from the contract.

**Top bar actions** are declared by `crudActions()` in the contract: create (navigates to `AdminCreateProduct`) and export (calls `exportModel`).

**Bulk actions** are declared by `bulkActions()`. The table calls `model[callback](ids, rows, params)` and then reloads. The ids include rows selected on other pages. They hit `bulk.update` and `bulk.delete`, which apply the single action's policy to each record inside a transaction.

**In-cell editing** saves with `updateField(id, field, value)`, which calls `bulk.update` with just that field. If the API rejects it with a 422, the cell shows the rule's message and stays open.

## 7. Who administers

A single method decides who administers, and everything else asks it:

```
ADMIN_EMAILS=ana@acme.com,luis@acme.com        .env
  → config('auth.admins')                      config/auth.php
  → $user->isAdmin()                           the generated user
```

```php
public function isAdmin(): bool
{
    $admins = array_map('strtolower', (array) config('auth.admins', []));

    return in_array(strtolower((string) $this->email), $admins, true);
}
```

Who reads it:

| Where | What it decides |
|---|---|
| Each generated policy's `before()` | The administrator passes every action except those in `$exceptAbilities` (by default, `forceDelete`). |
| The `admin` middleware (`EnsureUserIsAdmin`) | Answers 403 to non-admins. |
| `innoboxrr/laravel-auth` | Only an administrator impersonates, and never themselves or another administrator. |
| log-viewer | The `viewLogViewer` gate. |
| The `.env` editor | Behind the `web,auth,admin` middleware. |

**On the frontend**, `auth.get.auth` returns `is_admin`. The interface uses it to decide what to show: the menu's Administration group, `adminOnly` routes, routes with `meta.admin`. That's presentation only: every request goes through the policy or the middleware again.

::: tip Changing ADMIN_EMAILS
It's read from config. If you cached config with `php artisan config:cache`, cache it again after changing it.
:::

For a role system, change the body of `isAdmin()`: everything that calls it keeps working.

## 8. Metas

A **column** is for what you filter, sort or index, or for foreign keys. A **meta** is for what's optional, changing or numerous: a page's SEO, a user's preferences. With `metas: true`, the model gets a `<model>_metas` table and a `payload` column holding a copy of all of them.

What a save goes through:

```
form                   { "seo": { "title": "Sale" } }
  → support            RequestFormater::flatten   →  seo_title = "Sale"
  → traits             update_metas(...)          →  only keys in $editable_metas
                                                     that aren't in $protected_metas
  → updatePayload()                               →  payload is rebuilt
```

The rules:

- **Nested groups flatten with an underscore**: `seo.title` is stored as `seo_title`. That's why `editable_metas` uses flattened names.
- **Only metas in `editable_metas` that aren't in `protected_metas` are saved.** A protected meta is written only by your code, with `setMeta` or `setMetas`, even if it arrives in the request.
- **An empty value (`null`, `''`, `[]`) deletes the meta. A key that isn't sent is left alone.**
- `payload` is system-written: it's never accepted from a request or exported.
- `setMeta` and `setMetas` don't rebuild `payload`: call `updatePayload()` afterwards.
- To read, `getPayload('a.b')` reads from `payload` without querying the metas table.

A real example: the profile avatar in the base app. The user is declared with `"editable_metas": ["avatar"]`. The screen uploads the image to laravel-uploads and saves its path as the `avatar` meta through `api.app.user.update`; removing it sends `avatar: ''`, which deletes it.

More in [Metas and payload](/en/larapack/metas).

## When something doesn't work

| Symptom | Broken agreement |
|---|---|
| `Unknown backend route` | 1: `php artisan route:json` is missing. |
| `larapack:verify` reports `route-prefix` | 2: someone changed the prefix or the `RouteServiceProvider`. |
| Login succeeds, 401 on every table | 3: `APP_URL`, `SANCTUM_STATEFUL_DOMAINS` or `SESSION_DOMAIN`. |
| A 419 that won't go away | 3: the `XSRF-TOKEN` cookie isn't arriving; check `withXSRFToken` and the domain. |
| Empty table with a 200 response | 4: `withoutWrapping()` is missing. |
| A button that fails with 403 | 5: the interface showed it, the policy says no. |
| The administrator isn't an administrator | 7: `ADMIN_EMAILS` or cached config. |
| A meta isn't saved | 8: it isn't in `editable_metas`, it's in `protected_metas`, or its name isn't flattened. |
