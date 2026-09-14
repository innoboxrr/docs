# The architecture of a model

A model declared in `laraimport.json` produces around 58 files. That sounds like a lot, but they follow a single pattern: **each piece does one thing, and the logic you write has a fixed place**. This page is the map; per-file detail lives in [What is generated and where your code goes](/en/larapack/generated-code).

Examples use a `Product` model inside an application. In a package, `app/` is `src/` and `App\` is the package namespace.

## A request from start to finish

Editing a product from the admin panel:

```
PUT /api/app/product/update            name: api.app.product.update
  │
  ├─ ProductController::update          auth:sanctum; no logic
  │
  ├─ UpdateRequest
  │    authorize()  findOrFail(product_id) and can('update', $product)  → ProductPolicy
  │    rules()      product_id plus the JSON rules
  │    handle()     $product->updateModel($this)                        → ProductStorage
  │                   update() with $updatable only, plus metas if any
  │                 new ProductResource($product)                       → includes actions
  │                 event(new UpdateEvent(...))                          → listeners
  │
  └─ JSON: the record and its actions, with no data wrapper
```

- **The controller only delegates.** Each method calls its request's `handle()`.
- **Every action has its own request.** It authorizes against the policy, validates and executes.
- **The model is a facade.** The methods that do the work live in its traits.
- **The Resource decides the response shape** and the actions the interface offers for that row.
- **Side effects go in listeners**, hooked to the action's event.

## The twelve actions

Without a `routes` key, a model has all twelve. Each has its route, controller method, request, event, policy ability, test and, where it applies, a screen. Removing one with `routes` removes it from all of those at once.

| Action | HTTP method | URL (in an application) | Route name | Policy ability |
|---|---|---|---|---|
| `policies` | GET | `api/app/product/policies` | `api.app.product.policies` | Checks all of them |
| `policy` | GET | `api/app/product/policy` | `api.app.product.policy` | |
| `index` | GET | `api/app/product/index` | `api.app.product.index` | `index` |
| `show` | GET | `api/app/product/show` | `api.app.product.show` | `view` |
| `create` | POST | `api/app/product/create` | `api.app.product.create` | `create` |
| `update` | PUT | `api/app/product/update` | `api.app.product.update` | `update` |
| `delete` | DELETE | `api/app/product/delete` | `api.app.product.delete` | `delete` |
| `restore` | POST | `api/app/product/restore` | `api.app.product.restore` | `restore` |
| `forceDelete` | DELETE | `api/app/product/force-delete` | `api.app.product.force.delete` | `forceDelete` |
| `export` | POST | `api/app/product/export` | `api.app.product.export` | `export` |
| `bulkUpdate` | PUT | `api/app/product/bulk-update` | `api.app.product.bulk.update` | `update`, per record |
| `bulkDelete` | DELETE | `api/app/product/bulk-delete` | `api.app.product.bulk.delete` | `delete`, per record |

`policies` answers, for the current user and an optional record, which actions they may perform. It's what the table asks before showing a button.

Three switches change the model's shape without touching code:

- `routes` with `only` or `except` chooses which actions exist. Without `delete`, `restore` and `forceDelete`, the model also drops soft deletes.
- `immutable: true` removes update, delete and both bulk actions, and the model rejects Eloquent modifications.
- `secret: true` on a column keeps it out of responses, exports and the table.

See [Routes, immutables, secrets and users](/en/larapack/actions).

## The layers of a model

### Domain

| File | What it is |
|---|---|
| `app/Models/Product.php` | The facade. Its lists (`$fillable`, `$creatable`, `$updatable`, `$export_cols`, `$loadable_relations`, `$loadable_counts`) and `casts()` come from the JSON. |
| `Traits/Relations/ProductRelations.php` | Relations. **Slot.** |
| `Traits/Operations/ProductOperations.php` | Business logic. **Slot**, and the default place. |
| `Traits/Storage/ProductStorage.php` | Create, update and delete, and meta saving. **Slot** for files. |
| `Traits/Mutators/ProductMutators.php` | Accessors and mutators. **Slot.** |
| `Traits/Assignments/ProductAssignment.php` | Generated empty. |
| `Filters/Product/ManagedFilter.php` | Which records of the index each user sees. **Slot.** |
| `Filters/Product/{Id,Creation,Updated,EagerLoading}Filter.php` | Index filters, built on search-surge. |
| `app/Policies/ProductPolicy.php` | Authorization per action. **Slot.** Starts closed. |
| `app/Observers/ProductObserver.php` | Model lifecycle. **Slot.** |
| `app/Models/ProductMeta.php` | Only with `metas: true`. |

### HTTP

| File | What it is |
|---|---|
| `app/Http/Controllers/ProductController.php` | Delegates to the requests. |
| `app/Http/Requests/Product/*Request.php` | One per action. `rules()` is a **slot**, inside the array. |
| `app/Http/Resources/Models/ProductResource.php` | Response shape and the `actions` array. **Slot.** |
| `app/Http/Events/Product/Events/*` | One event per action. |
| `app/Http/Events/Product/Listeners/*/*` | Side effects. **Slot.** |
| `routes/api/models/product.php` | The routes. The file name is snake_case: `order_line.php`. |

### Export, data and tests

| File | What it is |
|---|---|
| `app/Exports/ProductsExports.php` | The Excel export. |
| `app/Notifications/Product/ExportNotification.php` | The notification with the download link. |
| `database/migrations/*_create_products_table.php` | The table, plus `*_alter_products_table.php` when columns change. |
| `database/factories/ProductFactory.php` | Test data that already inserts. **Slot.** |
| `tests/Feature/Models/ProductEndpointsTest.php` | Exercises every endpoint. **Slot.** |

### Interface

Everything lives in `resources/<ui>/src/models/product/`, with the same structure in Vue and React:

| File | What it is |
|---|---|
| `index.js` | **The model contract.** Pure functions and HTTP calls: `API_ROUTE_PREFIX`, `crudActions()`, `bulkActions()`, `dataTableHead()`, `dataTableSort()`, the CRUD functions. **It's the same file in Vue and React.** |
| `store/index.js` | Pinia in Vue, Zustand in React, with the same surface. |
| `routes/index.js` | The routes `AdminProducts`, `AdminCreateProduct`, `AdminShowProduct`, `AdminEditProduct`. |
| `forms/` | `CreateForm`, `EditForm`, `FilterForm`. |
| `views/` | `AdminView` (the table), `CreateView`, `ShowView`, `EditView`. |
| `widgets/` | `DataTable`, `ModelCard`, `ModelProfile`. |

At module level: `resources/<ui>/index.js` (the entry point), `src/routes.js`, `src/i18n.js`, `src/locales/{en,es}.json`, `src/theme.js` and `src/components/{ActionMenu,Breadcrumbs}`. In a package, also `package.json` and `vite.config.js`.

## Where your code goes

| Slot | What goes there |
|---|---|
| `Traits/Operations` | Business logic. With metas, also the shape of `payload` in `buildPayload()`. |
| `Traits/Relations` | Relations the JSON doesn't declare. |
| `Traits/Storage` | File uploads and deletion. |
| `Traits/Mutators` | Accessors and mutators. |
| `ManagedFilter::canView` | **Who sees what.** Without it, the index returns everything. |
| Policy | Authorization per action. Starts closed: only the administrator passes, and not even they can force delete until you take `forceDelete` out of `$exceptAbilities`. |
| `Requests/*/rules()` | Rules not coming from the JSON, inside the array. |
| Resource | The exact response shape and its `actions` array. |
| Listeners and observer | Side effects and lifecycle. |
| Factory | Realistic test data. |
| `tests/Feature` | Behavior. |

**The model is a facade, not a place to pile logic.** A public method in `Operations` orchestrates, and the real work lives in whichever class it belongs to.

If some logic fits in none of these slots, something is missing from `laraimport.json`.

## What you don't touch

- The controller and the routes file. If an endpoint is missing, it's missing from the JSON or the generator.
- The model's lists (`$fillable`, `$creatable`, `$updatable`, `$export_cols`, `$loadable_relations`, `$loadable_counts`, `$editable_metas`, `$protected_metas`) and `casts()`: they come from the JSON.
- Anything outside the `//RULES//`, `//IMPORTS//` and `//EDIT//` markers in files that have them.
- `models/<entity>/index.js` in only one of the two frameworks: it would split them.

Writing in these places is exactly the drift `larapack:verify` reports.

## Regenerating without destroying

`.larapack/manifest.json` records every generated file, the template it came from and its content hash. With that:

- `larapack:import --force` regenerates files whose hash hasn't changed and **keeps the ones you edited**, with a warning.
- A file the manifest doesn't know is left alone: the generator doesn't touch what it didn't write.
- The Relations, Storage and Operations traits are only created when missing, and generated tests are never overwritten, not even with `--force`.
- A column change on an existing table produces a new alter migration, not a rewrite of the create migration.

`larapack:verify` reads the same manifest and reports missing files, edited files, undeclared routes, writes to an immutable model and exposed secrets. See [Verify and audit](/en/larapack/verify).

Next: [The front ↔ back contract](/en/concepts/front-back).
