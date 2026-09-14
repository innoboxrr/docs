# What is generated and where your code goes

A model produces roughly 58 pieces: the full API, its tests and, if you ask for it, its interface module. This page is the map: which file is generated and when, where you write, what you don't touch and what is never rewritten.

The paths shown are those of a **package**. In an **application**, `src/` becomes `app/` and the namespace becomes `App\`; the other differences are [at the end](#package-or-application).

In file names, `<Model>` is the model (`OrderLine`), `<Plural>` its plural (`OrderLines`), `<snake>` its snake_case form (`order_line`), `<tabla>` the table, its plural in snake_case (`order_lines`), and `<kebab>` its kebab-case form (`order-line`).

## Per model

### Model, traits and filters

| File | When | What it is |
|---|---|---|
| `src/Models/<Model>.php` | Always | The model: `$fillable`, `$hidden`, `$creatable`, `$updatable`, `$protected_metas`, `$editable_metas`, `$export_cols`, `$loadable_relations`, `$loadable_counts` and `casts()`, taken from the contract. It links its observer, policy and factory with `#[ObservedBy]`, `#[UsePolicy]` and `#[UseFactory]`. |
| `src/Models/<Model>Meta.php` | With `metas: true` | A `key`/`value` row of `<snake>_metas`. |
| `src/Models/Traits/Relations/<Model>Relations.php` | If it doesn't exist | **Slot.** The declared relations and, with metas, `metas()`. |
| `src/Models/Traits/Operations/<Model>Operations.php` | If it doesn't exist | **Slot.** Business logic. With metas, `buildPayload()` and `updatePayload()`. |
| `src/Models/Traits/Storage/<Model>Storage.php` | If it doesn't exist | **Slot.** `createModel()`, `updateModel()`, `deleteModel()`, `restoreModel()` (with `restore`), `forceDeleteModel()` and, with metas, `updateModelMetas()`. |
| `src/Models/Traits/Mutators/<Model>Mutators.php` | If it doesn't exist | **Slot.** Accessors and mutators. |
| `src/Models/Traits/Assignments/<Model>Assignment.php` | If it doesn't exist | A commented example of assignment through a pivot. |
| `src/Models/Filters/<Model>/ManagedFilter.php` | Always | **Slot.** `canView()`: who sees what. |
| `src/Models/Filters/<Model>/IdFilter.php`, `CreationFilter.php`, `UpdatedFilter.php`, `EagerLoadingFilter.php` | Always | The fixed search-surge filters. |

### HTTP

| File | When | What it is |
|---|---|---|
| `src/Http/Controllers/<Model>Controller.php` | With at least one action | One method per action that delegates to its request, with the `auth:sanctum` middleware. |
| `src/Http/Controllers/Controller.php` | In a package, once | The base controller. |
| `src/Http/Requests/<Model>/<Acción>Request.php` | One per declared action | `PoliciesRequest`, `PolicyRequest`, `IndexRequest`, `ShowRequest`, `CreateRequest`, `UpdateRequest`, `DeleteRequest`, `RestoreRequest`, `ForceDeleteRequest`, `ExportRequest`, `BulkUpdateRequest` and `BulkDeleteRequest`. They authorize, validate and do the work in `handle()`. |
| `src/Http/Resources/Models/<Model>Resource.php` | Always | **Slot.** The response: `parent::toArray()` plus the row's `actions` array. |
| `src/Http/Events/<Model>/Events/<Acción>Event.php` | With `create`, `update`, `delete`, `restore`, `forceDelete` or `export` | The event, carrying the request's locale. |
| `src/Http/Events/<Model>/Listeners/<Acción>Event/DefaultOperation.php` | One per event | **Slot.** Side effects. |
| `src/Http/Events/<Model>/Listeners/ExportEvent/SendExportNotification.php` | With `export` | Sends the notification that creates the file. |
| `routes/api/models/<snake>.php` | With at least one action | One route per action. |

### Authorization, lifecycle and export

| File | When | What it is |
|---|---|---|
| `src/Policies/<Model>Policy.php` | Always | **Slot.** One ability per action. Starts closed. |
| `src/Observers/<Model>Observer.php` | Always | **Slot.** `created` and one handler per declared write. |
| `src/Exports/<Plural>Exports.php` | With `export` | The query and the sheet's view. |
| `resources/views/excel/<snake>.blade.php` | With `export` | The table that becomes the sheet. |
| `src/Notifications/<Model>/ExportNotification.php` | With `export` | Creates the file and sends the notification with the link. |

### Database, tests and strings

| File | When | What it is |
|---|---|---|
| `database/migrations/<fecha>_create_<tabla>_table.php` | Always | The create migration. |
| `database/migrations/<fecha>_create_<snake>_metas_table.php` | With `metas: true` | The metas table. |
| `database/migrations/<fecha>_alter_<tabla>_table.php` | When reimporting with different columns | The alter migration. See [Migrations](/en/larapack/migrations). |
| `database/factories/<Model>Factory.php` | Always | **Slot.** A value the database accepts for every column. |
| `tests/Feature/Models/<Model>EndpointsTest.php` | If it doesn't exist | **Slot.** One test per action and, with `immutable`, the immutability tests. |
| `lang/es.json` | When generating the resource and the notification | The keys for the row actions and the export email that LaraPack knows how to translate. |

## Per project

| File | When | What it is |
|---|---|---|
| `tests/TestCase.php` | If it doesn't exist | In a package, it boots Testbench with the providers from `composer.json`, Sanctum and Excel, uses `tests/User.php`, calls `JsonResource::withoutWrapping()`, migrates and opens authorization with `Gate::before`. In an application, Laravel's empty `TestCase`. |
| `tests/User.php` | In a package, if it doesn't exist | The user the tests authenticate as. |
| `phpunit.xml` | If there is neither `phpunit.xml` nor `phpunit.xml.dist` | |
| `composer.json` | In a package | Adds `<Namespace>\Database\Factories\` to autoload and `<Namespace>\Tests\` to autoload-dev. |
| `.larapack/manifest.json` | Always | The record of what was generated. Commit it. See [Regenerate without destroying](/en/larapack/regenerate). |

The importer doesn't generate providers or configuration: they're covered in [Providers and configuration](/en/larapack/commands#providers-and-configuration).

## The interface module

Only with `--vue`, `--react` or both. `<ui>` is `vue` or `react`, and components are `.vue` or `.jsx`.

### Per model, in `resources/<ui>/src/models/<kebab>/`

| File | Requires | What it is |
|---|---|---|
| `index.js` | — | The model contract. **It's the same file in Vue and React.** |
| `store/index.js` | — | A Pinia store (Vue) or Zustand store (React), with the same surface. |
| `routes/index.js` | `index` and `policies` | The model's routes. |
| `views/AdminView` | `index` and `policies` | The index, with the table, the create drawer and the command palette. |
| `widgets/DataTable` | `index` and `policies` | The table. |
| `forms/FilterForm` | `index` and `policies` | The filters. |
| `views/ShowView`, `widgets/ModelCard`, `widgets/ModelProfile` | `index`, `policies` and `show` | The detail page. |
| `views/CreateView`, `forms/CreateForm` | `index`, `policies` and `create` | Creating a record. |
| `views/EditView`, `forms/EditForm` | `index`, `policies`, `show` and `update` | Editing a record. |

The views hang off the index, and the index needs the policies because the table queries them to decide which actions to offer. Without `index` or without `policies`, the module only includes the contract and the store.

### Module-wide, in `resources/<ui>/`

| File | What it is |
|---|---|
| `index.js` | The entry point. |
| `src/routes/index.js` | Collects the routes from `src/models/*/routes/index.js` with a Vite glob. In React it also exports `registerModuleRoutes` and `routeNamesOf`. |
| `src/theme.js` | Imports `innoboxrr-form-core/styles` and leaves `setTheme` and `setIcons` ready to use. |
| `src/i18n.js` | Exports `translations` and `tableLabels()`. |
| `src/locales/en.json`, `src/locales/es.json` | The strings, which LaraPack fills in every time it generates. |
| `src/components/Breadcrumbs`, `src/components/ActionMenu` | The breadcrumbs and a record's action menu. |
| `package.json`, `vite.config.js` | Only in a package. The npm name is the namespace in kebab-case: `acme-catalogo` in Vue and `acme-catalogo-react` in React. In an application, the application provides them. |

### What the entry point exports

::: code-group

```js [Vue]
import module, { routes, translations } from 'acme-catalogo'

// routes        the routes of every model, to mount as children
// translations  { en, es }
// module        Vue plugin, { install(app, options) }, empty by default
```

```js [React]
import routes, { registerModuleRoutes, routeNamesOf, translations } from 'acme-catalogo-react'

// routes                      the routes of every model (also as a named export)
// registerModuleRoutes(base)  registers the route names under the prefix where they're mounted
// routeNamesOf(tree, base)    name → full path, walking the tree
// translations                { en, es }
```

:::

How each piece is used is covered in [The generated UI](/en/larapack/ui), and how it's mounted in [Mounting a package in an application](/en/larapack/mount-in-app).

## Where your code goes {#where-your-code-goes}

These are the places where code is written by hand. If some logic fits in none of them, something is missing from `laraimport.json`: don't step outside them.

| Slot | What goes there |
|---|---|
| `Traits/Operations/` | The model's business logic. It's the default place. With metas, also the shape of `payload` in `buildPayload()`. |
| `Traits/Relations/` | Relations the JSON can't express (through, fully polymorphic, conditional) and the methods of relations you declare after the trait was created. |
| `Traits/Storage/` | Uploading and deleting the model's files, and anything else needed when creating or updating. |
| `Traits/Mutators/` | Accessors and mutators. |
| `Filters/<Model>/ManagedFilter::canView` | **Who can see what.** Without it, the index returns everything to anyone who passes the policy. |
| `Policies/<Model>Policy` | Authorization per action. It starts closed: every method returns `false`, only the admin passes in `before()`, and not even the admin can force-delete until `forceDelete` is removed from `$exceptAbilities`. |
| `Requests/*/rules()` | Rules that don't come from the JSON, inside the array. |
| `Resources/<Model>Resource` | The exact shape of the response and its `actions` array. |
| `Events/*/Listeners/` | Side effects: notifications, queues, integrations. |
| `Observers/` | The model's lifecycle. |
| `database/factories/` | Realistic test data. The generated factories already insert. |
| `tests/Feature/` | Behavior. The generated tests pass right after generation and prove that every endpoint responds, with authorization open; test authorization separately, against the policy. |

**The model is a facade, not a place to pile up logic.** A public method in `Operations` orchestrates, and the real work lives in the class it belongs to.

::: warning Authorization doesn't go in the model
If you hide an `abort(403)` in the model, the policies API can't see it and the table offers a button that fails. Who can do what is decided in the policy, which is what the front end queries.
:::

## What you don't touch

- **The controller.** It delegates to the requests and holds no logic. Anything different goes in the request.
- **The routes file.** If an endpoint is missing, it's missing from the generator or from `routes`.
- **The model's lists:** `$fillable`, `$creatable`, `$updatable`, `$export_cols`, `$loadable_relations`, `$loadable_counts`, `$editable_metas`, `$protected_metas` and `casts()`. They come from the JSON; editing them splits the code from the contract.
- **Whatever a request declares outside its rules array.**
- **`models/<kebab>/index.js` in just one framework.** It's the same file in Vue and React; editing it in one makes them diverge.
- **CSS framework classes** (`uk-*`, `fa-*`, Tailwind) in a generated file. The look comes from the theme.

A generated file you edit is flagged as `customised` by `larapack:verify` and stops receiving regenerations. In a slot that's expected; in the controller, the routes or the model, it's drift.

## The markers

Templates contain two kinds of marks.

**Conditional blocks.** Templates mark whatever depends on an action or a model key:

```php
// @larapack:if update
public function update(UpdateRequest $request) { ... }
// @larapack:endif
```

A condition is an action name, `immutable`, `secret`, `metas` or `authenticatable`; `a|b` holds if either one holds, `a&b` if both hold, and `!a` if `a` doesn't. The marker lines are always removed, so they never reach your project.

**Data markers.** They're where the importer writes what comes from the contract:

| Marker | Where | What it inserts |
|---|---|---|
| `//FILLABLE//`, `//HIDDEN//`, `//CREATABLE//`, `//UPDATABLE//`, `//EDITABLEMETAS//`, `//EXPORTCOLS//`, `//LOADABLERELATIONS//`, `//LOADABLECOUNTS//`, `//CASTS//` | The model | The lists and the casts. |
| `//RULES//` | `CreateRequest` and `UpdateRequest` | The rules from `requests`. |
| `//IMPORTS//` and `//EDIT//` | The `Relations` trait | The `use` statements and the relation methods. |
| `//EDIT//` | Create migration, pivot migration and factory | The columns and the factory values. |
| `//UP//` and `//DOWN//` | Alter migration | The changes and their reverse. |
| `//DATA_TABLE_COLUMNS//`, `//DATA_TABLE_SORT//` and `//BULK_UPDATE_ACTIONS//` | `models/<kebab>/index.js` | The table columns, the default sort and one bulk action per enum value. |
| `<!-- Add more inputs -->` (Vue), `{/* Add more inputs */}` (React), `//import_more_components//`, `//form_fields//`, `//submit_data//` and `//props//` | The forms | The fields, their imports, the state, what gets submitted and the props. |

When run through `larapack:import`, each marker is replaced by its content and disappears. A standalone generator has no laraimport, so it leaves the data markers as they are, and the file has no columns, rules or fields.

## What is never rewritten

| What | Why |
|---|---|
| The five traits (`Relations`, `Operations`, `Storage`, `Mutators` and `Assignment`) | They're yours from the moment they exist: they're only created if missing, not even `--force` rewrites them, and they aren't in the manifest. |
| `tests/Feature/Models/<Model>EndpointsTest.php` | Created if missing and not in the manifest. To get the test from a new version, delete it and import again. |
| `tests/TestCase.php`, `tests/User.php` and `phpunit.xml` | Copied once. |
| Pivot migrations | Created only if there's no create migration for that table. |
| A create migration LaraPack didn't generate | Skipped. See [Migrations](/en/larapack/migrations#migrations-larapack-did-not-generate). |
| A non-empty translation, in `src/locales/*.json` or `lang/es.json` | Generating only adds new keys and fills in the empty ones LaraPack knows. Invalid JSON is left untouched. |
| What `larapack:new` writes outside the generators: `README.md`, `CHANGELOG.md`, `VERSION`, `AGENTS.md`, the workflows, `pint.json`, `phpstan.neon.dist`, `phpunit.xml.dist`, `.gitignore`, `.gitattributes` and `LICENSE` | It belongs to the package from the first commit: it doesn't go through the manifest, and changing it isn't an architectural deviation. |
| The installed skill | `larapack:skill` only overwrites it with `--force`. |
| Any generated file you edited | `--force` keeps it and says so. |

## Package or application {#package-or-application}

| | Package | Application |
|---|---|---|
| Code | `src/`, with the package namespace | `app/`, with `App\` |
| Routes | `api/<namespace>/<snake>`, names `api.<namespace>.<snake>.*` | `api/app/<snake>`, names `api.app.<snake>.*` |
| Factories | `<Namespace>\Database\Factories` | `Database\Factories` |
| Tests | `<Namespace>\Tests\Feature\Models`, with Testbench's `TestCase` and `tests/User.php` | `Tests\Feature\Models`, with the application's `TestCase`; they log in using the factory of the model in `auth.providers.users.model` |
| Interface module | With its own `package.json` and `vite.config.js` | Without them: the application builds it and declares its dependencies |
| Export view and configuration | `<clave>::excel.` and `config/<clave>.php` | `excel.` and `config/larapack.php` |
| Providers | In `extra.laravel.providers`, discovered by Laravel | Registered by hand in `bootstrap/providers.php` |

The details are in [Package or application](/en/concepts/package-or-application).

## What the generated PHP looks like

The generated code follows Laravel 13 conventions and passes `pint --test` and Larastan level 5:

- **Models:** casts are declared with the `casts(): array` method, and the observer, policy and factory are linked with `#[ObservedBy]`, `#[UsePolicy]` and `#[UseFactory]` instead of being discovered through reflection.
- **Controllers:** they implement `HasMiddleware` with a static `middleware()`; the base controller doesn't extend `Illuminate\Routing\Controller`.
- **Routes:** `[Controlador::class, 'método']` callables, so the `RouteServiceProvider` doesn't declare a controller namespace.
- **Providers:** they extend `Illuminate\Support\ServiceProvider`.
- **Migrations, requests, policies and resources:** signatures with return types (`up(): void`, `rules(): array`, `toArray(Request $request): array`).
- **Events:** they take the request's locale in a `locale` parameter, without changing the application's locale.
