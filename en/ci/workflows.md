# The workflows

How a package is tested and released is defined **once**, in the reusable workflows of
`innoboxrr/.github`, and every repository calls them. That file used to be copied into
each repository, and copying isn't sharing: when something had to change, either all
fifteen got touched or fifteen variants were left behind.

| Repository | `tests.yml` calls | `release.yml` calls |
|---|---|---|
| Composer package | `php-tests.yml` | `php-release.yml` |
| npm package | `node-tests.yml` | `node-release.yml` |

All are referenced at `@main`:
`uses: innoboxrr/.github/.github/workflows/php-tests.yml@main`.

## `php-tests.yml`

```yaml
# .github/workflows/tests.yml
name: Tests

on:
    push:
        branches: [main, master]
    pull_request:

jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main
```

`name: Tests` matters: `release.yml` waits for a workflow with that name.

### Inputs

| Input | Type | Default | What it does |
|---|---|---|---|
| `php-versions` | string (JSON array) | `'["8.3", "8.4"]'` | PHP versions in the matrix |
| `audit` | boolean | `true` | Run `larapack:audit` against the package |
| `extensions` | string | `''` | Extra PHP extensions, comma-separated |
| `tests-required` | boolean | `true` | Fail when there's no runnable suite. With `false`, a package without tests passes by installing and compiling |
| `COMPOSER_AUTH` (secret) | optional | — | Composer auth JSON, for private dependencies declared as `vcs` repositories |

```yaml
jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main
        with:
            php-versions: '["8.3", "8.4", "8.5"]'
            extensions: 'pdo_sqlite, sqlite3'
        secrets:
            COMPOSER_AUTH: ${{ secrets.COMPOSER_AUTH }}
```

### What it does, in order

One run per PHP version (`fail-fast: false`):

1. **Installs** with `composer update --prefer-dist --no-interaction --no-progress`.
   `update`, not `install`: packages are libraries and don't commit a lockfile, so the
   suite runs against what whoever installs them will actually resolve.
2. **Syntax:** `php -l` on every file in `src/`. It's the minimum gate left for
   packages without a suite.
3. **Resolved versions** of `illuminate/support` and `phpunit/phpunit`, for the log.
4. **Audit** (when `audit` is `true`):
   - with LaraPack 7 or later in `vendor/`, runs
     `php vendor/innoboxrr/larapack-generator/builder larapack:audit .`;
   - with an older LaraPack that lacks `larapack:audit`, warns and skips;
   - inside LaraPack itself, runs `php builder larapack:audit .`;
   - without LaraPack, warns and skips.
5. **Tests:** `vendor/bin/phpunit` if there's PHPUnit, its config and at least one
   `*Test.php`. Otherwise it fails, or only warns with `tests-required: false`.

::: warning
**The audit only runs when LaraPack is installed in `vendor/`**, via `require` or
`require-dev`. And only in repositories whose `tests.yml` calls `php-tests.yml`:
`innoboxrr/traits` and `innoboxrr/search-surge` have their own matrix and currently
don't go through the audit in CI.
:::

## `php-release.yml`

```yaml
# .github/workflows/release.yml
name: Release

on:
    workflow_run:
        workflows: ['Tests']
        types: [completed]
        branches: [main, master]
    workflow_dispatch:

jobs:
    release:
        permissions:
            contents: write

        uses: innoboxrr/.github/.github/workflows/php-release.yml@main
```

| Input | Default | What it does |
|---|---|---|
| `php-version` | `'8.4'` | PHP the job runs on |

What it does:

1. **Only runs** when dispatched by hand (`workflow_dispatch`) or when `Tests`
   succeeded.
2. Checks out the commit `Tests` ran on (`workflow_run.head_sha`) with full history.
3. **Reads the version from `VERSION`**, trimming spaces and newlines. Only when there's
   no `VERSION` does it look at the `version` key of `composer.json`; if there's
   neither, it fails.
4. **If the tag already exists, it does nothing.**
5. Creates the tag **without a `v` prefix** (`7.10.3`) and pushes it. Packagist
   publishes when it receives it.

::: danger
**`permissions: contents: write` goes in each repository's `release.yml`.** The
reusable workflow needs it to push the tag, and a repository whose default token
permission is read-only can't grant it. That doesn't fail the job: it fails the whole
workflow at startup (`startup_failure`), with no log and no explanation.
:::

::: info
The header comment of `php-release.yml` says "the version is declared by
composer.json". It isn't: `VERSION` wins, and the `version` key in `composer.json` is
only a last resort that `larapack:audit` flags as an error (`composer-version`). Use
`VERSION`.
:::

## `node-tests.yml`

```yaml
# .github/workflows/tests.yml
name: Tests

on:
    push:
        branches: [master]
    pull_request:

jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/node-tests.yml@main
```

| Input | Default | What it does |
|---|---|---|
| `node-versions` | `'["20", "22", "24"]'` | Node versions in the matrix |
| `working-directory` | `'.'` | The package directory, if not the root |

For each Node version: checkout, `npm install --no-audit --no-fund` (no lockfile, for
the same reason as Composer), and `npm test`.

## `node-release.yml`

```yaml
# .github/workflows/release.yml
name: Release

on:
    workflow_run:
        workflows: ['Tests']
        types: [completed]
        branches: [master]
    workflow_dispatch:

jobs:
    release:
        uses: innoboxrr/.github/.github/workflows/node-release.yml@main
        secrets: inherit
```

| Input | Default | What it does |
|---|---|---|
| `working-directory` | `'.'` | The package directory |

What it does, with `permissions: contents: write` and `id-token: write`:

1. Only runs after a green `Tests` or when dispatched by hand.
2. Node 22 with the npm registry, then **`npm install -g npm@latest`**: the npm bundled
   with Node 22 predates OIDC support.
3. Reads the version from `package.json`. If the tag `v<version>` already exists, it
   does nothing.
4. `npm install`, `npm test`, and **`npm publish --provenance --access public` without
   `NODE_AUTH_TOKEN`**.
5. Creates and pushes the tag `v<version>`.

Publishing uses trusted publishing; the requirements are in
[Releasing a version](/en/ci/releasing#npm-packages).

## Jobs each repository adds

### `quality`: Pint and Larastan

Packages created by `larapack:new`, and LaraPack itself, add a job to `tests.yml` that
checks formatting and types. It doesn't depend on the PHP version, so it runs once:

```yaml
jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main

    quality:
        name: Pint y Larastan
        runs-on: ubuntu-latest

        steps:
            - uses: actions/checkout@v5

            - uses: shivammathur/setup-php@v2
              with:
                  php-version: '8.4'
                  coverage: none

            - name: Instalar dependencias
              run: composer update --prefer-dist --no-interaction --no-progress

            - name: Formato
              run: vendor/bin/pint --test

            - name: Análisis estático
              run: vendor/bin/phpstan analyse --no-progress --memory-limit=1G
```

With its configuration:

::: code-group

```json [pint.json]
{
    "preset": "laravel"
}
```

```yaml [phpstan.neon.dist]
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    level: 5
    paths:
        - src
        - database
    # Larastan learns each model's columns by reading its migrations.
    databaseMigrationsPath:
        - database/migrations
    # Casts live in the casts() method; without this Larastan doesn't know payload is an array.
    parseModelCastsMethod: true
```

:::

What LaraPack generates comes out formatted and passes that analysis, so **a failure
here is something written by hand**: `vendor/bin/pint` formats it.

To add it to an existing package:

```bash
composer require --dev laravel/pint larastan/larastan
# copy pint.json, phpstan.neon.dist and the quality job from a freshly created package
vendor/bin/pint
git commit -am "Formatear con Pint"
```

Formatting everything at once, in its own commit, keeps the history of other changes
clean.

LaraPack also tests PHP 8.5 (`php-versions: '["8.3", "8.4", "8.5"]'`): 8.3 resolves
`symfony/console` 7.4 and 8.4 or later resolves 8.x, which have different signatures
in `Command::configure()`.

### `frontend`: the base application's interfaces

`innoboxrr/laravel-setup` copies its interfaces as-is into every new application: if
their tests fail, nothing is released.

```yaml
    frontend:
        runs-on: ubuntu-latest

        strategy:
            fail-fast: false
            matrix:
                ui: [vue, react]

        name: Interfaz ${{ matrix.ui }}

        defaults:
            run:
                working-directory: tests/Frontend/${{ matrix.ui }}

        steps:
            - uses: actions/checkout@v5

            - uses: actions/setup-node@v5
              with:
                  node-version: 22

            - run: npm install --no-audit --no-fund

            - run: npx vitest run
```

## Why satellites stay on Vite 7 and Vitest 3

The ecosystem's npm packages test with **Vite 7 and Vitest 3**, and the baseline pins
it (`js.vite: ^7.1.0`, `js.vitest: ^3.0.0`). Applications and generated modules are
already on **Vite 8**, Laravel 13's.

The reason is npm: **Vitest 4 with Vite 8.3 crashes `npm install` on npm 10**, the npm
bundled with Node 20 and 22, two of the three versions in the `node-tests.yml` matrix.
With npm 11 the suites pass, but CI installs with each Node's own npm.

A generated module can require Vite 8 because it doesn't install Vitest. For the same
reason, laravel-setup's React test harness (`tests/Frontend/react`) uses `vite ^7.1`,
`@vitejs/plugin-react ^5` and `vitest ^3.2`, even though the application it copies
requires `vite ^8` and `@vitejs/plugin-react ^6`.

This gets revisited when npm 10 fixes it or CI moves to npm 11.

## Common CI problems

Startup failures, reruns that reuse an old workflow version, empty logs and secrets
across organizations are covered in [Troubleshooting](/en/help/#ci).
