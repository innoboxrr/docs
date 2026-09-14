# Your first model

With the [base application](/en/getting-started/new-app) installed, adding a model means declaring it in `laraimport.json` and generating it. This page adds a product catalog and shows it appearing in the admin menu.

## 1. Declare it in `laraimport.json`

The file already contains the `User` model. Add `Product` to the `models` array, after it:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        { "name": "User", "...": "what was already there" },
        {
            "name": "Product",
            "props": [
                {
                    "name": "name",
                    "type": "string",
                    "datatable": true,
                    "form": true,
                    "form_component": "TextInputComponent",
                    "form_submit": true
                },
                {
                    "name": "price",
                    "type": "decimal",
                    "default": 0,
                    "datatable": true,
                    "form": true,
                    "form_component": "TextInputComponent",
                    "form_submit": true
                },
                {
                    "name": "status",
                    "type": "string",
                    "default": "draft",
                    "datatable": true,
                    "form": true,
                    "form_component": "SelectInputComponent",
                    "form_submit": true,
                    "enum": { "draft": "Draft", "published": "Published" }
                },
                {
                    "name": "description",
                    "type": "text",
                    "nullable": true,
                    "form": true,
                    "form_component": "TextareaInputComponent",
                    "form_submit": true
                }
            ],
            "requests": [
                {
                    "name": "Create",
                    "rules": {
                        "name": "required|string|max:255",
                        "price": "required|numeric|min:0",
                        "status": "required|in:draft,published",
                        "description": "nullable|string"
                    }
                },
                {
                    "name": "Update",
                    "rules": {
                        "product_id": "required|numeric",
                        "name": "sometimes|required|string|max:255",
                        "price": "sometimes|required|numeric|min:0",
                        "status": "sometimes|required|in:draft,published",
                        "description": "nullable|string"
                    }
                }
            ]
        }
    ]
}
```

The `{ "name": "User", "...": "what was already there" }` line is shorthand: leave the `User` model exactly as it is.

What each key does:

| Key | What it does |
|---|---|
| `name` | The model name, singular and PascalCase. Everything derives from it: table `products`, routes `api.app.product.*`, screens `AdminProducts`. |
| `type` | The migration column type, using Laravel's names. |
| `datatable` | The column shows up in the admin table. |
| `form` + `form_component` | The field shows up in the forms, with that component. `form: true` requires `form_component`. |
| `form_submit` | The field is sent on create and update. |
| `enum` | Value → label. Turns the field into a select, and the table offers one bulk action per value ("Status: Published"). Only `SelectInputComponent`, `SelectSearchInputComponent`, `RadioInputComponent` and `MultiCheckboxInputComponent` render it. |
| `requests` | Validation rules for create (`Create`) and update (`Update`). |

Without a `routes` key, the model gets all twelve actions: list, show, create, update, delete, restore, force delete, export, the two bulk actions and the two permission endpoints. To limit them, see [Routes, immutables, secrets and users](/en/larapack/actions). Every key is in [The contract: laraimport.json](/en/larapack/laraimport).

::: tip Your editor helps
The `$schema` line makes your editor validate the file and autocomplete keys as you type.
:::

::: warning Update must validate `product_id`
If you declare `Update` rules, include `<model>_id`. The request uses it to find the record before authorizing and saving, and `larapack:validate` fails without it.
:::

## 2. Validate

::: code-group

```bash [Vue]
php artisan larapack:validate laraimport.json --vue
```

```bash [React]
php artisan larapack:validate laraimport.json --react
```

:::

If it fails, fix the JSON, never the code. `--format=json` makes the output readable for an agent, and `--strict` turns warnings into failures. LaraPack's messages are in Spanish.

## 3. Preview what it will write, then generate

::: code-group

```bash [Vue]
php artisan larapack:import laraimport.json --vue --dry-run
php artisan larapack:import laraimport.json --vue
```

```bash [React]
php artisan larapack:import laraimport.json --react --dry-run
php artisan larapack:import laraimport.json --react
```

:::

`--dry-run` lists what it would create without writing anything. `larapack:import` validates again before touching a single file.

The `User` files that already exist are skipped ("ya existe", already exists): without `--force` the importer overwrites nothing.

::: details What was generated
```
app/Models/Product.php
app/Models/Traits/{Relations,Operations,Storage,Mutators,Assignments}/Product*.php
app/Models/Filters/Product/{ManagedFilter,IdFilter,CreationFilter,UpdatedFilter,EagerLoadingFilter}.php
app/Http/Controllers/ProductController.php
app/Http/Requests/Product/*Request.php          one per action
app/Http/Resources/Models/ProductResource.php
app/Http/Events/Product/Events/*  and  Listeners/*/*
app/Policies/ProductPolicy.php
app/Observers/ProductObserver.php
app/Exports/ProductsExports.php
app/Notifications/Product/ExportNotification.php
routes/api/models/product.php
database/migrations/*_create_products_table.php
database/factories/ProductFactory.php
tests/Feature/Models/ProductEndpointsTest.php
resources/<ui>/src/models/product/{index.js, store, routes, forms, views, widgets}
```
It also updates the module-level files: `resources/<ui>/src/routes.js`, the translations and `.larapack/manifest.json`.
:::

## 4. Migrate, export routes and build

```bash
php artisan migrate
php artisan route:json
npm run build
```

- `migrate` creates the `products` table.
- `route:json` re-exports the named routes to `resources/<ui>/routes.json`. **Without it the frontend doesn't know the new endpoints**: the interface fails with `Unknown backend route "api.app.product.index". Run php artisan route:json.`
- `npm run build` compiles the module. With `composer run dev` running, Vite reloads on its own: just refresh the page.

## 5. Open it in the admin panel

Reload `/admin`: there's a new menu entry, **Products**. The menu isn't written by hand. It's built from the module's first-level routes that have a title and no parameters, so every model you generate shows up on its own.

The base app runs in Spanish (`APP_LOCALE=es`), and the entry still reads "Products" because LaraPack can't know your model's Spanish name. It leaves the key empty in `resources/<ui>/src/locales/es.json`, and while it's empty the English key shows. Translate it there (when regenerating, LaraPack adds missing keys and never touches a written translation) or in `resources/<ui>/app/lang/es.json`:

```json
{
    "Products": "Productos",
    "Product": "Producto"
}
```

From the screen you can already:

- Create a product in a drawer over the table, without losing page, sort or filters.
- Open the record and edit it in another drawer.
- Edit `name` right in its cell: click, type, Enter.
- Select rows and delete them, or set their status ("Status: Published").
- Press **Ctrl+K** to create, export or reload.
- Export to Excel: the file arrives later, by email.

## 6. Decide who sees it

There are two layers, and the one that protects data is the server.

**The policy.** `app/Policies/ProductPolicy.php` **starts closed**: every method returns `false`, and only an administrator gets through, via `before()`. Not even the administrator can force delete: `forceDelete` sits in `$exceptAbilities`. A non-admin can open the screen, but the table explains they lack permission instead of showing data.

To open it up, write the rule in the relevant method:

```php
// app/Policies/ProductPolicy.php
public function index(User $user): Response|bool
{
    return true; // any signed-in user sees the list
}
```

**Which records** each user sees in the list isn't the policy's job: that's `ManagedFilter::canView` in `app/Models/Filters/Product/ManagedFilter.php`. If you write nothing there, the index returns everything.

**The menu.** The entry shows for any signed-in user. To reserve it for administrators, add its route to `adminOnly`:

::: code-group

```js [Vue]
// resources/vue/app/config.js
export const adminOnly = [
    'AdminUsers',
    'AdminProducts',
]
```

```js [React]
// resources/react/app/config.js
export const adminOnly = ['AdminUsers', 'AdminProducts']
```

:::

The entry moves to the Administration group, and the frontend guard sends non-admins to `/admin` with a warning. Protecting the first-level route also protects its children: the record view and the edit form. Still, `adminOnly` only changes the interface: **the policy is what decides**.

## 7. Verify and commit

```bash
php artisan larapack:verify
php artisan test
```

- `larapack:verify` checks that the generated code still matches the contract. Anything you edited by hand is reported as `customised`, which is information, not an error: the product policy if you opened it, and the `UserPolicy` the base app ships.
- `tests/Feature/Models/ProductEndpointsTest.php` exercises every endpoint. It passes as generated: if it fails, something broke.

Commit the change together with the manifest, which is what lets you regenerate without destroying your code:

```bash
git add -A
git commit -m "Add the product catalog"
```

Check with `git status` first that `.larapack/manifest.json` is among the changes.

## Changing the model later

Adding a column, changing a rule or removing an action is the normal workflow:

```bash
php artisan larapack:validate laraimport.json --vue
php artisan larapack:import laraimport.json --vue --dry-run
php artisan larapack:import laraimport.json --vue --force
php artisan migrate
php artisan route:json
npm run build
```

- `--force` regenerates what you haven't edited and **keeps what you have**, with a warning. Kept files don't receive the change: review them and apply it by hand.
- An existing table isn't changed by regenerating its create migration: column changes go into a new migration, `<date>_alter_products_table.php`.

More in [Regenerate without destroying](/en/larapack/regenerate) and [Migrations and schema changes](/en/larapack/migrations).

## Common mistakes

| Symptom | Cause |
|---|---|
| `Update debe validar 'product_id'` | You declared `Update` rules without the identifier. |
| The schema requires `form_component` | A field with `form: true` and no component. |
| Warning that `enum` will be ignored | The component isn't a select. |
| Warning that views won't be generated | The model lacks `index` or `policies` in `routes`. Editing also needs `show`. |
| `Unknown backend route` | `php artisan route:json` is missing. |
| The table says you lack permission, as an administrator | Your email isn't in `ADMIN_EMAILS`, or the config is cached: `php artisan config:clear`. |
| The entry doesn't appear in the menu | The build is missing, or the route is in `adminOnly` and you're not an administrator. |
