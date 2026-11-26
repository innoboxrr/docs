# What LaraPack is

`innoboxrr/larapack-generator` generates and maintains the architecture of a Laravel 13 API, and its interface in Vue or React, from a declarative file: `laraimport.json`. It is the core of the ecosystem: the base application generates its user with it, every in-house package comes out of it, and its baseline (`ecosystem.json`) is what every package's CI audits.

It isn't a scaffolder that starts a project and disappears. It always generates the same thing from the same contract, keeps what you write by hand, and checks that the generated code still says what the contract says.

## The problem it solves

Building many models, by hand or with an AI, doesn't fail because it's slow. It fails because of **drift**: each model comes out slightly different from the last, and thirty models later the application no longer has one architecture, it has thirty.

LaraPack turns that around. You write a small, verifiable JSON file, and the roughly 58 pieces of every model always come out identical: migration, model, traits, filters, controller, requests, policy, resource, events, export, routes, factory, test and the interface module.

## The rule

> **Architecture is declared, not written.** What you do write by hand is business logic, and only in the slots the generator leaves for it.

If an endpoint, a field or a screen is missing, it's missing from `laraimport.json` or from the generator, not from the generated file. Writing it by hand is exactly the drift `larapack:verify` reports.

## Three checks with exit codes

| Command | What it checks | When |
|---|---|---|
| `larapack:validate` | That `laraimport.json` is valid against the schema and coherent as a document. | Before generating. `larapack:import` runs the same validation and writes nothing if it fails. |
| `larapack:verify` | That the generated code is still in place and says what the contract says, and that no controller in the project, generated or not, does more than `return $request->handle();`. | After generating and writing the logic, on every agent edit with the [guard](/en/ai/#guard), and in CI as a required branch check. |
| `larapack:audit` | That the package meets the ecosystem baseline: versions, tests and release workflows. | In every package's CI, before releasing. |

All three exit non-zero when something fails, and with `--format=json` they print a single JSON document. That's why an agent can iterate without asking: see [The agent loop](/en/ai/loop).

## Who does what

| What | Who decides or writes it | Where |
|---|---|---|
| The shape of the domain: models, columns, relations, which actions each table has, what is secret or immutable | A person, or an agent reviewed by a person | `laraimport.json` |
| The structure: every model's pieces, in PHP and in the interface | The generator | Everything generated |
| Business logic, authorization and visibility | A person or an agent | The [slots](/en/larapack/generated-code#where-your-code-goes) |
| That everything keeps adding up | The tools and CI | `validate`, `verify`, `audit`, the tests, Pint and Larastan |
| What gets released and when | A person | `VERSION` and `CHANGELOG.md` |

`laraimport.json` is the architecture decision. That's why it's the first thing to review in a change: if the JSON is right, the generated code is right by construction. What a person reviews, and in which order, is in [What a person reviews](/en/ai/review).

## Install

```bash
composer require --dev innoboxrr/larapack-generator
```

The generated code doesn't depend on LaraPack at runtime: it uses `innoboxrr/traits`, `innoboxrr/support` and `innoboxrr/search-surge`. That's why it belongs in `require-dev`, which is where `larapack:new` and the base application put it.

Requirements: PHP `^8.3`, `illuminate/support` `^13.0` and `symfony/console` `^7.4 || ^8.0`. The rest of the environment is in [Requirements](/en/getting-started/requirements).

## How to run it

Commands live in the `larapack:` namespace and run in two ways:

```bash
php artisan larapack:import --vue              # inside a Laravel application
php vendor/bin/builder larapack:import --vue   # the binary, also outside Laravel
```

- **`php artisan`** has them because LaraPack declares `GeneratorServiceProvider` for Laravel package discovery. That's the usual way inside an application.
- **`php vendor/bin/builder`** is a Symfony Console binary that doesn't boot Laravel. It's what you use inside a package, which has no `artisan`.

The command classes are the same in both cases, so options and output are identical.

### Legacy names

The binary also registers the pre-6.0 names as aliases: every `larapack:<command>` also answers to `make:<command>`, except `larapack:import`, which answers to `json:importer`, and `larapack:remove-full-model`, which answers to `remove:full-model`.

Artisan doesn't register them, because `make:model`, `make:policy`, `make:factory` and `make:observer` are Laravel's own commands. In scripts and CI, always use `larapack:`.

## Which project it works on: `--root` {#root}

Everything LaraPack reads or writes is relative to the project root. Without `--root`, the root is discovered by walking up from LaraPack's own folder until a `vendor/autoload.php` is found:

- installed in an application's or a package's `vendor/`, that gives the root of that project;
- running the binary on a clone of the generator itself, that gives the generator.

`--root=<ruta>` sets the root explicitly. A path that doesn't exist is an error ("La raíz indicada no existe", "the given root doesn't exist") and the command writes nothing: that's what an agent needs so it never generates in the wrong place.

```bash
php vendor/bin/builder larapack:import --root=packages/catalogo --vue
```

::: warning Not every command has `--root`
`larapack:new` creates the project in the directory it receives as an argument, `larapack:schema` doesn't depend on any project, and `larapack:audit` takes the path as an argument (`larapack:audit packages --all`). Each command's options are in [Commands](/en/larapack/commands#common-options).
:::

The root also decides the **mode**, from the `type` in its `composer.json`: `library`, or no `type`, is a package and generates into `src/`; any other value, such as Laravel's `project`, is an application and generates into `app/`. The differences are in [Package or application](/en/concepts/package-or-application).

## The workflow

```text
0. larapack:new vendor/paquete          only if the package doesn't exist yet
1. larapack:schema                      the contract is read, not guessed
2. edit laraimport.json
3. larapack:validate --vue              fails → fix the JSON, not the code
4. larapack:import --vue --dry-run      what it's going to touch
5. larapack:import --vue                generates; with --force, regenerates
6. write the logic in the slots
7. larapack:verify                      fails → something drifted from the contract
8. vendor/bin/phpunit                   the behavior
```

The steps to start a project are in [A new package](/en/getting-started/new-package), [A new application](/en/getting-started/new-app) and [In an existing project](/en/getting-started/existing-project).

## In this section

| Page | What for |
|---|---|
| [The contract: laraimport.json](/en/larapack/laraimport) | Every key, with its type, default and effect, and the validation errors and warnings. |
| [Commands](/en/larapack/commands) | Every command with its real options, exit codes and JSON output. |
| [What is generated and where your code goes](/en/larapack/generated-code) | The file map, the slots, what not to touch and what is never rewritten. |
| [Regenerate without destroying](/en/larapack/regenerate) | The manifest, `--force`, `--dry-run` and Pint formatting. |
| [Verify and audit](/en/larapack/verify) | The `verify` and `audit` checks, `#[HandRolled]` exceptions, `larapack:fix` and the CI check. |
| [Metas and payload](/en/larapack/metas) | Flexible data without a column, end to end. |
| [Routes, immutables, secrets and users](/en/larapack/actions) | The twelve actions, `routes`, `immutable`, `secret`, `authenticatable`, `display`, bulk actions and inline editing. |
| [Declared endpoints](/en/larapack/endpoints) | What isn't CRUD: `endpoints` on a model and `controllers` at the root, with their UI. |
| [The generated UI](/en/larapack/ui) | The Vue and React module: views, table, model contract, texts and theme. |
| [Mounting a package in an application](/en/larapack/mount-in-app) | What the host application provides. |
| [Export to Excel](/en/larapack/export) | The export, its configuration and its notification. |
| [Migrations and schema changes](/en/larapack/migrations) | Create, metas, pivot and alter migrations. |
| [Upgrade guide](/en/larapack/upgrade) | What to do when moving to a new version. |
