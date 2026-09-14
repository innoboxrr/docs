# How it fits together

The ecosystem has three layers. On top is what you decide: `laraimport.json`. In the middle is what LaraPack generates: each model's API and interface module. At the bottom are the packages the generated code relies on, and the base application that mounts it.

```
                        laraimport.json            what you decide
                               │
                     php artisan larapack:import
               ┌───────────────┴────────────────┐
     Laravel API                        Interface module
     app/ or src/                       resources/<ui>/index.js
     api.* routes, requests,            resources/<ui>/src/models/<entity>
     policies, Resources                Vue or React
               │                                 │
     php artisan route:json  ──►  routes.json  ──►  route('api.app.product.index')
               │                                 │
     laravel-auth, options,             laravel-setup: site, auth and
     notifications, uploads…            admin panel that mounts the module
     traits, support, search-surge      form-core, form-elements, datatables…
```

## The packages and their roles

### LaraPack and the base application

| Package | Role |
|---|---|
| `innoboxrr/larapack-generator` | Generates around 58 files per model from `laraimport.json`: the API and a Vue or React module. Enforces the architecture with `validate`, `verify` and `audit`, and holds the ecosystem's version baseline. |
| `innoboxrr/laravel-setup` | Turns a fresh Laravel 13 app into the base app: authentication, a public site and an admin panel in Vue or React. Generates `User` with LaraPack. |

### Laravel packages

::: details What each one does
| Package | Role | In the base app |
|---|---|---|
| `innoboxrr/laravel-auth` | JSON-first auth under `/auth`: session login, registration, password reset and change, verification, Sanctum tokens, Socialite and impersonation. | Every auth call. |
| `innoboxrr/laravel-options` | Business settings stored in the database, with a public read API. | The public site and its editor. |
| `innoboxrr/laravel-notifications` | HTTP API over Laravel's database notifications. | The bell. |
| `innoboxrr/laravel-uploads` | Upload model and API. | The profile avatar. |
| `innoboxrr/laravel-audit` | Audit rows, login attempts and an admin API. | Installed, no UI. |
| `innoboxrr/laravel-env-editor` | `.env` editor at `/env-editor`. | Menu link, admins only. |
| `innoboxrr/aws-file-manager` | Per-user S3 folders API. | Installed, no UI. |
| `innoboxrr/routes-to-json` | `route:json` exports named routes to `routes.json`. | What the frontend reads. |
| `innoboxrr/locale-generator` | `locale:generate` and `locale:translate` for `<locale>.json` files. | |
| `innoboxrr/traits` | `MetaOperations` (metas and `payload`) and other traits. | Used by generated code. |
| `innoboxrr/support` | `RequestFormater::flatten`, which flattens form groups into meta keys, plus helpers. | Used by generated code. |
| `innoboxrr/search-surge` | Filtering, sorting and pagination for generated indexes. | Used by generated code. |
| `opcodesio/log-viewer` (third party) | Log viewer at `/log-viewer`. | Menu link, admins only. |
:::

### UI packages

::: details What each one does
| Package | Role |
|---|---|
| `innoboxrr-form-core` | Framework-free: `--fe-*` theme variables, CSS, semantic icons, toasts and confirmations, file helpers, timezones. |
| `innoboxrr-form-elements` | The 37 Vue components: form controls and desktop pieces (drawer, menu, command palette). |
| `innoboxrr-react-form-elements` | The same 37 components, same names, in React. |
| `innoboxrr-vue-datatable` / `innoboxrr-react-datatable` | The admin table over LaraPack's model contract. |
| `innoboxrr-http-request` | `makeHttpRequest`, with retries and cancellation. |
| `innoboxrr-route-resolver` | `route(name, params)` over `routes.json`. |
| `innoboxrr-i18n` | `t()`, `addTranslations`, `setLocale`. |
| `innoboxrr-js-validator` | Form validation with `data-validators`. |
| `innoboxrr-locale-generator` | The generated module's `npm run locale`: collects translation keys. |
:::

## How frontend and backend talk

Seven agreements hold everything together. Each one is explained in [The front ↔ back contract](/en/concepts/front-back):

1. **Named routes.** The frontend never writes URLs. `php artisan route:json` exports routes to `routes.json`, `setRoutes(routes)` loads them, and code asks for `route('api.app.product.index')`.
2. **The prefix.** `API_ROUTE_PREFIX` in each model's contract must match the `RouteServiceProvider`'s `->as()`. `larapack:verify` checks it.
3. **Response shape.** The table reads `data`, `meta` and `links` at the root: the application calls `JsonResource::withoutWrapping()`.
4. **The session.** The interface uses Sanctum's cookie: `statefulApi()`, `GET /sanctum/csrf-cookie`, and axios with `withCredentials` and `withXSRFToken`.
5. **Actions.** The Resource's `actions` array says what each row can do; the table renders and runs it.
6. **Who administers.** `isAdmin()` compares the email with `config('auth.admins')`, which comes from `ADMIN_EMAILS`. Policies, the `admin` middleware, impersonation, log-viewer and the `.env` editor all read it.
7. **Metas.** Forms send nested groups, `support` flattens them (`seo.title` → `seo_title`), `traits` stores them, and `payload` keeps a copy for fast reads.

## How a module plugs into the base application

In an application, LaraPack writes the module to `resources/<ui>/index.js` and `resources/<ui>/src/**`, with no `package.json` of its own. The base app loads it like this:

- It imports it with `import.meta.glob('../index.js')`, not a fixed import. That's why the app still builds before any model exists.
- It mounts the module's `routes` as children of `/admin`.
- It loads the module's `translations` before `resources/<ui>/app/lang/*.json`, so the app can override them.
- It imports `src/theme.js` if present.
- In Vue it installs the module's plugin; in React it calls `registerModuleRoutes('/admin')`.
- It builds the menu from the module's first-level routes that have a title and no parameters.

In a package, the module lives in `resources/vue` or `resources/react` with its own `package.json`, is published to npm, and the application mounts it by hand. See [Package or application](/en/concepts/package-or-application).

## Who owns each file

| File | Owner | On regeneration |
|---|---|---|
| `laraimport.json` | You | It's the input. |
| Generated, untouched | LaraPack | `--force` regenerates it. |
| Generated, edited by you | You | Kept, with a warning. |
| Relations, Storage and Operations traits | You | Only created when missing, even with `--force`. |
| Generated tests | You | Never overwritten. |
| The base app's `resources/<ui>/app/**` | You, from installation | LaraPack doesn't touch it. |
| `.larapack/manifest.json` | LaraPack, committed by you | Records every file, its template and its hash. |

The manifest is what separates your files from the generator's: it stores each file's hash at generation time, and a file whose hash changed is a file you edited.

## What checks what

| Tool | Looks at | When |
|---|---|---|
| `larapack:validate` | `laraimport.json` against the schema and consistency rules | Before generating. `import` does it too. |
| `larapack:verify` | The code against the manifest and the contract | After generating, and in CI. |
| `larapack:audit` | A package against the ecosystem baseline | In each package's CI, before releasing. |
| Generated tests | That every endpoint responds | Always. |

Next: [The architecture of a model](/en/concepts/architecture).
