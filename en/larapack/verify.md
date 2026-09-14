# Verify and audit

`larapack:verify` looks inward: that the generated code is still in place and says what the contract says. `larapack:audit` looks outward: that the package fits with the rest of the ecosystem. Both exit non-zero when something fails, so they work as a CI gate and as a check for an agent.

Neither tries to guess whether a class "has too much logic": that kind of check produces false positives and ends up switched off. They only check what is deterministic.

## larapack:verify {#verify}

```bash
php vendor/bin/builder larapack:verify
php vendor/bin/builder larapack:verify --strict          # warnings count as failures
php vendor/bin/builder larapack:verify --format=json
```

It reads `.larapack/manifest.json` and the files. It doesn't receive the laraimport: it takes each model's shape (its actions, whether it is immutable, its secrets) from the `declaration` the manifest stores at generation time.

| Check | Level | What it detects |
|---|---|---|
| `empty-manifest` | warning | The manifest records no models. Either nothing has been generated, or `.larapack/manifest.json` isn't in the root being verified. It's the only finding in that case. |
| `missing-file` | error | A file that was generated and no longer exists. |
| `customised` | info | A file edited by hand since it was generated: `--force` won't touch it. |
| `inconsistent-entity` | warning | A model is missing a component that every other model of the same shape has. |
| `route-prefix` | error | The JS contract's `API_ROUTE_PREFIX` doesn't match the name the `RouteServiceProvider` registers, or isn't declared. |
| `route-not-declared` | error | A route, controller method, request or interface component for an action the model doesn't declare. |
| `immutable-write` | error | A write path in an `immutable` model, or its model without the guard that refuses changes. |
| `secret-exposed` | error | A `secret` column that leaks back out. |

### Each check in detail

**`missing-file`** goes through every file in the manifest, including the package-level ones. Regenerate with `--force` or remove the entry from the manifest.

**`customised`** is informational: editing generated code is normal in the slots. What matters is *which* file shows up: a trait, a policy or a listener is fine; a controller, a routes file or the model is drift.

**`inconsistent-entity`** is only evaluated with two or more models, and compares each model with those that declared the same shape: the same actions and the same `immutable`. A component is the first folder of the stub (`Policy`, `Requests`, `ModelView`…), and it only counts if *every* other model of that shape has it. Metas don't count: one model having them and another not is a decision.

**`route-prefix`** reads each model's `index.js` and expects `api.` + the namespace in lowercase with dots + the model in snake_case + `.`: `api.acme.catalogo.order_line.`, or `api.app.order_line.` in an application. If it doesn't match, the front end calls routes that don't exist without anything failing at build time.

**`route-not-declared`** looks, for each action the model does *not* declare, for:

- in the routes file, a `->name('<nombre de ruta>')`;
- in the controller, a public method named after the action;
- the file `Http/Requests/<Model>/<Acción>Request.php`;
- in each interface module, its components: `views/AdminView` and `widgets/DataTable` for `index`, `views/ShowView` for `show`, `forms/CreateForm` and `views/CreateView` for `create`, and `forms/EditForm` and `views/EditView` for `update`.

They exist because someone wrote them by hand. Declare the action in the laraimport, or remove them. In an immutable model, writes are reported by `immutable-write`.

**`immutable-write`** looks for those same traces for `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` and `bulkDelete`, and checks that the model keeps `static::updating(` and `static::deleting(` in `booted()`. Without that guard, any `save()` or `delete()` in the code itself modifies a row that shouldn't change.

**`secret-exposed`**, for each `secret` column, fails if:

- it isn't in the model's `$hidden`;
- it is in `$export_cols`;
- the resource names it (`->token_hash`, `makeVisible('token_hash')` or a `'token_hash' =>` key), even if it's in `$hidden`;
- it's a table column in the JS contract (`id: 'token_hash'`).

### What to do with the result

- **It exits with 1** if there is any error, or any warning with `--strict`. `customised` never makes it fail.
- **The JSON output** has the shape of [the larapack:verify output](/en/larapack/commands#json-verify).
- An agent is done when `verify` exits with 0 and only flags slots as `customised`.

## larapack:audit {#audit}

```bash
php vendor/bin/builder larapack:audit                     # the current package
php vendor/bin/builder larapack:audit packages --all      # every package in a directory
php vendor/bin/builder larapack:audit --format=json --strict
```

It compares the package with the **baseline**: the `ecosystem.json` of the LaraPack running the command. Updating LaraPack updates the baseline.

```json
{
    "php": { "require": "^8.3", "matrix": ["8.3", "8.4"] },
    "laravel": { "illuminate": "^13.0", "testbench": "^11.0" },
    "dev": { "phpunit/phpunit": "^12.0 || ^13.0", "laravel/pint": "^1.18", "larastan/larastan": "^3.0" },
    "node": { "engines": ">=20", "ci": "22" },
    "js": { "vite": "^7.1.0", "vitest": "^3.0.0", "vue": "^3.5.0", "react": "^19.0.0" },
    "internal": {
        "innoboxrr/larapack-generator": "^7.10",
        "innoboxrr/traits": "^2.1",
        "innoboxrr/support": "^2.1",
        "innoboxrr/search-surge": "^3.0"
    },
    "internalNpm": { "innoboxrr-form-core": "^2.8.0", "…": "…" },
    "generated": { "require": { "laravel/sanctum": "^4.3", "maatwebsite/excel": "^4.0" } },
    "required": {
        "composer": ["name", "description", "license", "autoload"],
        "npm": ["name", "version", "license", "type", "exports", "files", "sideEffects"]
    },
    "workflows": { "composer": ["tests.yml", "release.yml"], "npm": ["tests.yml", "release.yml"] }
}
```

(Excerpt; `internalNpm` holds the versions the generated module declares, and `generated`, what `larapack:new` adds to `require`.)

The audit works out on its own what the directory is: if it has a `composer.json` it audits it as a Composer package, if it has a `package.json` as an npm package, and if it has both, both ways.

### Composer checks

| Code | Level | What it detects |
|---|---|---|
| `composer-field` | warning | `name`, `description`, `license` or `autoload` is missing. |
| `composer-version` | error | `composer.json` pins `version`. Composer discards every tag that doesn't match it, so a new version would stay invisible. |
| `php-missing` | error | `require` doesn't declare `php`. |
| `php-version` | per the [rule](#the-constraint-rule) | The `php` constraint against `^8.3`. |
| `illuminate-missing` | error | The package uses Laravel and declares no `illuminate/*` or `laravel/framework`. It uses Laravel if any `src/*.php` mentions `Illuminate\`, or if it has `src/Providers`, `database/migrations` or `routes`. |
| `illuminate-version` | per the rule | Every `illuminate/*` or `laravel/framework`, in `require` or `require-dev`, against `^13.0`. |
| `testbench-version` | per the rule | `orchestra/testbench`, if declared, against `^11.0`. |
| `internal-version` | per the rule | Every dependency from `internal` that is declared, in `require` or `require-dev`. |
| `phpunit-config` | error | There is no `phpunit.xml` or `phpunit.xml.dist`. |
| `no-tests` | error | There is no `*Test.php` in `tests/`. |
| `workflow-missing` | error | `.github/workflows/tests.yml` or `release.yml` is missing. |
| `bump-patch` | error or warning | `bump-patch.yml` is still there. It's an error if it releases without waiting for the tests, and a warning if it waits for them with `workflow_run` or `needs: tests`: it has a gate, but it derives the version from the last tag instead of declaring it. |

### npm checks

| Code | Level | What it detects |
|---|---|---|
| `npm-field` | warning | `name`, `version`, `license`, `type`, `exports`, `files` or `sideEffects` is missing. `sideEffects: false` counts as declared. |
| `node-engines` | warning | `engines.node` isn't exactly `>=20`. |
| `js-version` | per the rule | `vite`, `vitest`, `vue` or `react` in `dependencies` or `devDependencies`. `peerDependencies` aren't checked: they say what the library can work against, and holding them to the baseline would narrow them for no gain. |
| `workflow-missing` | error | `tests.yml` or `release.yml` is missing. |
| `bump-patch` | error or warning | Same as for Composer. |

A directory with neither `composer.json` nor `package.json` gives `not-a-package` (warning).

::: tip The generated module isn't audited on its own
The audit reads the `composer.json` and `package.json` of the path it receives. The `package.json` in `resources/vue` or `resources/react` is only audited if you pass that path; its `innoboxrr-*` versions are the ones in `internalNpm`, and it requires Vite 8, while the `js` baseline is the one for the ecosystem's npm packages, which are still on Vite 7.
:::

### The constraint rule {#the-constraint-rule}

What matters isn't whether the text matches, but which versions the constraint allows. There are three cases:

| Case | What it means | Result |
|---|---|---|
| **Exact** | Allows exactly the baseline. | Nothing. |
| **Wide** | Allows the baseline and also versions outside it. | Warning: it's legitimate, but the CI matrix has to actually cover what it promises. |
| **Narrow** | Doesn't allow the whole baseline. | Error: the package couldn't be installed where the ecosystem says it works. |

With the `php` baseline at `^8.3`: `^8.3` is exact, `^8.2` is wide and `^8.4` is narrow. With `illuminate/support` at `^13.0`, a library that declares `^12.0 || ^13.0` is wide. A constraint that can't be parsed gives a warning with the same code.

### Requiring a specific patch: the `conflict` pattern

Sometimes a package needs a fix from a patch release, for example LaraPack 7.10.2. Raising `require` to `^7.10.2` is **narrow** against the `^7.10` baseline and blocks the release. The right way is to keep `require` at the baseline and exclude older versions with `conflict`, which the audit doesn't compare:

```json
{
    "require-dev": {
        "innoboxrr/larapack-generator": "^7.10"
    },
    "conflict": {
        "innoboxrr/larapack-generator": "<7.10.2"
    }
}
```

Composer won't install a version older than the fix, and the audit stays green.

### In CI

- **It exits with 1** if there is any error, or any warning with `--strict`, and also if the path doesn't exist.
- The ecosystem's `tests.yml` runs it before the test suite, so a package that doesn't meet the baseline never gets released. See [The baseline](/en/ci/) and [The workflows](/en/ci/workflows).
- Before pushing, run it locally: `php vendor/innoboxrr/larapack-generator/builder larapack:audit .`
- The JSON output has the shape of [the larapack:audit output](/en/larapack/commands#json-audit).
