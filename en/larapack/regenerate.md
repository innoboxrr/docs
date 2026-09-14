# Regenerate without destroying

Extending `laraimport.json` and importing again is the normal workflow, not an exception. It works because LaraPack knows what it wrote and what you wrote, and never overwrites the latter.

## The manifest

Every file that goes through the generator is recorded in `.larapack/manifest.json`: the stub it came from and the hash of its content at that moment.

```json
{
    "version": 1,
    "package": {
        "namespace": "Acme\\Catalogo\\",
        "files": {
            "resources/vue/index.js": { "stub": "ModelView/Module/index.js", "hash": "9f2c…" },
            "src/Providers/RouteServiceProvider.php": { "stub": "Providers/RouteServiceProviderTemplate.txt", "hash": "41ab…" }
        }
    },
    "models": {
        "AuditEvent": {
            "namespace": "Acme\\Catalogo\\",
            "files": {
                "src/Models/AuditEvent.php": { "stub": "Model/ModelTemplate.txt", "hash": "c07e…" }
            },
            "declaration": {
                "actions": ["policies", "index", "show", "export"],
                "immutable": true
            }
        }
    }
}
```

| Part | What it is |
|---|---|
| `package.files` | What doesn't belong to any model: providers, configuration and the interface module scaffolding. |
| `models.<Model>.files` | Each model's files. |
| `hash` | SHA-256 of the content, with normalized line endings: a file that goes through git on Windows doesn't look edited. |
| `models.<Model>.declaration` | The declared shape: `actions`, `immutable`, `secret` and `authenticatable`. It's only written when the model departs from the default shape, and it's what `larapack:verify` reads, since that command doesn't receive the laraimport. |

::: warning Commit the manifest
Without `.larapack/manifest.json`, the generator can't tell your code from its own and treats everything that already exists as belonging to the project: it overwrites nothing, not even with `--force`, and `verify` has nothing to check.
:::

## What it does with each file

| The file | Without `--force` | With `--force` |
|---|---|---|
| Doesn't exist | Created (`create`). | Created (`create`). |
| Exists and its hash matches the manifest | Skipped (`skipped`, "ya existe": already exists). | Regenerated (`overwrite`). |
| Exists and its hash changed | Skipped (`skipped`, "ya existe"). | Preserved (`preserved`, "editado a mano": edited by hand). |
| Exists and the manifest doesn't know it | Skipped (`skipped`, "ya existe"). | Preserved (`preserved`, "editado a mano"). |

`--force` never overwrites an edited file or one the generator didn't write. A preserved file doesn't receive the change: the report says so, and that change has to be carried over by hand.

```text
  creado     src/Models/Supplier.php
  regenerado src/Http/Controllers/ProductController.php
  conservado src/Policies/ProductPolicy.php (editado a mano)
  omitido    src/Models/Traits/Operations/ProductOperations.php

  12 creados, 30 regenerados, 0 omitidos, 1 conservados
  Los conservados se editaron a mano; --force no los sobrescribe.
```

### What stays outside the manifest

Some files don't go through that table, because they're yours from the moment they exist:

- **The model's five traits** and **the endpoints test**: created if missing, and not even `--force` rewrites them.
- **`tests/TestCase.php`, `tests/User.php` and `phpunit.xml`**: copied once.
- **Pivot migrations**: created if there isn't one for that table.
- **What `larapack:new` writes outside the generators**, such as the README or the workflows.
- **Translations**: `src/locales/*.json` and `lang/es.json` are merged, without touching what's already translated.

Since they aren't in the manifest, `larapack:verify` doesn't flag them as edited. The full list is in [What is never rewritten](/en/larapack/generated-code#what-is-never-rewritten).

## `--dry-run`

It goes through the whole run and records what it would do with each file, without writing any of them:

```bash
php vendor/bin/builder larapack:import --vue --dry-run
php vendor/bin/builder larapack:import --vue --dry-run --force
```

- The report says `create`, `overwrite`, `skipped` or `preserved` for each file, exactly like the real run with the same options.
- It doesn't update the manifest, doesn't write `composer.json`, doesn't touch translations and doesn't run Pint (`formatted` is `0`).
- A schema alteration is announced as the `create` of its migration.
- It may leave empty directories where files would be created.

Always use it before `--force`: it tells you what will be regenerated and what will be preserved.

`larapack:new --dry-run` is different: it actually builds the package in a temporary directory, reports, and deletes it.

## Formatting with Pint

After writing, LaraPack runs Pint over the PHP files it created or regenerated in that run, and records their hash in the manifest again. That way the generated code passes `vendor/bin/pint --test` in CI without looking edited.

- **Which Pint it uses.** The project's own, `vendor/laravel/pint/builds/pint`, run from the root, so it reads the project's `pint.json`. The `LARAPACK_PINT` environment variable points to a different binary; if it points to a file that doesn't exist, it counts as having no Pint.
- **What it formats.** Only the `.php` files written in that run, in batches of 40 files. Never a file preserved because it was edited, and nothing in a dry run.
- **Without Pint.** The generated code stays unformatted. In text output it warns with "Pint no está en el proyecto: lo generado queda sin formatear. composer require --dev laravel/pint" (Pint isn't in the project: the generated code stays unformatted); in JSON, `formatted` is `null`.
- **If Pint fails.** Nothing is reported and generation carries on: the generated code is already written and correct, just unformatted, and the package's CI will catch it.

::: tip A formatting failure means something was written by hand
What LaraPack generates comes out formatted and passes Larastan level 5. If `pint --test` or `phpstan analyse` fails, what's failing is something written by hand: `vendor/bin/pint` formats it.
:::

## Migrations when reimporting

Migrations carry the time in their name, so searching by exact name never found them. When reimporting, LaraPack reuses the create migration that already exists for that table (`*_create_<tabla>_table.php`, the oldest one if there are several), and does the same for the meta and pivot migrations, instead of writing another one.

And a table that's already migrated doesn't change by rewriting its create migration: if the laraimport columns changed, an **alter migration** is written. All of that is covered in [Migrations and schema changes](/en/larapack/migrations).

## Extending a project that already uses LaraPack

1. Edit `laraimport.json`.
2. `larapack:validate --vue`.
3. `larapack:import --vue --dry-run --force` to see what changes and what will be preserved.
4. `larapack:import --vue --force`.
5. Carry the change over by hand to every file the report says it preserved.
6. `php artisan migrate` if there are new migrations, and `php artisan route:json` if the routes changed.
7. `larapack:verify` and the tests.

A JSON change and its regeneration go in the same commit; the logic you write afterwards goes in another one.

## Adopting the manifest in an old project

A project generated with 5.x has no `.larapack/manifest.json`, so the generator doesn't overwrite anything that already exists. To adopt it:

1. Generate over a clean copy: `larapack:import --root=../copia-limpia`.
2. Compare the files you didn't touch with `git diff --no-index`.
3. In the project, delete the files that have no changes of yours and import again: that way they enter the manifest.
4. Port the files that do have your changes by hand onto the new version, or leave them as they are, knowing they won't receive fixes.
