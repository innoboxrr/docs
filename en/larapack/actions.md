# Routes, immutables, secrets and users

By default a model has twelve actions: the right shape for something a person manages from a screen, and the wrong one for much of a real system. An audit log is only appended to, a catalog is only read, a grant is given and revoked but never edited, and a credential is listed without its secret ever leaving the server.

You don't solve that by generating everything and deleting what you don't need: whatever is deleted by hand stays flagged as edited forever, `larapack:verify` reports it as drift, and the contract stops describing the code. Instead you declare it with four keys: `routes`, `immutable`, `secret` and `authenticatable`. Without them, a model has every action.

What isn't one of the twelve —publishing, importing a roster, a desk, a webhook— isn't written by hand either: it's declared with `endpoints` or `controllers`. See [Declared endpoints](/en/larapack/endpoints).

## The twelve actions

| Action | Verb and URI | Route name | Request | Policy ability | Event |
|---|---|---|---|---|---|
| `policies` | `GET policies` | `policies` | `PoliciesRequest` | None: responds with all of them | — |
| `policy` | `GET policy` | `policy` | `PolicyRequest` | The one requested | — |
| `index` | `GET index` | `index` | `IndexRequest` | `index` | — |
| `show` | `GET show` | `show` | `ShowRequest` | `view` | — |
| `create` | `POST create` | `create` | `CreateRequest` | `create` | `CreateEvent` |
| `update` | `PUT update` | `update` | `UpdateRequest` | `update` | `UpdateEvent` |
| `delete` | `DELETE delete` | `delete` | `DeleteRequest` | `delete` | `DeleteEvent` |
| `restore` | `POST restore` | `restore` | `RestoreRequest` | `restore` | `RestoreEvent` |
| `forceDelete` | `DELETE force-delete` | `force.delete` | `ForceDeleteRequest` | `forceDelete` | `ForceDeleteEvent` |
| `export` | `POST export` | `export` | `ExportRequest` | `export` | `ExportEvent` |
| `bulkUpdate` | `PUT bulk-update` | `bulk.update` | `BulkUpdateRequest` | `update`, record by record | `UpdateEvent` per record |
| `bulkDelete` | `DELETE bulk-delete` | `bulk.delete` | `BulkDeleteRequest` | `delete`, record by record | `DeleteEvent` per record |

The full URI carries the model's prefix, `api/acme/catalogo/order_line/force-delete`, and so does the full name: `api.acme.catalogo.order_line.force.delete`. They all require `auth:sanctum`.

What each one receives:

| Action | Parameters |
|---|---|
| `policies` | `id`, optional: with it, the abilities on that record. Responds with an object holding `true` or `false` for each controller method and for its ability. |
| `policy` | `policy`, one of `index`, `view`, `viewAny`, `create`, `update`, `delete`, `restore`, `forceDelete` or `export`; and `id`, required for `view`, `update`, `delete`, `restore` and `forceDelete`. |
| `index` | The search-surge parameters: `paginate`, `page`, `orderBy`, `orderMode`, the filters and `managed`. See [support, traits and search-surge](/en/packages/support-traits-search). |
| `show` | `<modelo>_id`, and optionally `load_relations` and `load_counts`, limited to `$loadable_relations` and `$loadable_counts`. |
| `create` | The fields; those in `$creatable` are saved. |
| `update` | `<modelo>_id` and the fields; those in `$updatable` are saved. |
| `delete`, `restore`, `forceDelete` | `<modelo>_id`. |
| `export` | The filters. See [Export to Excel](/en/larapack/export). |
| `bulkUpdate` | `ids` and `data`. See [Bulk actions](#bulk-actions). |
| `bulkDelete` | `ids`. |

The generated policy has `index` and `viewAny` (with `index`), `view` (with `show`), `create`, `update`, `delete`, `restore`, `forceDelete` and `export`, each one present with its action, and all of them return `false`. Its `before()` lets through the user whose `isAdmin()` returns `true`, except for the abilities in `$exceptAbilities`, which starts out with `forceDelete`: not even the admin can force-delete until you decide otherwise.

## routes {#routes}

```json
{ "name": "ApiKey", "routes": { "except": ["update", "restore", "forceDelete"] }, "props": [] }
```

```json
{ "name": "Country", "routes": { "only": ["policies", "policy", "index", "show"] }, "props": [] }
```

- **`only`**: only these actions. **`except`**: every action except these. Never both.
- Without the key, all twelve.

The remaining actions are always computed the same way, in this order:

1. Start from `only`, or from all twelve.
2. Remove those in `except`.
3. If the model is `immutable`, remove `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` and `bulkDelete`.
4. Remove `bulkUpdate` if `update` is gone, and `bulkDelete` if `delete` is gone: a bulk action uses the policy and rules of its single-record counterpart.

That's why `"except": ["delete"]` also removes bulk delete, without an error. Asking for a bulk action in `only` without its single-record counterpart is an error, though, because someone asked for it explicitly.

### What hangs off each action

Removing an action removes everything that depends on it:

| Piece | What is removed |
|---|---|
| Routes and controller | Its route, and its method and import in the controller. A model with no actions at all has no controller and no routes file. |
| Request | Its file. |
| Event | Its event and its listeners (`create`, `update`, `delete`, `restore`, `forceDelete` and `export`). |
| Policy | Its method. |
| Observer | Its handler: `updated`, `deleted`, `restored` or `forceDeleted`. `created` is always there. |
| Storage | `restoreModel()`, without `restore`. |
| Model and migration | `SoftDeletes` and `$table->softDeletes()`, if none of `delete`, `restore` and `forceDelete` remains. |
| Resource | Its row actions: "Show" without `show`, "Edit" without `update` or without `show`, "Delete" without `delete`. |
| Export | The export class, the Excel view, the notification and its listener, without `export`. |
| Test | Its test. |
| JS contract | Its function: `getPolicies`, `getPolicy`, `indexModel`, `showModel`, `createModel`, `updateModel`, `deleteModel`, `restoreModel`, `forceDeleteModel`, `exportModel`, `bulkUpdateModels` and `updateField`, `bulkDeleteModels`. |
| Table toolbar and palette | "Create" without `create`; "Export" without `export`; the selection actions without `bulkUpdate` or `bulkDelete`. |
| Store | `fetchIndex`, `fetchOne`, `fetchPolicies`, `create`, `update` and `remove`, each with its action. |
| Views and forms | Those that need that action (see [the module](/en/larapack/generated-code#the-interface-module)), the child route, the drawer and the entry in the detail page's menu. |

What always remains: the model, its traits, its filters, the policy with its `before()`, the observer, the factory, the migration, the resource and the test file.

::: tip Views need `index` and `policies`
The views hang off the index route, and the table queries the policies to decide which actions to offer. Editing also hangs off the detail route, so it needs `show`. With `--vue` or `--react`, validation warns you about anything missing.
:::

## immutable {#immutable}

```json
{
    "name": "AuditEvent",
    "immutable": true,
    "routes": { "only": ["policies", "index", "show", "export"] },
    "props": [
        { "name": "action", "type": "string", "datatable": true },
        { "name": "details", "type": "longText", "cast": "json" }
    ]
}
```

An immutable row, once created, is never modified or deleted.

- **It removes** `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` and `bulkDelete`, with everything that hangs off them.
- **Creating is still allowed**: an immutable row has to be born (a consent, an accounting entry, a delivery record). If it shouldn't be created through the API either, remove it with `routes`, as in the example.
- **The model defends itself.** Removing the routes blocks access over HTTP, but it doesn't stop your own code from calling `save()` or `delete()`. The model registers two guards:

```php
protected static function booted(): void
{
    $refuse = static function (): never {
        throw new \LogicException('AuditEvent es inmutable: sus filas no se modifican ni se borran.');
    };

    static::updating($refuse);
    static::deleting($refuse);
}
```

- **The test checks it**: that no write routes are registered, and that modifying or deleting a record throws `LogicException`.
- **`larapack:verify` watches it** with `immutable-write`: a write route, method, request or component, or the model without its guards.

::: warning What the guard doesn't cover
A mass update through the query builder, such as `AuditEvent::query()->update([...])`, doesn't load models or fire events, so it never goes through `booted()`. If the domain needs that guaranteed there too, enforce it in the database.
:::

## secret {#secret}

```json
{
    "name": "ApiKey",
    "routes": { "except": ["update", "restore", "forceDelete"] },
    "props": [
        { "name": "label", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true },
        { "name": "token_hash", "type": "string", "secret": true }
    ]
}
```

A secret column is written but never read: a token hash, a credential.

- **It goes into the model's `$hidden`.** The generated resource returns `parent::toArray()`, so it never leaves through the API, or through any other serialization.
- **It never appears in the table or the export.** `datatable` and `exports_cols` are set to `false` even if you don't write it; writing either one as `true` is a validation error.
- **It's still assignable**: `fillable`, `creatable` and `updatable` keep their values.
- It generates no per-value bulk actions, can't be edited inline and can't be `display`.
- **`larapack:verify` watches it** with `secret-exposed`: a secret column outside `$hidden`, in `$export_cols`, named in the resource or used as a table column.

::: danger Never "just for debugging"
Naming a secret in the resource exposes it even if it's in `$hidden`, and `verify` rightly fails. If you need to see the value, look it up in the database, not through the API.
:::

## authenticatable {#authenticatable}

```json
{
    "name": "User",
    "authenticatable": true,
    "routes": { "except": ["create"] },
    "props": [
        { "name": "name", "type": "string", "datatable": true },
        { "name": "email", "type": "string", "datatable": true },
        { "name": "email_verified_at", "type": "timestamp", "nullable": true, "fillable": false },
        { "name": "password", "type": "string", "updatable": false }
    ]
}
```

The model is the user who logs in, with the same architecture as any other model: API, policies, tests and its module in the admin panel. What changes:

- It extends `Illuminate\Foundation\Auth\User` and uses `Notifiable` and `HasApiTokens`, so the application needs `laravel/sanctum`.
- `password` and `remember_token` go into `$hidden`, and stay out of the table and the export even if declared.
- If they're declared and have no cast of their own, `email_verified_at` is cast to `datetime` and `password` to `hashed`: the password is stored hashed without anyone doing it by hand.
- `isAdmin()` compares the email, case-insensitively, against `config('auth.admins')`. That's what the `before()` of every generated policy checks, in this model and in all the others.
- It must declare `email` and `password`: without them, `larapack:validate` fails.

The application defines the list of admins in `config/auth.php`. The base application reads it from `ADMIN_EMAILS`:

```php
'admins' => array_values(array_filter(array_map('trim', explode(',', env('ADMIN_EMAILS'))))),
```

::: tip `remember_token` isn't added as a column
LaraPack doesn't add `remember_token` to `props`. In an application, the `users` table is created by Laravel's own migration, which LaraPack doesn't alter: see [Migrations LaraPack did not generate](/en/larapack/migrations#migrations-larapack-did-not-generate).
:::

`isAdmin()` is a starting point: replace it with your role system once you have one. How the base application uses it is covered in [Authentication and users](/en/app-base/auth).

## display {#display}

The column that names a record on screen: the title of its detail page, its breadcrumb and the browser tab title.

```json
{ "name": "Product", "display": "sku", "props": [ { "name": "sku", "type": "string" } ] }
```

Without the key, it's chosen automatically:

1. `name`, if it exists;
2. otherwise, `title`;
3. otherwise, the first text column (`string`, `char`, `text`, `tinyText`, `mediumText` or `longText`) that isn't `secret` or `payload`, preferring those with `datatable`;
4. if there are none, `id`.

A column that doesn't exist, or a `secret` one, is a validation error. A model generated without laraimport, with `larapack:full-model`, is named by `name`.

## Bulk actions {#bulk-actions}

`bulkUpdate` and `bulkDelete` are the single-record action applied to several records.

### In the API

| | `bulkUpdate` | `bulkDelete` |
|---|---|---|
| Request | `PUT bulk-update` with `ids` and `data` | `DELETE bulk-delete` with `ids` |
| Validation | `ids` required, between 1 and 500 distinct integers; `data` required, an object with at least one field; every `UpdateRequest` rule except the identifier's, as `data.<campo>` and preceded by `sometimes` | `ids` required, between 1 and 500 distinct integers |
| Authorization | The `update` ability on **each** record | The `delete` ability on each record |
| What it does | `updateModel()` on each record, with `data`: only `$updatable` and the editable metas | `deleteModel()` on each record |

- **All or nothing.** If any record can't be touched, it responds 403 and none are touched. If an id doesn't exist, it responds 404. The work runs inside a transaction.
- **Events fire at the end**, one per record, once the change is committed.
- **It responds** with the resource collection.
- `PoliciesRequest` maps `bulkUpdate` to `update` and `bulkDelete` to `delete` when it responds with the abilities.

`sometimes` means a field that isn't sent is neither required nor touched: you can change a single field across many records.

### In the table

The contract declares the selection actions in `bulkActions()`:

```js
export const bulkActions = () => [
    {
        id: 'status-published',
        name: t('Status') + ': ' + t('Published'),
        success: t('Records updated'),
        callback: 'bulkUpdateModels',
        icon: 'edit',
        params: { status: 'published' },
    },
    {
        id: 'bulkDelete',
        name: t('Delete'),
        success: t('Records deleted'),
        callback: 'bulkDeleteModels',
        icon: 'delete',
        danger: true,
        params: {},
    },
]
```

- **One action per `enum` value**, if the model has `bulkUpdate` and the property has `enum`, is `updatable` and isn't `secret`: "Status: Published" sets that value on every selected record.
- **"Delete"** with `bulkDelete`, which asks first with the theme's confirmation dialog.
- The table calls `model[callback](ids, filas, params)` and then reloads. The ids include those selected on other pages.
- The selection checkboxes only appear if `bulkActions()` returns at least one action.

## Inline editing {#inline-editing}

A single-line text column that the form already edits can be edited in its cell: click, type, and Enter or leaving the cell saves just that field.

A column is editable inline when all of the following hold:

- the model has `bulkUpdate`;
- the property has `datatable`, `form` and `updatable`;
- its type is `string` or `char`, and its component is `TextInputComponent`;
- it isn't `secret` and has no `enum`: an enum gets its bulk actions instead.

The contract declares it like this:

```js
{
    id: 'title',
    value: t('Title'),
    sortable: true,
    html: false,
    component: 'ClickToEdit',
    parser: (value, row) => ({ value, label: t('Title'), save: (next) => updateField(row.id, 'title', next) }),
},
```

- `updateField(id, campo, valor)` calls `bulkUpdateModels([id], [], { campo: valor })`, so it goes through the `update` policy and the `UpdateRequest` rules.
- If the API rejects it, it throws an error with the `data.<campo>` message and the cell shows it **without closing**.
- The contract only names the component. Each `DataTable` widget provides it through `dataTableComponents`: `ClickToEditComponent` in Vue and, in React, a wrapper that passes `save` as `onSave`.

## The same primitives without laraimport

`larapack:full-model` accepts the same decisions for a standalone model:

```bash
php artisan larapack:full-model AuditEvent --only=policies,index,show --immutable
php artisan larapack:full-model ApiKey --except=update,restore,forceDelete
```

`--only` and `--except` can't be combined, an unknown action is an error, and `--immutable` doesn't allow writes in `--only`. `secret` and `display` can only be declared in laraimport.

Either way, the shape of a model that departs from the default is stored in the manifest under `models.<Model>.declaration`, which is what `larapack:verify` reads.
