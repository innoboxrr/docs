# The contract: laraimport.json

`laraimport.json` isn't a configuration file: it's the contract the whole architecture comes from. It's described by a JSON Schema (draft 2020-12, `$id` `https://innoboxrr.com/schemas/laraimport/1.json`) that ships with LaraPack in `schema/laraimport.schema.json`. LaraPack's `composer.json` also declares it in `extra.larapack.schema`, so a tool can find it without knowing the package layout.

```bash
php vendor/bin/builder larapack:schema          # prints the schema
php vendor/bin/builder larapack:schema --path   # only the file path
```

::: tip Read the schema, not an example
Examples age. The schema is what the importer validates against, and the defaults come from it: the importer reads them from the schema itself, not from a copy in PHP. Add `$schema` to the file and your editor will validate it as you type.
:::

## The minimum

Only `models[].name`, `props[].name` and `props[].type` are required. Everything else has the default the schema declares, so the file only states what is actually decided:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "Category",
            "props": [
                { "name": "name", "type": "string" }
            ]
        }
    ]
}
```

Don't fill every property with its default keys: the file becomes unreadable and the output doesn't change.

## How it's validated

`larapack:validate` and `larapack:import` do the same thing, in this order:

1. **Shape**, against the schema: types, closed enums, no unknown key in any object, `form: true` requires `form_component`, and `foreignId` requires `constraint`. Declaring `only` together with `except` gets its own message.
2. **Coherence**, over the document once defaults are applied: what the schema can't express because it looks at several parts at once. It's listed in [Errors and warnings](#errors-and-warnings).

If the shape fails, coherence isn't evaluated. An error blocks: `validate` exits 1 and `import` writes nothing. A warning doesn't block, except with `larapack:validate --strict`.

## Document root

| Key | Type | Default | What it is |
|---|---|---|---|
| `$schema` | string | — | Path or URL of the schema, for the editor. LaraPack doesn't read it. |
| `version` | integer, `const 1` | `1` | Contract version. |
| `models` | array of [models](#model), at least one | required | The models. Order doesn't matter. |
| `pivots` | array of [pivots](#pivot) | `[]` | Pivot tables: only their migration, no model. |

No other keys are allowed.

## Model {#model}

| Key | Type | Default | What it is |
|---|---|---|---|
| `name` | PascalCase (`^[A-Z][A-Za-z0-9]*$`) | required | Class name, singular. Everything else derives from it. |
| `props` | array of [properties](#property), at least one | required | The columns. |
| `metas` | boolean | `false` | Generates the `<model>_metas` table, the `<Model>Meta` model, the `metas()` relation, the `payload` column and meta saving on create and update. See [Metas and payload](/en/larapack/metas). |
| `editable_metas` | array of snake_case | `[]` | Metas the form may write, with the flattened name (`seo_title`). An empty value deletes the meta. |
| `protected_metas` | array of snake_case | `[]` | Metas only your code writes, with `setMeta()` or `setMetas()`. Ignored if they arrive in the request, even when also in `editable_metas`. |
| `display` | snake_case | resolved automatically | The column that names a record on its detail page, in breadcrumbs and in the tab title. See [display](/en/larapack/actions#display). |
| `load_relations` | array of [relations](#relation) | `[]` | Each relation: its method in the `Relations` trait and its name in `$loadable_relations`. |
| `load_counts` | array of snake_case | `[]` | Relations whose count may be requested with `withCount`: the `$loadable_counts` list. |
| `requests` | array of [requests](#request) | `[]` | Validation rules for `CreateRequest` and `UpdateRequest`. |
| `routes` | object with `only` or `except` | every action | Which actions the model generates. See [routes](/en/larapack/actions#routes). |
| `immutable` | boolean | `false` | The row isn't modified or deleted once created. See [immutable](/en/larapack/actions#immutable). |
| `authenticatable` | boolean | `false` | The model is the user who logs in. See [authenticatable](/en/larapack/actions#authenticatable). |
| `assignments` | array | — | **Deprecated.** Accepted and not read: the `Assignment` trait is always generated the same way. |
| `filters` | array | — | **Deprecated.** Accepted and not read: filters are a fixed set. |

### What derives from the name

For `"name": "OrderLine"` in a package with namespace `Acme\Shop\`:

| Piece | Value |
|---|---|
| Table | `order_lines` (the plural comes from Laravel's pluralizer) |
| Routes file | `routes/api/models/order_line.php` |
| URL | `api/acme/shop/order_line/<action>`; in an application, `api/app/order_line/<action>` |
| Route names | `api.acme.shop.order_line.*`; in an application, `api.app.order_line.*` |
| JS contract `API_ROUTE_PREFIX` | `api.acme.shop.order_line.` |
| Identifier in requests | `order_line_id` |
| Meta table and model | `order_line_metas` and `OrderLineMeta` |
| Interface module folder | `resources/<ui>/src/models/order-line` |
| Interface routes | path `order-line`, with the names `AdminOrderLines`, `AdminCreateOrderLine`, `AdminShowOrderLine` and `AdminEditOrderLine` |
| Store | `useOrderLineStore`, with id `acme.shop.order_line` |
| On-screen texts | `Order line` and `Order lines`, which are translation keys |
| Export | `OrderLinesExports` and the view `resources/views/excel/order_line.blade.php` |

The model segment is always snake_case, in a package and in an application. Only the interface folder and path use kebab-case.

## Property {#property}

| Key | Type | Default | What it is |
|---|---|---|---|
| `name` | snake_case (`^[a-z][a-z0-9_]*$`) | required | Column name. |
| `type` | [column type](#column-types) | required | The `Blueprint` method that creates it. |
| `nullable` | boolean | `false` | Adds `->nullable()`. |
| `default` | string, number, boolean or null | `null` | Adds `->default(...)`: a boolean as `true` or `false`, a number as is, and text in quotes. |
| `constraint` | string or null | `null` | Table the foreign key points to. Only has an effect with `foreignId`, where it is **required and non-empty**: adds `->constrained('<table>')->onUpdate('cascade')->onDelete('cascade')`. |
| `cast` | string or null | `null` | Eloquent cast, in the model's `casts()` method. |
| `fillable` | boolean | `true` | Goes into `$fillable`. |
| `creatable` | boolean | `true` | Goes into `$creatable`: what `createModel()` takes from the request. |
| `updatable` | boolean | `true` | Goes into `$updatable`: what `updateModel()` takes from the request. |
| `exports_cols` | boolean | `true` | Is an Excel export column (`$export_cols`). |
| `form` | boolean | `false` | Is a field of `CreateForm`, `EditForm` and `FilterForm`. Requires `form_component`. |
| `form_component` | [component](#form-components) or null | `null` | Which component renders it. Required when `form` is `true`. |
| `form_submit` | boolean | `false` | Is sent on create and update. With `form: false` it becomes a form prop: the value comes from outside, like a `user_id`. |
| `datatable` | boolean | `false` | Is a table column. The first one with `datatable` sets the default sort. |
| `enum` | object value → label, at least one entry | — | The field's options: those of a `SelectInputComponent`, the label in the table, a select in the filter, one bulk action per value and the factory's values. |
| `secret` | boolean | `false` | Never leaves through the API: goes into `$hidden`, and never into the table or the export. Written, not read. See [secret](/en/larapack/actions#secret). |

::: tip `id`, timestamps and soft deletes
The migration adds `$table->id()`, `$table->timestamps()` and, if the model has `delete`, `restore` or `forceDelete`, `$table->softDeletes()`. There's no need to declare those columns.
:::

### Column types {#column-types}

The enum is closed. Each value is the `Blueprint` method called with the property name:

`bigIncrements`, `bigInteger`, `binary`, `boolean`, `char`, `date`, `dateTime`, `dateTimeTz`, `decimal`, `double`, `enum`, `float`, `foreignId`, `foreignUuid`, `geometry`, `increments`, `integer`, `ipAddress`, `json`, `jsonb`, `longText`, `macAddress`, `mediumInteger`, `mediumText`, `morphs`, `nullableMorphs`, `smallInteger`, `string`, `text`, `time`, `timeTz`, `timestamp`, `timestampTz`, `tinyInteger`, `tinyText`, `unsignedBigInteger`, `unsignedInteger`, `unsignedSmallInteger`, `unsignedTinyInteger`, `uuid`, `year`.

::: warning Types that need something more
- **`enum`** is written as `$table->enum('name')`, without the list of values Laravel requires. For a field with options, declare `"type": "string"` and the `enum` key.
- **`foreignUuid`** doesn't get `->constrained()`: the constraint is only added to `foreignId`.
- **`morphs`** and **`nullableMorphs`** create two columns (`<name>_id` and `<name>_type`), and the factory gives them no value.
:::

### Form components {#form-components}

These are the 27 names that `innoboxrr-form-elements` (Vue) and `innoboxrr-react-form-elements` (React) both export, so the same `laraimport.json` works for both modules:

`AvatarInputComponent`, `CheckboxInputComponent`, `ClickToEditComponent`, `CodeInputComponent`, `CodeMirrorComponent`, `ColorPickerInputComponent`, `CountrySelectInputComponent`, `DynamicGroupInputComponent`, `EditorInputComponent`, `FileDropInputComponent`, `FileInputComponent`, `FqsInputComponent`, `ModelSearchInputComponent`, `MultiCheckboxInputComponent`, `PolymorphicInputComponent`, `RadioInputComponent`, `SelectInputComponent`, `SelectSearchInputComponent`, `SimpleFileInputComponent`, `SingleCheckboxInputComponent`, `StarsInputComponent`, `SwitchComponent`, `TagsInputComponent`, `TextEditorMonoStyleInputComponent`, `TextInputComponent`, `TextareaInputComponent`, `TimezoneSelectInputComponent`.

How each is written in `CreateForm` and `EditForm`:

| Component | What it gets |
|---|---|
| `SelectInputComponent` | `name`, the label, `validators="required"`, the data binding and one option per `enum` value; without `enum`, a single empty option. |
| `EditorInputComponent` | The same as the rest, plus an `id` unique per form and a height of 300. No file uploads. |
| `TextInputComponent` | `type="text"` and a placeholder with the label. |
| `TextareaInputComponent` | A placeholder with the label. |
| Everything else | `name`, the label, `validators="required"` and the data binding: `v-model` in Vue, `value` and `onChange` in React. |

The label is the translation key of the column name: `unit_price` renders as `t('Unit price')`. In `FilterForm` the component doesn't come from `form_component`: it's a `SelectInputComponent` if the property has `enum` and a `TextInputComponent` otherwise. Details in [The generated UI](/en/larapack/ui#forms).

## Relation {#relation}

| Key | Type | Default | What it is |
|---|---|---|---|
| `type` | `belongsTo`, `hasOne`, `hasMany`, `belongsToMany`, `morphTo`, `morphOne`, `morphMany` or `morphToMany` | required | The Eloquent method. |
| `related` | PascalCase | required | The related model. |
| `name` | snake_case | required | The relation method name. |
| `namespace` | string | resolved automatically | Namespace of the related model. Only needed when it's neither in this file nor in `App\Models`. |

Each relation generates, in `Traits/Relations/<Model>Relations.php`, a method `return $this-><type>(<Related>::class);` with its `use`, and adds its `name` to `$loadable_relations`, which is the list `show` accepts in `load_relations`.

::: warning Methods are written when the trait is created
The `Relations` trait is only created if it doesn't exist and is never rewritten, not even with `--force`. A relation you add to `load_relations` later enters `$loadable_relations` when the model is regenerated, but you write its method in the trait. Complete the polymorphic ones there too (`morphTo`, `morphOne`, `morphMany`, `morphToMany`), which need arguments other than the class name.
:::

## Request {#request}

| Key | Type | Default | What it is |
|---|---|---|---|
| `name` | `Create` or `Update` | required | Which request gets the rules. The other requests have fixed rules. |
| `rules` | object field → string or array of strings | — | Laravel rules. Use an array for any rule containing a pipe, such as a `regex:`. |

Rules are injected at the `//RULES//` marker in `rules()`. Whatever the request declares outside the marker is left alone.

- **`UpdateRequest` needs the identifier rule**, `<model>_id` (`post_id`): its `authorize()` and `handle()` call `findOrFail` with that value. The stub already has it as `required|numeric`. Declaring `Update` rules without it is a validation error, and if you declare it, yours replaces the stub's.
- A rule on something that's neither a column nor the identifier is a warning: it validates nothing and is usually a typo.
- Rules for an action the model doesn't have are a warning: that request isn't generated.
- `BulkUpdateRequest` reuses the rules of `UpdateRequest`, each prefixed with `sometimes`. See [Bulk actions](/en/larapack/actions#bulk-actions).

## Pivot {#pivot}

| Key | Type | Default | What it is |
|---|---|---|---|
| `name` | snake_case | required | Table name. By convention, both models singular and in alphabetical order: `post_tag`. |
| `props` | array, at least one | required | The columns. |

Each pivot column allows only these keys:

| Key | Type | Default | What it is |
|---|---|---|---|
| `name` | snake_case | required | Column name. |
| `type` | [column type](#column-types) | required | |
| `nullable` | boolean | `false` | |
| `default` | string, number, boolean or null | `null` | In a pivot it's always written in quotes. |
| `constraint` | string or null | `null` | Required and non-empty with `foreignId`. |

A pivot generates only `database/migrations/<date>_create_<name>_table.php`, with `id()`, its columns and `timestamps()`. See [Migrations](/en/larapack/migrations#pivots).

## Actions {#actions}

`routes.only` and `routes.except` take names from this enum, without repeats: `policies`, `policy`, `index`, `show`, `create`, `update`, `delete`, `restore`, `forceDelete`, `export`, `bulkUpdate`, `bulkDelete`. `routes` needs one of the two keys and doesn't allow both. What hangs off each action is in [Routes, immutables, secrets and users](/en/larapack/actions).

## Errors and warnings {#errors-and-warnings}

Each finding has `level` (`error` or `warning`), `path` (the JSON pointer of the value) and `message`. Messages are in Spanish. In paths, `<i>` is the model's or pivot's position and `<j>` that of the property, relation or request.

### Errors

They block generation.

| What | `path` | Why |
|---|---|---|
| A shape failure against the schema | the failing value | A type, a value outside its enum, an unknown key, `form` without `form_component` or `foreignId` without `constraint`. |
| `routes` with `only` and `except` | `/models/<i>/routes` | Together they have no single reading. |
| A model declared twice | `/models/<i>/name` | |
| A column declared twice in the same model | `/models/<i>/props/<j>/name` | |
| A pivot declared twice | `/pivots/<i>/name` | |
| A foreign key to its own table that isn't `nullable` | `/models/<i>/props/<j>` | The first row could never be inserted. |
| A foreign key cycle between models in the file | `/models` | No migration order is possible. |
| `Update` rules without `<model>_id`, in a model with `update` | `/models/<i>/requests/<j>/rules` | `authorize()` and `handle()` need it. |
| `immutable` with `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` or `bulkDelete` in `only` | `/models/<i>/routes/only` | An immutable row isn't modified or deleted. |
| `bulkUpdate` without `update`, or `bulkDelete` without `delete`, in `only` | `/models/<i>/routes/only` | The bulk action uses the single action's policy and rules. |
| `form: true` in a model with neither `create` nor `update` | `/models/<i>/props/<j>/form` | The field has nowhere to live. |
| A `secret` with `datatable: true` or `exports_cols: true` written in the file | `/models/<i>/props/<j>/<key>` | It asks to be shown and hidden at once. |
| `display` that isn't a column | `/models/<i>/display` | The detail page would have no name. |
| `display` that is `secret` | `/models/<i>/display` | It never leaves through the API. |
| `authenticatable` without `email` or without `password` | `/models/<i>/props` | Nobody could log in. |

### Warnings

They don't block. With `larapack:validate --strict` they count as failures.

| What | `path` | What happens |
|---|---|---|
| `restore` or `forceDelete` without `delete` | `/models/<i>/routes` | Nothing in the API produces a deleted row. Fine if another process deletes it. |
| `export` without `index` | `/models/<i>/routes` | Export reuses the index filters. |
| `Create` or `Update` rules without that action | `/models/<i>/requests/<j>` | That request isn't generated and the rules aren't used. |
| `editable_metas` or `protected_metas` without `metas: true` | `/models/<i>/<key>` | There's no table to store them. |
| A meta in both `editable_metas` and `protected_metas` | `/models/<i>/editable_metas` | `protected` wins: the form doesn't write it. |
| `payload` declared with `fillable`, `creatable`, `updatable` or `exports_cols` set to `true`, in a model with metas | `/models/<i>/props/<j>/<key>` | Ignored: the system writes `payload`. |
| A pivot `constraint` to a table that belongs to no model in the file | `/pivots/<i>/props/<j>/constraint` | Make sure it exists. No warning for `users`, `roles`, `permissions` or `teams`. |
| A relation to a model not in the file, without `namespace` | `/models/<i>/load_relations/<j>/related` | Resolves against `App\Models`. |
| A rule on something that's neither a column nor the identifier | `/models/<i>/requests/<j>/rules/<field>` | The rule validates nothing. |
| `enum` on a form field whose component isn't `SelectInputComponent`, `SelectSearchInputComponent`, `RadioInputComponent` or `MultiCheckboxInputComponent` | `/models/<i>/props/<j>/enum` | The component doesn't render the options. |

### Interface warnings

Only with `--vue` or `--react`, in `validate` and `import`: a package that only exposes an API declares models without an index all the time, and a warning nobody needs to act on ends up making nobody read the list. All of them are at `/models/<i>/routes`.

| What | What happens |
|---|---|
| No `index` | The module only gets the contract and the store: views hang off the index. |
| `index` without `policies` | No views are generated: the table queries the policies to decide which actions to offer. |
| `update` without `show` | No edit form: editing hangs off the detail page. |

## What resolves itself

You don't fix these by hand:

- **Model order.** Models are sorted topologically by their foreign keys, so a table's migration is generated after the tables it points to, even if the model is declared first. `larapack:validate` prints that order.
- **Relation namespaces.** A model declared in the same file lives in the same project and the `use` points there; one that isn't resolves against `App\Models`.
- **The list of actions**, from `routes` and `immutable`. Tools don't read `only` or `except`: they ask whether an action is there.
- **`payload` with `metas: true`.** If you don't declare it, it's added as a nullable `longText` with an `array` cast. If you declare it, its type and cast are kept, but it's never assignable, exportable, a table column or a form field.
- **Secrets stay out.** A `secret` property ends with `exports_cols` and `datatable` set to `false` even if you don't write it. In an `authenticatable` model, so do `password` and `remember_token`.
- **`display`**, if you don't declare it: `name`, then `title`, then the first non-secret text column (table columns first) and, if there are none, `id`.

## Complete examples

### A blog: form, table, relations, metas and a pivot

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "Post",
            "metas": true,
            "props": [
                {
                    "name": "title",
                    "type": "string",
                    "form": true,
                    "form_component": "TextInputComponent",
                    "form_submit": true,
                    "datatable": true
                },
                {
                    "name": "status",
                    "type": "string",
                    "cast": "string",
                    "form": true,
                    "form_component": "SelectInputComponent",
                    "form_submit": true,
                    "datatable": true,
                    "enum": {
                        "draft": "Draft",
                        "published": "Published"
                    }
                },
                {
                    "name": "category_id",
                    "type": "foreignId",
                    "constraint": "categories",
                    "form_submit": true
                },
                {
                    "name": "user_id",
                    "type": "foreignId",
                    "constraint": "users",
                    "exports_cols": false,
                    "form_submit": true
                }
            ],
            "load_relations": [
                { "type": "belongsTo", "related": "Category", "name": "category" },
                { "type": "belongsTo", "related": "User", "name": "user", "namespace": "App\\Models" }
            ],
            "editable_metas": ["seo_title", "seo_og_image"],
            "protected_metas": ["views"],
            "requests": [
                {
                    "name": "Create",
                    "rules": {
                        "title": "required|string|max:255",
                        "status": ["required", "in:draft,published"],
                        "category_id": "required|exists:categories,id",
                        "user_id": "required|exists:users,id"
                    }
                },
                {
                    "name": "Update",
                    "rules": {
                        "post_id": "required|numeric",
                        "title": "nullable|string|max:255",
                        "status": ["nullable", "in:draft,published"],
                        "category_id": "nullable|exists:categories,id"
                    }
                }
            ]
        },
        {
            "name": "Category",
            "props": [
                { "name": "name", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true }
            ]
        },
        {
            "name": "Tag",
            "props": [
                { "name": "name", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true }
            ]
        }
    ],
    "pivots": [
        {
            "name": "post_tag",
            "props": [
                { "name": "post_id", "type": "foreignId", "constraint": "posts" },
                { "name": "tag_id", "type": "foreignId", "constraint": "tags" }
            ]
        }
    ]
}
```

Worth noticing:

- `Post` points to `categories`, so the `Category` migration is generated first even though the model is declared later.
- `category_id` and `user_id` are sent without being form fields: both forms receive them as props from outside.
- The `enum` labels are English translation keys; their Spanish translation goes in the module's `src/locales/es.json`.
- `User` declares its `namespace` because it isn't in the file; without it, it would still resolve against `App\Models`, with a warning.

### Tables that aren't managed from a form

```json
{
    "models": [
        {
            "name": "AuditEvent",
            "immutable": true,
            "routes": { "only": ["policies", "index", "show", "export"] },
            "props": [
                { "name": "action", "type": "string", "datatable": true },
                { "name": "details", "type": "longText", "cast": "json" }
            ]
        },
        {
            "name": "ApiKey",
            "routes": { "except": ["update", "restore", "forceDelete"] },
            "props": [
                { "name": "label", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true },
                { "name": "token_hash", "type": "string", "secret": true }
            ]
        }
    ]
}
```

`AuditEvent` is listed, viewed and exported, and nobody modifies it. `ApiKey` is created and revoked but never edited, and its hash never leaves through the API. What each one generates is in [Routes, immutables, secrets and users](/en/larapack/actions).

### The user who logs in

This is the base application's declaration:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "User",
            "authenticatable": true,
            "metas": true,
            "editable_metas": ["avatar"],
            "routes": { "except": ["create"] },
            "props": [
                { "name": "name", "type": "string", "datatable": true, "form": true, "form_component": "TextInputComponent", "form_submit": true },
                { "name": "email", "type": "string", "datatable": true, "form": true, "form_component": "TextInputComponent", "form_submit": true },
                { "name": "email_verified_at", "type": "timestamp", "nullable": true, "fillable": false, "creatable": false, "updatable": false, "datatable": true },
                { "name": "password", "type": "string", "updatable": false, "exports_cols": false }
            ],
            "requests": [
                {
                    "name": "Update",
                    "rules": {
                        "user_id": "required|numeric",
                        "name": "sometimes|required|string|max:255",
                        "email": "sometimes|required|email|max:255"
                    }
                }
            ]
        }
    ]
}
```

Users register through `innoboxrr/laravel-auth`, so the admin API has no `create`. The avatar is an editable meta. See [Authentication and users](/en/app-base/auth).
