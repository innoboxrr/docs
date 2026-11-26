# The baseline

`larapack:verify` looks inward at a package: whether generated code is still coherent
with its manifest. `larapack:audit` looks outward: **whether it fits with the other
packages of the ecosystem**. It's what stops the alignment from coming undone on the
next push, and that's why CI runs it before releasing.

## Why it exists

Packages used to declare whatever they wanted, or nothing at all: 23 out of 29 had
neither `php` nor `illuminate/*`, so Composer would have installed them on any
version, and drift was only discovered when something broke in production.

Now the rule lives in a single file, `ecosystem.json`, inside LaraPack, and
`larapack:audit` enforces it. **It deliberately fixes nothing**: it reports, and the
fix is a human decision or an explicit CI step.

## Running the audit

```bash
php vendor/bin/builder larapack:audit                    # the current package
php vendor/bin/builder larapack:audit packages --all     # every subdirectory that's a package
php vendor/bin/builder larapack:audit --format=json --strict
```

CI runs it like this, and it's what you should run before pushing:

```bash
php vendor/innoboxrr/larapack-generator/builder larapack:audit .
```

| Argument or option | What it does |
|---|---|
| `[path]` | The package directory, or the one containing several with `--all`. Defaults to `.` |
| `--all` | Audits every subdirectory that has a `composer.json` or `package.json` |
| `--format=txt\|json` | Text output (default) or a single JSON document |
| `--strict` | Warnings also make the command fail |

`larapack:audit` has no `--root`: the path is its argument. It exits 1 if there are
errors, warnings with `--strict`, or if the path doesn't exist ("La ruta indicada no
existe."). Messages are in Spanish:

```json
{
    "ok": false,
    "errors": 1,
    "warnings": 1,
    "findings": [
        {
            "level": "error",
            "check": "internal-version",
            "package": "innoboxrr/laravel-setup",
            "message": "`innoboxrr/larapack-generator: ^7.10.2` no admite la línea base `^7.10`."
        },
        {
            "level": "warning",
            "check": "internal-version",
            "package": "innoboxrr/laravel-auth",
            "message": "`innoboxrr/larapack-generator: ^7.0` admite versiones fuera de la línea base `^7.10`; la matriz de CI tiene que cubrirlas."
        }
    ]
}
```

## `ecosystem.json`

```json
{
    "version": 1,
    "php": {
        "require": "^8.3",
        "matrix": ["8.3", "8.4", "8.5"]
    },
    "laravel": {
        "illuminate": "^13.0",
        "testbench": "^11.0"
    },
    "dev": {
        "phpunit/phpunit": "^12.0 || ^13.0",
        "laravel/pint": "^1.18",
        "larastan/larastan": "^3.0"
    },
    "node": {
        "engines": ">=22.12",
        "ci": "22"
    },
    "js": {
        "vite": "^8.0.0",
        "vitest": "^5.0.0",
        "vue": "^3.5.0",
        "react": "^19.0.0"
    },
    "internal": {
        "innoboxrr/larapack-generator": "^9.0",
        "innoboxrr/traits": "^2.1",
        "innoboxrr/support": "^2.1",
        "innoboxrr/search-surge": "^3.0"
    },
    "internalNpm": {
        "innoboxrr-form-core": "^2.9.0",
        "innoboxrr-form-elements": "^6.9.0",
        "innoboxrr-react-form-elements": "^3.9.0",
        "innoboxrr-vue-datatable": "^3.2.0",
        "innoboxrr-react-datatable": "^3.2.0",
        "innoboxrr-http-request": "^2.1.0",
        "innoboxrr-i18n": "^1.3.0",
        "innoboxrr-locale-generator": "^2.1.0",
        "innoboxrr-js-validator": "^2.1.0",
        "innoboxrr-route-resolver": "^2.1.0"
    },
    "generated": {
        "require": {
            "laravel/sanctum": "^4.3",
            "maatwebsite/excel": "^4.0"
        }
    },
    "required": {
        "composer": ["name", "description", "license", "autoload"],
        "npm": ["name", "version", "license", "type", "exports", "files", "sideEffects"]
    },
    "workflows": {
        "composer": ["tests.yml", "release.yml"],
        "npm": ["tests.yml", "release.yml"]
    }
}
```

(Without the `$comment*` keys the real file carries. This is LaraPack 9.0's.)

| Key | What it sets | Who uses it |
|---|---|---|
| `php.require` | The PHP constraint | `audit`: `php-missing`, `php-version` |
| `php.matrix` | CI PHP versions | Matches the default matrix of `php-tests.yml` |
| `laravel.illuminate` | `illuminate/*` and `laravel/framework` | `audit`: `illuminate-missing`, `illuminate-version` |
| `laravel.testbench` | `orchestra/testbench` | `audit`: `testbench-version` |
| `dev` | PHPUnit, Pint and Larastan | `larapack:new`, when writing `require-dev`. The audit doesn't check it |
| `node.engines` | An npm package's `engines.node` | `audit`: `node-engines` |
| `node.ci` | The reference Node version in CI | Informational: no command reads it |
| `js` | The npm packages' test toolchain | `audit`: `js-version` |
| `internal` | Composer dependencies between ecosystem packages | `audit`: `internal-version` |
| `internalNpm` | The npm versions a generated module declares | A LaraPack test compares them with the templates. The audit doesn't check them |
| `generated.require` | What generated code uses beyond the baseline | `larapack:new` puts it in `require`; the EndToEnd suite installs it |
| `required` | Required fields in `composer.json` and `package.json` | `audit`: `composer-field`, `npm-field` |
| `workflows` | Workflows each kind of package must have | `audit`: `workflow-missing` |

## What it checks

`larapack:audit` works out what each directory is on its own: with `composer.json` it
runs the Composer checks, with `package.json` the npm ones, and with both, both.

### Composer packages

| Code | Level | When it fires | What to do |
|---|---|---|---|
| `composer-field` | warning | `name`, `description`, `license` or `autoload` is missing | Add it. It still publishes, but is unidentified on Packagist |
| `composer-version` | error | `composer.json` pins `"version"` | Remove it. Composer discards every tag that doesn't match it, so the new version stays invisible |
| `php-missing` | error | `require` doesn't declare `php` | `"php": "^8.3"` |
| `php-version` | error or warning | The `php` constraint doesn't admit the baseline, or admits more | See [the rule](#the-rule-exact-wide-or-narrow) |
| `illuminate-missing` | error | The package uses Laravel and declares no `illuminate/*` or `laravel/framework` | Declare `^13.0` |
| `illuminate-version` | error or warning | Each `illuminate/*` or `laravel/framework` against `^13.0` | See the rule |
| `testbench-version` | error or warning | `orchestra/testbench`, if declared, against `^11.0` | See the rule |
| `internal-version` | error or warning | Each package from `internal` that's declared, against its baseline | See the rule and [the `conflict` pattern](#requiring-a-minimum-above-the-baseline-conflict) |
| `phpunit-config` | error | No `phpunit.xml` or `phpunit.xml.dist` | Add the config |
| `no-tests` | error | No `*Test.php` at all | Add at least one test |
| `workflow-missing` | error | `.github/workflows/tests.yml` or `release.yml` is missing | Create it (see [The workflows](/en/ci/workflows)) |
| `bump-patch` | error or warning | A `bump-patch.yml` is still there | Replace it with `release.yml` |
| `verify-job` | warning | The package uses LaraPack and no workflow runs `larapack:verify --strict` (since 9.1) | Add the "LaraPack verify" job: `larapack:ci`, or copy it from a freshly created package. See [The workflows](/en/ci/workflows#verify) |

Where each one looks:

- **`php`** only in `require`. **Illuminate, Testbench and internal packages** in
  `require` and `require-dev`.
- **"Uses Laravel"** means some `src/*.php` mentions `Illuminate\`, or
  `src/Providers`, `database/migrations` or `routes` exists. It's conservative on
  purpose: it only avoids demanding Illuminate from a framework-agnostic package.
- **`no-tests`** looks for `tests/*Test.php` and `tests/<folder>/*Test.php`. A package
  whose tests all live deeper (`tests/Feature/Models/`) gets the error: keep at least
  one at the first level, like `larapack:new`'s `tests/Feature/PackageBootsTest.php`.
- **`bump-patch`** is an error if the bump hangs off `push` without waiting for the
  suite, and a warning if it waits (`workflow_run:` or `needs: tests`): it doesn't
  publish blind, but it guesses the version from the last tag instead of declaring
  it.
- **`verify-job`** only looks at packages that use LaraPack, and searches their
  workflows for `larapack:verify --strict`. With `larapack:audit --strict` in CI,
  the warning turns it red until the job exists.

In a monorepo, a package under `packages/` whose root already runs `verify --strict`
doesn't need its own job, and `verify-job` doesn't warn: the root's `verify` goes
through `packages/*` with a single lock. If the root doesn't run it, the warning asks
for the job at the root (`larapack:ci` there), not a `larapack.yml` per package.

### npm packages

| Code | Level | When it fires | What to do |
|---|---|---|---|
| `npm-field` | warning | `name`, `version`, `license`, `type`, `exports`, `files` or `sideEffects` is missing | Add it. The key is what's checked: `"sideEffects": false` is valid |
| `node-engines` | warning | `engines.node` isn't exactly `>=22.12` | `"engines": { "node": ">=22.12" }`. It compares text: `>=22` also warns |
| `js-version` | error or warning | `vite`, `vitest`, `vue` or `react` in `dependencies` or `devDependencies`, against `js` | See the rule |
| `workflow-missing` | error | `tests.yml` or `release.yml` is missing | Create it |
| `bump-patch` | error or warning | A `bump-patch.yml` is still there | Replace it |

`peerDependencies` are left out on purpose. A library declaring `react: ^18 || ^19` is
doing the right thing: it says what it can run against, not what it's built with.

### The test toolchain: Node 22.12, Vite 8 and Vitest 5 {#node}

Since LaraPack 9.0 the npm packages' baseline is **Vite 8 and Vitest 5**, and
`engines.node` moves to **`>=22.12`**. There are two reasons: Vitest 5 requires
Node `^22.12 || >=24`, and Node 20 has been EOL since 30 April 2026. The ten
`innoboxrr-*` packages have already moved (`innoboxrr-form-core` 2.9.0,
`innoboxrr-form-elements` 6.9.0, `innoboxrr-react-form-elements` 3.9.0, the
datatables 3.2.0 and the rest at their next minor version), and their CI tests Node
22 and 24.

Your own npm package still on `vitest ^3` or `engines >=20` now shows up in
`larapack:audit` (`js-version`, `node-engines`). To align it:

1. In `devDependencies`, `vite` `^8.0.0` and `vitest` `^5.0.0` (and whatever depends
   on them, such as `jsdom` or `@vitejs/plugin-*`).
2. In `package.json`, `"engines": { "node": ">=22.12" }`.
3. In its `tests.yml`, the matrix without Node 20:

   ```yaml
   jobs:
       tests:
           uses: innoboxrr/.github/.github/workflows/node-tests.yml@main
           # No Node 20: it's EOL and Vitest 5 requires ^22.12 || >=24.
           with:
               node-versions: '["22", "24"]'
   ```

The UI module LaraPack generates already required Vite 8; with 9.0 its `innoboxrr-*`
dependencies move up to the versions above (`internalNpm`).

### Neither

| Code | Level | When it fires |
|---|---|---|
| `not-a-package` | warning | The path has neither `composer.json` nor `package.json` |

It doesn't appear with `--all`: only subdirectories that are packages get audited.

## The rule: exact, wide or narrow

What matters isn't that the text matches the baseline, but that the constraint **admits
it**.

| Case | What it means | Example | Result |
|---|---|---|---|
| Exact | Says exactly the baseline | `"php": "^8.3"` | Nothing |
| Wide | Admits the baseline and also versions outside it | `"illuminate/support": "^12.0 \|\| ^13.0"`, `"innoboxrr/larapack-generator": "^7.0"` | **Warning**: legitimate, but the CI matrix must really cover what it promises |
| Narrow | Doesn't admit the whole baseline | `"php": "^8.4"`, `"innoboxrr/larapack-generator": "^7.10.2"` | **Error**: something is actually broken |
| Unreadable | Composer can't parse it | `"php": "8.3 or newer"` | Warning |

A wide constraint makes sense: narrowing it to `^13.0` only takes away the option of
installing the library on Laravel 12. `innoboxrr/traits` declares `^12.0 || ^13.0`,
which is why its CI tests both Laravel 12 and 13.

A narrow one is an error because it breaks installing packages together: a package
demanding `^7.10.2` can't be installed where another sits on `7.10.0`, which the
baseline allows. And since `tests.yml` runs the audit, **an error blocks the release**.

## Requiring a minimum above the baseline: `conflict`

Sometimes a package needs a fix that landed in a patch release above the baseline.
`laravel-setup` needs LaraPack 7.10.2, and the baseline says `^7.10`. Writing
`^7.10.2` in `require` is a narrow constraint: the audit fails and nothing is
released. That's what happened to laravel-setup 7.0.0.

The fix is to **keep `require` at the baseline and exclude older versions with
`conflict`**:

```json
{
    "require": {
        "php": "^8.3",
        "innoboxrr/larapack-generator": "^7.10",
        "laravel/framework": "^13.0"
    },
    "conflict": {
        "innoboxrr/larapack-generator": "<7.10.2"
    }
}
```

It works for two reasons:

- **Composer combines both**: `^7.10` and not `<7.10.2` is effectively
  `>=7.10.2 <8.0`.
- **The audit reads `require` and `require-dev`**, not `conflict`: it sees an exact
  constraint.

Once `ecosystem.json` raises its baseline above that minimum, the `conflict` is
redundant and gets removed.

::: tip
Run the audit locally before pushing a release:
`php vendor/innoboxrr/larapack-generator/builder larapack:audit .`. It's the same line
CI runs.
:::

An **application** doesn't go through the audit, so it can require the minimum
directly: `app:setup` writes the LaraPack version it needs into the `require-dev`
of the application it creates.

## What it doesn't check

- **The `dev` versions** (PHPUnit, Pint, Larastan): only `larapack:new` uses them.
- **`internalNpm`**: the `innoboxrr-*` dependencies in a generated module's
  `package.json` are aligned by hand (step 8 of the [upgrade guide](/en/larapack/upgrade)).
- **`peerDependencies`.**
- **Whether the CI matrix really covers** a wide constraint. A person reviews that.
- **Formatting and types**: the `quality` job handles that, with Pint and Larastan. See
  [The workflows](/en/ci/workflows).
- **Whether CI runs the audit at all.** A package whose `tests.yml` doesn't call
  `php-tests.yml`, or that doesn't install LaraPack, isn't audited in CI.
