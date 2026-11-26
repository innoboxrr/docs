# The agent loop

Always in the same order. Every step has a command and an exit code, so the agent
checks its own work without asking.

```
0. larapack:new vendor/package         only if the package doesn't exist yet
1. larapack:schema                     discover the contract, don't guess it
2. write or edit laraimport.json
3. larapack:validate --format=json     fails → fix the JSON, not the code
4. larapack:import --dry-run           see what it will touch
5. larapack:import [--vue] [--react]   generate
6. fill the extension points           this is where it writes code
7. larapack:verify --format=json       fails → something left the contract
8. vendor/bin/phpunit                  behavior
9. larapack:audit                      if it's a package
```

## How to invoke them

::: code-group

```bash [In an application]
php artisan larapack:validate --format=json
```

```bash [In a package, or outside Laravel]
php vendor/bin/builder larapack:validate --format=json
```

:::

The `builder` binary keeps the old names (`make:*`, `json:importer`,
`remove:full-model`) as aliases. Artisan doesn't register them, because
`make:model`, `make:policy`, `make:factory` and `make:observer` belong to Laravel.

LaraPack's messages are in Spanish; the JSON keys and check codes are the same in any
language.

### Which project it works on

Without `--root`, the root is found by walking up from LaraPack until a
`vendor/autoload.php` turns up. Inside an application, or a package that has LaraPack
installed, that gives the right root. With the binary on a clone of the generator
itself, it gives the generator.

When in doubt, the agent passes `--root=<path>`: a root that doesn't exist makes the
command fail instead of writing to the wrong place.

### Which options each command accepts

::: warning
The README and the skill say **every** command accepts `--root` and `--format=json`.
That isn't true. This table is the one that holds:
:::

| Command | `--format=json` | `--root` | Other options |
|---|---|---|---|
| `larapack:new` | Yes | No: the directory is an argument | `name`, `[directory]`, `--namespace`, `--description`, `--license=MIT`, `--dry-run` |
| `larapack:schema` | No: always prints JSON | No | `--path` |
| `larapack:validate` | Yes | Yes | `[file]`, `--strict`, `--vue`, `--react` |
| `larapack:import` | Yes | Yes | `[file]`, `--vue`, `--react`, `--force`, `--dry-run` |
| `larapack:verify` | Yes | Yes | `--strict` |
| `larapack:audit` | Yes | No: the path is an argument, `.` by default | `--all`, `--strict` |
| `larapack:skill` | No | Yes | `--path`, `--print`, `--source`, `--force` |
| Single generators (`larapack:model`, `larapack:full-model`, `larapack:policy`…) | Yes | Yes | `--force`, `--dry-run` |
| `larapack:remove-full-model` | No | Yes | `--vue`, `--react` |

An option a command doesn't have is a plain-text console error, not a JSON document:
`larapack:schema --format=json` doesn't return `{"ok": false}`.

### Exit codes

| Command | Exits 0 | Exits 1 |
|---|---|---|
| `larapack:validate` | No errors | Errors, or warnings with `--strict` |
| `larapack:import` | Generated (or simulated) | The laraimport is invalid: nothing is written |
| `larapack:verify` | No errors | Errors, or warnings with `--strict` |
| `larapack:audit` | No errors | Errors, warnings with `--strict`, or the path doesn't exist |
| `larapack:new` | Created (or simulated) | Invalid name or namespace, or the directory already has `composer.json` |
| `larapack:skill` | Always, **even when it didn't overwrite** | Only if it couldn't run |

In any command with `--format=json`, whatever fails before or during execution (a
missing argument, a root that doesn't exist) arrives as a document, with exit code 1:

```json
{
    "ok": false,
    "error": "…"
}
```

When the failure was an exception, the document adds `exception` with its class.

## Step by step

### 0. Create the package

Only if it doesn't exist yet:

```bash
php vendor/bin/builder larapack:new acme/catalog packages/catalog --format=json
```

`--dry-run` builds the package in a temporary directory, reports and deletes it: it
tells you exactly what it would create. The report has the same shape as
`larapack:import`'s. See [A new package](/en/getting-started/new-package).

### 1. Read the contract

```bash
php vendor/bin/builder larapack:schema          # the full JSON Schema
php vendor/bin/builder larapack:schema --path   # just the file path
```

**Read it before writing the file.** Don't infer the format from an example. To have
your editor validate as you type, point `$schema` at that path:

```json
{
    "$schema": "./vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": []
}
```

### 2. Write `laraimport.json`

The only required part:

```json
{
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

Everything else has a default. **Declare only what you actually decide**: filling in
the twenty keys of every property with their default values makes the file
unreadable and changes nothing. The keys are in
[The contract: laraimport.json](/en/larapack/laraimport).

### 3. Validate

```bash
php vendor/bin/builder larapack:validate --vue --format=json
```

It checks the **shape** against the schema and the **coherence** of the whole
document: duplicate models or columns, foreign-key cycles, relations that don't
resolve, an `UpdateRequest` without the `<model>_id` rule, `only` together with
`except`, an `immutable` model asking to write, a `secret` asking to appear in the
table… With `--vue` or `--react` it also warns about what the views need and the
model doesn't declare.

| Field | What it is |
|---|---|
| `ok` | `false` if there are errors, or warnings with `--strict` |
| `file` | The path of the validated file |
| `errors`, `warnings` | How many of each |
| `models` | Model names **in migration order**; empty if the document couldn't be built |
| `findings[]` | `level` (`error` or `warning`), `path` (where in the file: `/models/0/props`) and `message` |

**A validation error is fixed in the JSON.** Never by generating anyway and patching
the result.

### 4. See what it will touch

```bash
php vendor/bin/builder larapack:import --vue --dry-run --format=json
```

Writes nothing: reports what it would do.

### 5. Generate

::: code-group

```bash [First time]
php vendor/bin/builder larapack:import --vue --format=json
```

```bash [Extending what exists]
php vendor/bin/builder larapack:import --vue --force --format=json
```

:::

Without `--force`, a file that already exists is skipped. With `--force` it's
regenerated **unless** it was edited by hand: then it's kept and reported. That's why
extending an already generated model uses `--force`.

The report:

```json
{
    "ok": true,
    "dryRun": false,
    "formatted": 41,
    "summary": { "create": 58, "overwrite": 0, "skipped": 0, "preserved": 0 },
    "files": [
        { "action": "create", "file": "src/Models/Category.php", "stub": "…", "reason": null }
    ],
    "findings": []
}
```

| Field | What it is |
|---|---|
| `dryRun` | Whether it was a simulation |
| `formatted` | PHP files formatted with Pint; `0` in a simulation; `null` if Pint was needed and the project doesn't have it |
| `summary` | How many files were created, regenerated, skipped and **preserved** |
| `files[]` | What happened to each file (`action`), from which template (`stub`) and why (`reason`) |
| `findings` | The validation warnings, no longer printed separately |

If the laraimport is invalid, nothing is generated:

```json
{
    "ok": false,
    "error": "El laraimport no es válido; no se ha generado nada.",
    "findings": []
}
```

::: warning
**Preserved files didn't receive the change.** They were edited by hand and `--force`
doesn't overwrite them. The agent must carry the change into each one by hand, or say
it didn't.
:::

After generating, in an application:

```bash
php artisan migrate      # including alter migrations
php artisan route:json   # if there are new endpoints
npm run build
```

Changing the columns of a table that already exists is also done in the JSON: on
re-import, LaraPack writes `<date>_alter_<table>_table.php`. See
[Migrations and schema changes](/en/larapack/migrations).

### 6. Fill the extension points

The only places code gets written. If the logic fits none of them, something is
missing from `laraimport.json`; stepping outside is not the answer.

| Extension point | What goes there |
|---|---|
| `Traits/Operations/` | The model's business logic. The default place. With metas, also the shape of `payload` in `buildPayload()`. |
| `Traits/Relations/` | Relations the JSON doesn't declare (through, morph, conditional). |
| `Traits/Storage/` | Uploading and deleting the model's files. |
| `Traits/Mutators/` | Accessors and mutators. |
| `Filters/<Model>/ManagedFilter::canView` | **Who can see what.** Without it, the index returns everything. |
| `Policies/<Model>Policy` | Per-action authorization. Born closed: only the admin passes, and not even the admin force-deletes until `forceDelete` leaves `$exceptAbilities`. |
| `Requests/*/rules()` | Rules not coming from the JSON, inside the array. |
| `Resources/<Model>Resource` | The exact response shape and its `actions` array. |
| `Events/*/Listeners/` | Side effects: notifications, queues, integrations. |
| `Observers/` | The model lifecycle. |
| `Factories/` | Realistic test data. |
| `tests/Feature/` | Behavior, not structure. |

**The model is a facade, not a logic store:** a public method in `Operations` that
orchestrates, and the real work in the class it belongs to.

### 7. Verify

```bash
php vendor/bin/builder larapack:verify --format=json
```

It compares the tree with `.larapack/manifest.json` and checks every controller,
request and resource in the project, hand-written ones included:

```json
{
  "ok": false,
  "errors": 1,
  "warnings": 0,
  "findings": [
    {
      "level": "error",
      "check": "missing-file",
      "model": "Post",
      "file": "src/Policies/PostPolicy.php",
      "message": "Se generó pero ya no existe. Regenéralo con --force o retíralo del manifiesto."
    }
  ]
}
```

| `check` | Level | What to do |
|---|---|---|
| `missing-file` | error | Something generated is gone. Regenerate. |
| `customised` | info | A generated file was edited. Fine if it's an extension point; drift if not. |
| `inconsistent-entity` | warning | A model lacks a piece every model of the same shape has. Almost always an oversight. |
| `route-prefix` | error | The module's `API_ROUTE_PREFIX` doesn't match the `RouteServiceProvider`'s `->as()`. |
| `route-not-declared` | error | A route, method, request or view for an action the model doesn't declare. Declare it in the JSON or remove it. |
| `immutable-write` | error | An `immutable` model has a write path, or lost its `booted()` guard. |
| `secret-exposed` | error | A `secret` column leaks through the API, the export or the table. |
| `endpoint-missing` | error | A declared endpoint is missing a piece. The message says which; regenerate or write what's missing in its extension point. |
| `controller-shape` | error | A controller does more than `return $request->handle();`. Move validation to `rules()`, authorization to `authorize()` and the work to its request's `handle()`, or declare the endpoint. **Don't mark it with `#[HandRolled]`.** |
| `request-handle` | error | An action's request has no `handle()`. Write it. |
| `controller-concern` | error or warning | A trait with logic in `Http/Controllers`. It belongs in `Http/Requests/Concerns`. |
| `hand-rolled`, `hand-rolled-unapproved`, `hand-rolled-stale` | warning, error, warning | A `#[HandRolled]` exception and its approval. Not yours: say so in your answer and let the owner decide. |
| `route-closure` | warning | A closure with a body as a route action. Move it to a controller that delegates. |
| `index-managed`, `resource-appends` | warning | A listing that doesn't force `managed`, or a `setAppends()` without an allowlist. `larapack:fix` fixes them. |
| `empty-manifest` | warning | The manifest records nothing: nothing was generated, or it's the wrong project. |

If the project has the [guard](/en/ai/setup#guard), errors in the file the agent
just edited reach it right away, with the rule: fix them, don't work around them.

**Non-zero exit = you're not done yet.**

### 8. Test

```bash
vendor/bin/phpunit
```

Generated tests pass straight out of the generator and check that every endpoint
responds, with authorization opened up in the `TestCase`. If one fails, the change
broke it. Authorization is tested separately, against the policy. Generated tests are
never overwritten, not even with `--force`.

::: tip
If the suite fails locally with "could not find driver", your PHP lacks SQLite:
`php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit`.
:::

### 9. Audit (packages)

```bash
php vendor/bin/builder larapack:audit --format=json
```

It checks versions, tests and workflows against the baseline; CI runs it before
releasing. A package created with `larapack:new` also runs `vendor/bin/pint --test`
and `vendor/bin/phpstan analyse`. Generated code passes both, so a failure means
something hand-written. See [The baseline](/en/ci/).

## Reading the output

The rule for the agent is to **parse the JSON output, not scrape the text**:

1. Decode the whole standard output as a single document.
2. Check the exit code **and** `ok`.
3. If there's an `error`, the command never ran: fix the call (argument, root, path),
   not the project.
4. Walk `findings` by `level`: `error` blocks, `warning` gets addressed or justified,
   `info` gets looked at.

```bash
out=$(php vendor/bin/builder larapack:verify --format=json); status=$?
echo "$out" | jq '.findings[] | select(.level == "error")'
echo "exit: $status"
```

## What the agent must do

Everything the skill asks, in one list:

1. **Follow the flow in order**, from the schema to verification.
2. **Read the schema** with `larapack:schema` before writing `laraimport.json`,
   instead of inferring the format from an example.
3. **Declare only what it actually decides.** The rest are schema defaults.
4. **Declare tables that aren't managed through a form with `routes`, `immutable`
   and `secret`**: a log that only gets appended, a catalog that's only read, a grant
   that's issued and revoked.
5. **Fix validation errors in the JSON.**
6. **Parse `--format=json`**, and pass `--root` when the root isn't obvious.
7. **Validate with `--vue` or `--react`** when it will generate the UI.
8. **Look at `larapack:import --dry-run`** before generating.
9. **Write logic only in the extension points**, with `Operations` as the default and
   the model as a facade.
10. **Authorize in the policy**, not inside the model, where the policies API can't
    see it and the front end offers a button that fails. **Decide visibility in
    `ManagedFilter::canView`**.
11. **Declare in `load_relations`** every relation the API must be able to load.
12. **Include the `<model>_id` rule in `Update`**: `authorize()` and `handle()` call
    `findOrFail` with it.
13. **Choose column or meta deliberately.** A column for what gets filtered, sorted,
    is a foreign key or needs an index; a meta for what's optional, changes shape, or
    comes in large numbers.
14. **Declare `editable_metas` with flattened names** (`seo.og.image` arrives as
    `seo_og_image`), write `protected_metas` with `setMeta()`/`setMetas()` and then
    call `updatePayload()`, read with `getPayload('key')`, and decide the shape of
    `payload` in `buildPayload()`.
15. **Change the columns of an existing table in the JSON** and re-import to get the
    alter migration. A foreign-key change is written by hand.
16. **Export `routes.json` again** after adding an endpoint, and touch both sides of
    the front ↔ back contract when one changes.
17. **Declare a non-CRUD endpoint** in the model's `endpoints`, or in `controllers`
    if it has no model, before writing a controller. See
    [Declared endpoints](/en/larapack/endpoints).
18. **If a controller has to be hand-written**, keep it at
    `return $request->handle();` with a `FormRequest` of its own that authorizes,
    validates and does the work.
19. **Make every `callback` of a `route: false` action** a real export of
    `models/<kebab>/index.js`.
20. **Write UI text as English keys** with `t()` in the front end and `__()` in
    Laravel, using placeholders: `t('Create :name', { name: t('Post') })`. Pass
    translated text to datatables and components (`labels`, `closeLabel`,
    `emptyText`…).
21. **Change the look with CSS variables** (`--fe-primary`, `--fe-radius`…), use
    `setTheme` only to point tokens at another design system, and request icons by
    semantic name (`setIcons`), also from a Resource: `'icon' => 'show'`.
22. **Navigate in React with `buildPath('AdminShowPost', { id })`.**
23. **Have forms notify on save** (`updateData` in Vue, `onUpdateData` in React) and
    let the view that opened the drawer decide.
24. **Ask with `confirmAction`** before deleting or exporting; cancelling rejects
    with `RequestCancelledError` and nobody is told about it.
25. **Declare providers once** with `larapack:providers` and `larapack:config` in a
    package not created with `larapack:new`.
26. **Reinstall the skill with `larapack:skill --force`** after upgrading LaraPack.
27. **Finish with `larapack:verify` and the test suite green**, none of its
    controllers doing more than `return $request->handle();`, plus
    `larapack:audit` for a package.

## What the agent must not do

1. **Hand-write** a model, endpoint, request, policy, migration, resource, form or
   view, not even "because it's just one": that's the first of thirty.
2. **Fill in every key of the JSON.**
3. **Generate every action and delete the extras.** What's deleted by hand stays as
   drift forever.
4. **Generate despite a validation error and patch the result**, or fix generated
   code instead of the JSON.
5. **Expose a secret in the Resource "just for debugging".** `verify` fails with
   `secret-exposed`, and it's right.
6. **Forget `<model>_id` in the `Update` rules.**
7. **Add a relation to the trait without declaring it in `load_relations`.** The
   method will exist, but the API will never load it.
8. **Extend the UI with loose components.** A missing input means a missing `prop`
   with `form: true`.
9. **Touch the controller**, or write one with logic. It delegates to requests;
   anything different goes in the request.
10. **Touch the routes file.** A missing endpoint is missing from the JSON or the
    generator.
11. **Edit `$fillable`, `$creatable`, `$updatable`, `$export_cols`,
    `$loadable_relations`, `$loadable_counts` or `casts()`.** They come from the JSON.
12. **Write outside the `//RULES//`, `//IMPORTS//` and `//EDIT//` markers**, or
    outside the array in `rules()`.
13. **Fix by hand what resolves itself**: model order and relation namespaces.
14. **Use `assignments` or `filters`**, which are deprecated.
15. **Hand-add a JSON column** for flexible data, or declare `payload` as `creatable`
    or `updatable`.
16. **Read metas with `meta()` in a loop.** It queries on every call and returns lists
    as text.
17. **Edit the create migration to change columns.**
18. **Touch `models/<kebab>/index.js` in only one framework.** It's the same file in
    Vue and React.
19. **Hand-write a route in a React view.**
20. **Make a form navigate on save.**
21. **Add CSS framework classes** (`uk-input`, `fa-plus`, `bg-blue-600`) to a stub or a
    generated view, or `customClass` to a generated input.
22. **Request an icon by class** (`fa-eye`).
23. **Write loose Spanish or English text in a view**, or concatenate the model name
    into a key.
24. **Import an application middleware into the module.** Each route declares whether
    it needs a session with `auth: true` (`meta` in Vue, `handle` in React).
25. **Notify about something the user chose not to do**, such as a cancelled
    confirmation.
26. **Add `#[HandRolled]` to make `verify` pass**, edit `.larapack/hand-rolled.lock`
    or run `larapack:hand-rolled approve` or `revoke`. The project owner approves
    exceptions.
27. **Work around the guard**: write a file the guard blocked some other way, or
    switch its hooks off. What it blocks is a contract error.
