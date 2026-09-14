# Commands

Every command lives in the `larapack:` namespace and runs with `php artisan` inside an application or with `php vendor/bin/builder` anywhere (see [How to run it](/en/larapack/#how-to-run-it)). This page lists the arguments and options each one really has, its exit codes and the shape of its JSON output.

## Common options {#common-options}

| Option | What it does |
|---|---|
| `--root=<ruta>` | Root of the project to work on. Without it, [it's discovered](/en/larapack/#root). A path that doesn't exist is an error. |
| `--force` | Regenerates files that already exist, except those edited by hand and those the manifest doesn't know. See [Regenerate without destroying](/en/larapack/regenerate). |
| `--dry-run` | Reports what it would do without writing any file. |
| `--format=<formato>` | `txt`, the default, or `json`: a single JSON document on standard output. |

Not every command has them:

| Command | `--root` | `--force` | `--dry-run` | `--format` |
|---|---|---|---|---|
| `larapack:new` | — | — | ✓ | ✓ |
| `larapack:schema` | — | — | — | — |
| `larapack:validate` | ✓ | — | — | ✓ |
| `larapack:import` | ✓ | ✓ | ✓ | ✓ |
| `larapack:verify` | ✓ | — | — | ✓ |
| `larapack:audit` | — | — | — | ✓ |
| `larapack:skill` | ✓ | ✓ (overwrites the target) | — | — |
| `larapack:full-model` | ✓ | ✓ | ✓ | ✓ |
| `larapack:remove-full-model` | ✓ | — | — | — |
| `larapack:providers`, the four `*-service-provider` and `larapack:config` | ✓ | ✓ | ✓ | ✓ |
| The single-piece generators, `larapack:model-view`, `larapack:react-view` and `larapack:pivot-migration` | ✓ | ✓ | ✓ | ✓ |

## All commands

### Contract and checks

| Command | Arguments | What it does |
|---|---|---|
| [`larapack:new`](#larapack-new) | `<name> [directory]` | Creates a new package ready to generate, test and release. |
| [`larapack:schema`](#larapack-schema) | — | Prints the contract's JSON Schema. |
| [`larapack:validate`](#larapack-validate) | `[jsonPath]` | Validates a `laraimport.json` without generating anything. |
| [`larapack:import`](#larapack-import) | `[jsonPath]` | Generates every model and pivot in a `laraimport.json`. |
| [`larapack:verify`](#larapack-verify) | — | Checks the generated code against the manifest. |
| [`larapack:audit`](#larapack-audit) | `[path]` | Checks the ecosystem baseline. |
| [`larapack:skill`](#larapack-skill) | — | Installs the instructions for an agent in the project. |

### A whole model

| Command | Arguments | What it does |
|---|---|---|
| [`larapack:full-model`](#larapack-full-model) | `<name>` | Generates every piece of a model without `laraimport.json`. |
| [`larapack:remove-full-model`](#larapack-remove-full-model) | `<name>` | Deletes a model's pieces and writes the migrations that drop its tables. |
| `larapack:model-view` | `<name>` | Generates the model's Vue module. |
| `larapack:react-view` | `<name>` | Generates the model's React module. |

### Single pieces

All of them take `<name>`, the model name in PascalCase, except `larapack:pivot-migration`, which takes the table name.

| Command | What it generates |
|---|---|
| `larapack:controller` | The model's controller and, in a package, the base `Controller`. |
| `larapack:events` | The events and listeners for each declared action. |
| `larapack:excel` | The view `resources/views/excel/<snake>.blade.php`. |
| `larapack:export` | The `<Plural>Exports` class. |
| `larapack:export-notification` | The export notification. |
| `larapack:factory` | The factory. |
| `larapack:filters` | The five search-surge filters. |
| `larapack:migration` | The create migration. |
| `larapack:model` | The model. |
| `larapack:model-traits` | The five traits, if they don't exist. |
| `larapack:observer` | The observer. |
| `larapack:policy` | The policy. |
| `larapack:requests` | One request per declared action. |
| `larapack:resource` | The resource. |
| `larapack:route` | The routes file. |
| `larapack:test` | The endpoints test and, if missing, `tests/TestCase.php`, `tests/User.php` and `phpunit.xml`. |
| [`larapack:pivot-migration`](#larapack-pivot-migration) | A pivot table's migration. |

### The project

None of them take arguments. See [Providers and configuration](#providers-and-configuration).

| Command | What it generates |
|---|---|
| `larapack:providers` | The four providers at once. |
| `larapack:app-service-provider` | `Providers/AppServiceProvider.php`. |
| `larapack:auth-service-provider` | `Providers/AuthServiceProvider.php`. |
| `larapack:event-service-provider` | `Providers/EventServiceProvider.php`. |
| `larapack:route-service-provider` | `Providers/RouteServiceProvider.php`. |
| `larapack:config` | The configuration file for the generated code. |

## larapack:new {#larapack-new}

```bash
php vendor/bin/builder larapack:new acme/catalogo packages/catalogo
```

| Argument or option | Default | What it is |
|---|---|---|
| `name` | required | Composer name, `vendor/paquete`, in lowercase. |
| `directory` | `./<paquete>` | Where to create it. It's created if it doesn't exist. |
| `--namespace=` | derived from the name | Root namespace. `acme/shop-catalog` gives `Acme\ShopCatalog`. Each part in PascalCase. |
| `--description=` | `<paquete>: paquete Laravel generado con LaraPack.` | For `composer.json` and the README. |
| `--license=` | `MIT` | The `composer.json` license. With `MIT`, `LICENSE` is written too. |
| `--dry-run` | — | Builds the package in a temporary directory, reports and deletes it. |
| `--format=` | `txt` | `txt` or `json`. |

It refuses to work on a directory that already has a `composer.json`: there's already a project there, and generating inside it is what `larapack:import` and `larapack:providers` with `--root` are for.

What it creates, with the versions from the `ecosystem.json` of the LaraPack that runs it:

| File | Contents |
|---|---|
| `composer.json` | `type: library`. `require`: `php`, `illuminate/support`, `innoboxrr/search-surge`, `innoboxrr/support`, `innoboxrr/traits`, `laravel/sanctum` and `maatwebsite/excel`. `require-dev`: `innoboxrr/larapack-generator`, `larastan/larastan`, `laravel/pint`, `orchestra/testbench` and `phpunit/phpunit`. Autoload for `src/` and `database/factories/`, autoload-dev for `tests/`, and the four providers in `extra.laravel.providers`. |
| `src/Providers/{App,Auth,Event,Route}ServiceProvider.php` | The providers. |
| `config/<clave>.php` | The export configuration. |
| `tests/TestCase.php`, `tests/User.php`, `tests/Feature/PackageBootsTest.php` | The test base and a first test that checks the providers boot and the migrations run. |
| `phpunit.xml.dist` | The PHPUnit configuration. |
| `.github/workflows/tests.yml`, `.github/workflows/release.yml` | The ecosystem workflows, with the `quality` job (Pint and Larastan). |
| `pint.json`, `phpstan.neon.dist` | `laravel` preset; Larastan level 5 on `src` and `database`. |
| `VERSION` | `0.1.0`. |
| `README.md`, `CHANGELOG.md`, `AGENTS.md`, `.gitignore`, `.gitattributes`, `LICENSE` | The repository files. `AGENTS.md` points to the skill. |
| `.claude/skills/larapack/SKILL.md` | The installed skill. |

A freshly created package passes `larapack:audit` with no findings. The next steps are in [A new package](/en/getting-started/new-package).

::: warning The dry run leaves nothing to copy
`larapack:new --dry-run` builds the package in a temporary directory to say exactly what it would create, and deletes it when it's done. To see the files, create it for real in a separate directory.
:::

## larapack:schema {#larapack-schema}

| Option | What it does |
|---|---|
| `--path` | Prints only the path to `schema/laraimport.schema.json`. |

Without options it prints the full schema. It has no `--root` or `--format`: the output is already JSON, and it always exits with 0.

## larapack:validate {#larapack-validate}

```bash
php vendor/bin/builder larapack:validate --vue --format=json
```

| Argument or option | Default | What it is |
|---|---|---|
| `jsonPath` | `<raíz>/laraimport.json` | The file to validate. |
| `--vue`, `--react` | — | Adds the [interface warnings](/en/larapack/laraimport#interface-warnings). |
| `--strict` | — | Warnings count as failures. |
| `--root=` | discovered | |
| `--format=` | `txt` | `txt` or `json`. |

In text it prints each finding, the models in the order their migrations will run, and the counts. It exits with 1 if there are errors, or warnings with `--strict`. What it checks is in [Errors and warnings](/en/larapack/laraimport#errors-and-warnings).

## larapack:import {#larapack-import}

```bash
php vendor/bin/builder larapack:import --vue --react --dry-run
php vendor/bin/builder larapack:import --vue --react --force
```

| Argument or option | Default | What it is |
|---|---|---|
| `jsonPath` | `<raíz>/laraimport.json` | The contract. |
| `--vue`, `--react` | — | Also generates each model's interface module. They aren't mutually exclusive. |
| `--root=`, `--force`, `--dry-run`, `--format=` | | The [common options](#common-options). |

What it does, in order:

1. Validates the file, with the UI warnings if you pass `--vue` or `--react`. On an error it writes nothing and exits with 1.
2. Generates each model, in dependency order, with the same pieces as `larapack:full-model`, and records its declared shape in the manifest.
3. Generates each pivot's migration.
4. Formats what it wrote with Pint.
5. Reports, with the validation warnings in `findings`.

In text it also prints its progress, model by model. With `--format=json` it prints no progress on any output.

## larapack:verify {#larapack-verify}

| Option | Default | What it is |
|---|---|---|
| `--strict` | — | Warnings count as failures. |
| `--root=` | discovered | |
| `--format=` | `txt` | `txt` or `json`. |

It reads only `.larapack/manifest.json` and the files. It exits with 1 if there are errors, or warnings with `--strict`. The checks are in [Verify and audit](/en/larapack/verify).

## larapack:audit {#larapack-audit}

```bash
php vendor/bin/builder larapack:audit                     # the current package
php vendor/bin/builder larapack:audit packages --all      # every package in a directory
```

| Argument or option | Default | What it is |
|---|---|---|
| `path` | `.` | The package directory, or one that contains packages with `--all`. |
| `--all` | — | Audits every subdirectory that has a `composer.json` or `package.json`. |
| `--strict` | — | Warnings count as failures. |
| `--format=` | `txt` | `txt` or `json`. |

It has no `--root`: the path is the argument. A path that doesn't exist exits with 1. The checks are in [Verify and audit](/en/larapack/verify#audit).

## larapack:skill {#larapack-skill}

| Option | Default | What it is |
|---|---|---|
| `--path=` | `.claude/skills/larapack/SKILL.md` | Target, relative to the root; an absolute path also works. |
| `--print` | — | Writes the text to standard output instead of installing it. |
| `--source` | — | Prints only the path to the original, inside LaraPack. |
| `--force` | — | Overwrites the target even if it exists. |
| `--root=` | discovered | |

Without `--force` it doesn't overwrite an existing target, because it may have been extended with project rules: it says whether it's up to date or differs from the package, and exits with 0 in both cases. After updating LaraPack, reinstall it with `--force`. See [Preparing the project](/en/ai/setup).

## larapack:full-model {#larapack-full-model}

```bash
php artisan larapack:full-model AuditEvent --only=policies,index,show --immutable
```

| Argument or option | What it is |
|---|---|
| `name` | Model name, in PascalCase. |
| `--vue`, `--react` | Also generates its interface module. |
| `--metas` | Generates the model with metas, wired up as with `metas: true`. |
| `--only=a,b` | Only these actions, comma-separated. |
| `--except=a,b` | Every action except these. |
| `--immutable` | Rows are never modified or deleted. |
| `--root=`, `--force`, `--dry-run`, `--format=` | The [common options](#common-options). |

It generates, in this order: migration, controller, events, Excel view, export, export notification, factory, filters, model, traits, observer, policy, requests, resource, routes and test; then the requested modules and, with `--metas`, the meta model and migration.

It exits with 1 if you pass `--only` and `--except` together, if an action doesn't exist, or if `--immutable` comes with a write action in `--only`.

::: warning No laraimport, no columns
A standalone command doesn't read `laraimport.json`: the files come out with their data markers unfilled, so the model has no columns, neither does the migration, the requests have no rules and the forms have no fields. Use it for a quick model or to try out a shape; for a real domain, declare the model and use `larapack:import`.
:::

## larapack:remove-full-model {#larapack-remove-full-model}

| Argument or option | What it is |
|---|---|
| `name` | Model name. |
| `--vue`, `--react` | Also deletes the model's folder in that module. |
| `--root=` | |

It deletes the controller, the events, the Excel view, the export, the notification, the factory, the filters, the model and its five traits, the meta model, the observer, the policy, the requests, the resource, the routes file and the test. It doesn't delete the create migration: it writes `<fecha>_drop_<tabla>_table.php` and, if the model had metas, `<fecha>_drop_<snake>_metas_table.php`.

It has no `--format` and always exits with 0.

::: warning Clean up the manifest by hand
The command doesn't remove the model from `.larapack/manifest.json`, so `larapack:verify` will then report its files as `missing-file`. Delete the model's entry under `models` in the manifest.
:::

## larapack:pivot-migration {#larapack-pivot-migration}

```bash
php vendor/bin/builder larapack:pivot-migration post_tag
```

It takes the table name. It creates `database/migrations/<fecha>_create_<tabla>_table.php` only if there isn't already a create migration for that table. It isn't recorded in the manifest, so `--force` doesn't regenerate it.

From `larapack:import`, the columns come from `pivots`. Standalone there's no laraimport: the migration has `id()` and `timestamps()`, and you write the columns at the `//EDIT//` marker.

## Providers and configuration {#providers-and-configuration}

The importer doesn't generate providers. A package created with `larapack:new` already has them; in any other project they're created once.

| Provider | What it does |
|---|---|
| `AppServiceProvider` | Merges the configuration if it exists, loads the migrations, the views under the package namespace and `lang/` as JSON, and publishes the `views` and `config` tags. |
| `AuthServiceProvider` | Gates only: each model declares its policy with `#[UsePolicy]`. |
| `EventServiceProvider` | Binds each event in `Http/Events/<Model>/Events` to the listeners in `Http/Events/<Model>/Listeners/<Evento>`, scanning them on every boot, without a cache. |
| `RouteServiceProvider` | Loads every `routes/api/models/*.php` with the `api` middleware, the `api/<namespace>/<snake>` prefix and the `api.<namespace>.<snake>.` names. It does nothing if routes are cached. |

- **In a package**, each provider command also declares it in `extra.laravel.providers` in `composer.json`, without duplicates and never during a dry run. The application that installs the package discovers them on its own.
- **In an application**, a provider that already exists is skipped, and nothing is added to `composer.json`: register `RouteServiceProvider` and `EventServiceProvider` in `bootstrap/providers.php`. Without the event provider, the export never notifies anyone.

`larapack:config` creates `config/<clave>.php` with `user_class`, `excel_view`, `notification_via` and `export_disk`. In a package the key is the namespace in lowercase without separators (`Acme\Catalogo` gives `acmecatalogo`); in an application it's `larapack`, and the command never writes to `config/app.php`. See [Export to Excel](/en/larapack/export#configuration).

## Exit codes

| Code | When |
|---|---|
| `0` | It finished successfully. In `validate`, `verify` and `audit`: no errors, and no warnings if `--strict` was passed. |
| `1` | Something failed. |

What makes it exit with 1:

- `validate`, `verify` and `audit`: any error, or any warning with `--strict`.
- `import`: an invalid or missing laraimport. Nothing is written.
- `audit`: a path that doesn't exist.
- `new`: an invalid name or namespace, a directory with a `composer.json`, or a directory that can't be created.
- `full-model`: `--only` together with `--except`, an unknown action, or `--immutable` with a write action in `--only`.
- Any command with `--root`: a root that doesn't exist.
- Any command: a missing required argument or an unknown option.

`schema`, `skill` and `remove-full-model` exit with 0 unless something throws an exception.

## JSON output {#json-output}

With `--format=json`, every command that accepts it writes **exactly one JSON document to standard output and nothing else**: no progress, no stray warnings, nothing on standard error. That also holds for `--dry-run` and for failures, so whoever reads it decodes the whole output without trimming anything.

- `ok` says whether it succeeded.
- If the command couldn't run, the document has `"ok": false` and `error` with the reason, and the exit code is 1.

::: tip Accented characters come out escaped
The document is written with `json_encode`, and non-ASCII characters come out as `í`. Any JSON decoder turns them back into the original characters; the examples on this page show them readable.
:::

### A failure

```json
{
    "ok": false,
    "error": "La raíz indicada no existe: packages/catalogo"
}
```

Some failures add keys:

| Key | When |
|---|---|
| `findings` | `larapack:import` with an invalid laraimport: the validation findings. |
| `exception` | A failure that arrives as an exception (a root that doesn't exist, a missing argument): the exception class. |

### The generators and import

`larapack:import`, `larapack:new`, `larapack:full-model`, `larapack:providers`, `larapack:config` and every single-piece generator:

```json
{
    "ok": true,
    "dryRun": false,
    "formatted": 24,
    "summary": { "create": 24, "overwrite": 0, "skipped": 1, "preserved": 1 },
    "files": [
        { "action": "create", "file": "src/Models/Post.php", "stub": "Model/ModelTemplate.txt", "reason": null },
        { "action": "skipped", "file": "database/factories/PostFactory.php", "stub": "Factory/FactoryTemplate.txt", "reason": "ya existe" },
        { "action": "preserved", "file": "src/Policies/PostPolicy.php", "stub": "Policy/PolicyTemplate.txt", "reason": "editado a mano" }
    ],
    "findings": []
}
```

| Key | What it is |
|---|---|
| `ok` | `true`. |
| `dryRun` | Whether it was a dry run. |
| `formatted` | How many PHP files Pint formatted. `0` in a dry run or with no PHP to format; `null` if Pint was needed and the project doesn't have it. |
| `summary` | Count per action: `create`, `overwrite`, `skipped` and `preserved`. |
| `files[].action` | `create` (created), `overwrite` (regenerated), `skipped` (skipped) or `preserved` (kept because it was edited). In a dry run, what it would do. |
| `files[].file` | Path relative to the root. |
| `files[].stub` | The stub it comes from, relative to `Stubs/`. |
| `files[].reason` | Why it was skipped or preserved (in Spanish: `ya existe`, "already exists"; `editado a mano`, "edited by hand"), or `null`. |
| `findings` | Only in `larapack:import`: the validation warnings, in the same shape as `validate`'s. |

### larapack:validate output {#json-validate}

```json
{
    "ok": false,
    "file": "/ruta/al/proyecto/laraimport.json",
    "errors": 1,
    "warnings": 1,
    "models": [],
    "findings": [
        {
            "level": "error",
            "path": "/models/0/requests/1/rules",
            "message": "Update debe validar 'post_id': su authorize() y su handle() hacen findOrFail con ese valor."
        },
        {
            "level": "warning",
            "path": "/models/0/load_relations/1/related",
            "message": "'User' no está en este archivo y no declara namespace: se resolverá contra App\\Models."
        }
    ]
}
```

| Key | What it is |
|---|---|
| `ok` | No errors, and no warnings with `--strict`. |
| `file` | The validated file. |
| `errors`, `warnings` | Counts. |
| `models` | The model names in migration order; empty if the document has errors. |
| `findings[]` | `level` (`error` or `warning`), `path` (JSON pointer) and `message`. |

### larapack:verify output {#json-verify}

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

| Key | What it is |
|---|---|
| `findings[].level` | `error`, `warning` or `info`. |
| `findings[].check` | The check code. See [Verify and audit](/en/larapack/verify#verify). |
| `findings[].model` | The model, or `null` for what belongs to none (providers, configuration, module scaffolding). |
| `findings[].file` | The file, relative to the root, or `null`. |
| `findings[].message` | What's wrong and what to do. |

### larapack:audit output {#json-audit}

```json
{
    "ok": false,
    "errors": 1,
    "warnings": 1,
    "findings": [
        {
            "level": "error",
            "check": "internal-version",
            "package": "acme/catalogo",
            "message": "`innoboxrr/larapack-generator: ^7.10.2` no admite la línea base `^7.10`."
        },
        {
            "level": "warning",
            "check": "illuminate-version",
            "package": "acme/catalogo",
            "message": "`illuminate/support: ^12.0 || ^13.0` admite versiones fuera de la línea base `^13.0`; la matriz de CI tiene que cubrirlas."
        }
    ]
}
```

| Key | What it is |
|---|---|
| `findings[].level` | `error` or `warning`. |
| `findings[].check` | The check code. See [Verify and audit](/en/larapack/verify#audit). |
| `findings[].package` | The `name` from `composer.json` or `package.json`, or the directory name. |
| `findings[].message` | What's wrong. |
