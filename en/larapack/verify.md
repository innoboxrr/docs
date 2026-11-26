# Verify and audit

`larapack:verify` looks inward: that the generated code is still in place and says what the contract says, and that no controller in the project does anything but delegate to its request. `larapack:audit` looks outward: that the package fits with the rest of the ecosystem. Both exit non-zero when something fails, so they work as a CI gate and as a check for an agent.

Neither tries to guess whether a class "has too much logic": that kind of check produces false positives and ends up switched off. They only check what is deterministic, and they read files with PHP's tokenizer: they never load or run project code.

## larapack:verify {#verify}

```bash
php vendor/bin/builder larapack:verify
php vendor/bin/builder larapack:verify --strict          # warnings count as failures
php vendor/bin/builder larapack:verify --format=json
php vendor/bin/builder larapack:verify --check=controller-shape --check=request-handle   # only those
```

`--check` is repeated to run several; an unknown name fails instead of giving a false green. The options are in [Commands](/en/larapack/commands#larapack-verify).

There are two families of checks. The first reads `.larapack/manifest.json`; the second goes through all the code, whether LaraPack generated it or not.

### Against the manifest {#manifest}

It doesn't receive the laraimport: it takes each model's shape (its actions, its endpoints, whether it is immutable, its secrets) from the `declaration` the manifest stores at generation time.

| Check | Level | What it detects |
|---|---|---|
| `empty-manifest` | warning | The manifest records no models. Either nothing has been generated, or `.larapack/manifest.json` isn't in the root being verified. Since 9.1 it doesn't warn a model-less package that has its providers registered —a payment gateway, an integration—: what's registered is still checked. |
| `missing-file` | error | A file that was generated and no longer exists. |
| `customised` | info | A file edited by hand since it was generated: `--force` won't touch it. |
| `inconsistent-entity` | warning | A model is missing a component that every other model of the same shape has. |
| `route-prefix` | error | The JS contract's `API_ROUTE_PREFIX` —a model's or a `controllers[]` entry's— doesn't match the name the `RouteServiceProvider` registers, or isn't declared. |
| `route-not-declared` | error | A route, controller method, request or interface component for an action or endpoint the model doesn't declare. |
| `endpoint-missing` | error | A [declared endpoint](/en/larapack/endpoints) is missing a piece: its method, its route, its request, its ability, its operation or, with a UI, its function in the JS contract. |
| `immutable-write` | error | A write path in an `immutable` model, or its model without the guard that refuses changes. |
| `secret-exposed` | error | A `secret` column that leaks back out. |
| `endpoint-tests-outdated` | warning | Since 9.1. A `<Model>EndpointsTest` from before 9.1 missing any of the tests that close authorization —the `ManagedFilter` one only if the model has a listing—. See [What the generated tests check](#generated-tests). |

`endpoint-tests-outdated` comes out once per model. That test is created once and never regenerated: it isn't in the manifest, so there's no hash to tell whether someone edited it. That's why the message says how to get the tests: save what you added, delete it, run `larapack:import` (without `--force` is enough: it creates the missing one) and paste it back. Since it's a warning, `--strict` turns `verify` red until that's done. `larapack:fix` doesn't fix it: without a hash there's no safe way to know the file is the generated one.

### Across all the code {#controllers}

It goes through every class in any `Http/Controllers`, `Http/Requests` and `Http/Resources` of the root and of the local packages (the `path` repositories in `composer.json` and `packages/*`), and the files in `routes/`. It works even without a manifest.

| Check | Level | What it detects |
|---|---|---|
| `controller-shape` | error | A controller action that does anything beyond `return $request->handle();`: it receives `Illuminate\Http\Request` or the base `FormRequest`, validates with `validate()`, passes an expression to `handle()`. Also a `__call`, a constructor that does more than assign what's injected and register middleware, and a static `middleware()` with a closure. |
| `request-handle` | error | The request the action receives doesn't define `handle()`, neither itself nor in a trait or a parent. One from `vendor/` is only reported. |
| `controller-concern` | error or warning | A trait with logic in `Http/Controllers`. Error if a controller uses it; warning if only requests use it: it belongs in `Http/Requests/Concerns`. |
| `hand-rolled` | warning or info | An action marked [`#[HandRolled('reason')]`](#handrolled). Warning without a lock; info if the owner approved it. Without a literal reason it's an error and excuses nothing. |
| `hand-rolled-unapproved` | error | With a lock: an exception that isn't approved, or whose reason changed since it was approved. |
| `hand-rolled-stale` | warning | With a lock: an approval for something that no longer carries `#[HandRolled]`. |
| `route-closure` | warning | A closure with a body as a route action in `routes/`. `group()` closures don't count, nor the `return view('...')` that `routes/web.php` ships with. |
| `index-managed` | warning | A request that uses SearchSurge's `Builder` without forcing `managed`: the listing skips `ManagedFilter::canView()`. `mergeIfMissing` doesn't count. |
| `resource-appends` | warning | A `setAppends()` fed by the request without going through an allowlist: the client decides which accessor runs on every row. |

**`controller-shape` is the single owner of "the controller does more than delegate"**, in generated and hand-written controllers alike. There's no separate check for generated ones: the same problem would show up twice, with two rules.

**What it ignores, on purpose.** A Livewire component, a Filament resource or a controller outside `Http/Controllers` doesn't receive a FormRequest or delegate to its `handle()`: demanding that shape would be a false positive on every file.

### Each check in detail

**`missing-file`** goes through every file in the manifest, including the package-level ones. Regenerate with `--force` or remove the entry from the manifest.

**`customised`** is informational: editing generated code is normal in the slots. What matters is *which* file shows up: a trait, a policy or a listener is fine; a controller, a routes file or the model is drift.

**`inconsistent-entity`** is only evaluated with two or more models, and compares each model with those that declared the same shape: the same actions and the same `immutable`. A component is the first folder of the stub (`Policy`, `Requests`, `ModelView`…), and it only counts if *every* other model of that shape has it. Metas and endpoint pieces don't count: each model declares its own.

**`route-prefix`** reads each model's `index.js` and expects `api.` + the namespace in lowercase with dots + the model in snake_case + `.`: `api.acme.catalogo.order_line.`, or `api.app.order_line.` in an application. If it doesn't match, the front end calls routes that don't exist without anything failing at build time.

**`route-not-declared`** looks, for each action the model does *not* declare, for:

- in the routes file, a `->name('<route name>')`, and also an unnamed route;
- in the controller, a public method named after the action (an `__invoke`, a constructor that injects a service);
- the file `Http/Requests/<Model>/<Action>Request.php`;
- in each interface module, its components: `views/AdminView` and `widgets/DataTable` for `index`, `views/ShowView` for `show`, `forms/CreateForm` and `views/CreateView` for `create`, and `forms/EditForm` and `views/EditView` for `update`.

The same for anything no endpoint declares. It tells apart two origins of the same trace, because the manifest knows: if someone wrote it by hand, it asks you to declare it in the laraimport; if LaraPack generated it for something no longer declared, it asks you to regenerate with `--force` to remove it. In an immutable model, writes are reported by `immutable-write`.

**`immutable-write`** looks for those same traces for `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` and `bulkDelete`, and checks that the model keeps `static::updating(` and `static::deleting(` in `booted()`. Without that guard, any `save()` or `delete()` in the code itself modifies a row that shouldn't change.

**`secret-exposed`**, for each `secret` column, fails if:

- it isn't in the model's `$hidden`;
- it is in `$export_cols`;
- the resource names it (`->token_hash`, `makeVisible('token_hash')` or a `'token_hash' =>` key), even if it's in `$hidden`;
- it's a table column in the JS contract (`id: 'token_hash'`).

**`index-managed` and `resource-appends`** find what was generated before 9.0, and anything copied from it: what's generated now already comes out protected. [`larapack:fix`](#fix) fixes them.

### The hand-written controller {#hand-written}

The rule is the same as for generated ones: **the action is `return $request->handle();`**. An endpoint that isn't CRUD [is declared](/en/larapack/endpoints). If it really has to be written by hand —a webhook, a token exchange—, authorization goes in `authorize()`, validation in `rules()` and the work in `handle()` of a `FormRequest` of its own, which delegates to the model's operation or to a support class. If the protocol dictates the shape of the error —OAuth2, LTI, a webhook signature—, override `failedValidation()` or `failedAuthorization()` on the request, and check the signature over the raw body there with `$this->getContent()`. A shared authorization trait goes in `Http/Requests/Concerns`.

Why it matters: in a real application with dozens of packages, the generated controllers all stayed at `return $request->handle();`, and the hand-written ones —a desk, a token exchange, a webhook— ended up with validation, authorization and queries inside, plus nineteen authorization traits in `Http/Controllers`. A written rule holds while someone remembers it; `controller-shape` turns it into an error.

### Exceptions: `#[HandRolled]` and its lock {#handrolled}

What can't follow the pattern —checking a signature over the raw body, an OAuth exchange that answers with OAuth errors— is marked on the class or on the action:

```php
use Innoboxrr\LarapackGenerator\Attributes\HandRolled;

#[HandRolled('The signature is computed over the raw body.')]
class StripeWebhookController extends Controller { ... }
```

**It isn't a fix an agent applies to get through.** It's an exception the project owner approves, and it stays visible. The `controller-shape` messages don't offer it as a way out, and the agent guide tells agents not to add it.

**In 9.0**, `verify` lists it as a warning on every run, and fails with `--strict`.

**Since 9.1, the approval is a file**: `.larapack/hand-rolled.lock`, a JSON list of `{target, reason, fingerprint}`, sorted and byte-stable, that the owner maintains with [`larapack:hand-rolled`](/en/larapack/commands#larapack-hand-rolled) and commits. `target` is `Class` or `Class::method`, fully qualified.

```bash
php artisan larapack:hand-rolled list                            # each exception and its state
php artisan larapack:hand-rolled approve --all                   # or one by one:
php artisan larapack:hand-rolled approve TokenController::store  # the end of the name is enough
php artisan larapack:hand-rolled revoke StripeWebhookController
```

`fingerprint` is the fingerprint of the approved code —a sha256 of its tokens, without whitespace or comments—: for a method, its signature and body; for a class, all its methods, its parent and its traits. Changing the reason, adding an action to an approved class, or changing a statement or a parameter leaves the exception unapproved, and the lock diff that re-approves it is what gets reviewed. Reformatting or commenting doesn't change it, and what the approved code calls outside the class —another class, a trait's body— isn't part of the fingerprint. Approving a bare name would be a blank cheque: the class would cover every action added to it later.

`approve` recomputes the fingerprint and `list` flags as `code-changed` what changed since it was approved. The end of the name that sets it apart is enough; if it matches more than one, nothing is guessed and nothing changes.

| Check | Without a lock | With a lock |
|---|---|---|
| `hand-rolled` | warning: `--strict` fails | info if approved: `--strict` passes |
| `hand-rolled-unapproved` | — | error: not in the lock, the reason changed or the code changed (the fingerprint doesn't match). Also an entry without a fingerprint, and an unreadable lock, which leaves everything unapproved |
| `hand-rolled-stale` | — | warning: the lock approves something that no longer carries `#[HandRolled]`; remove it with `revoke` |

Without a lock, a project on 9.1 behaves as on 9.0: nothing changes until the owner creates it. Without a lock and without exceptions in the code, `approve --all` doesn't create an empty one: the lock changes `verify`'s mode (a new `#[HandRolled]` goes from warning to error), and that doesn't happen as a side effect. The lock belongs to the root `verify` runs on: in a monorepo, the root's also approves the exceptions in `packages/*`, which its `verify` goes through. Only a package that runs `verify --strict` in its own repository has its own.

**Who touches the lock is decided by two things**, and neither depends on someone remembering:

- **CODEOWNERS and the protected branch.** `larapack:ci --owner=@team` puts the lock, the workflow and CODEOWNERS itself under the owner's review. See [In CI](#ci).
- **The guard, for agents.** The `larapack:guard --pre` hook (PreToolUse on `Write|Edit|MultiEdit|Bash`) blocks editing the lock, the commands that run `approve` or `revoke` —also through an alias, an abbreviation, the word split by quotes, or inside `bash -c` and `eval`— and the ones that write the lock without the command: a redirection, `tee`, `cp`, `mv`, `sed -i`, inline code in `php -r` or `python -c`… Reading it (`cat`, `git diff`) doesn't. It isn't airtight —a variable, a glob or a script of your own write the file some other way—: the real barrier is the owner's review. See [AI-assisted development](/en/ai/#guard).

### Fixing old code: `larapack:fix` {#fix}

`index-managed` and `resource-appends` fix themselves:

```bash
php artisan larapack:fix index-managed resource-appends --dry-run   # each file's diff
php artisan larapack:fix index-managed resource-appends             # writes
php artisan larapack:verify --check=index-managed --check=resource-appends
```

It makes the same change in every file, taken from the current stub: in the IndexRequest, `$this->merge(['managed' => true])` at the start of `prepareForValidation()` (creating it if missing, and calling the inherited one if there is one); in the Resource, the `$appendable` block in place of the old `setAppends()`, and the property if missing.

- **It only touches what comes from the generator.** It reads tokens, not regular expressions. Whatever doesn't have the generated shape is left alone and listed as `skipped` with its reason, and then it exits non-zero. Custom logic around it isn't lost.
- **It's idempotent.** Nothing counts as fixed until it parses and `verify` no longer flags it: running it twice changes nothing the second time.
- **It runs the project's Pint** over what it wrote, if there is one. In a real application with 80 packages it fixed more than five hundred IndexRequests and almost seven hundred Resources without skipping any.

It also reports two things **without fixing them**, which don't change the exit code:

- **`admin_path_missing`** (under `index-managed`): the `ManagedFilter`s whose `canView()` has no path for the administrator. With `managed` forced, `canView()` scopes everyone —the policy's `before()` doesn't bypass it— and the administrator would see an empty listing. A path is a `return $query;` in some branch or a recognizable full-scope call (`unrestricted`, `isUnrestricted`, `viewAny`, `isAdmin`), also inside the support classes `canView()` calls. Filters that can't be located come out in `managed_filter_unresolved`. **It's a reading heuristic, not a proof**: review it by hand.
- **`appendable_proposals`** (under `resource-appends`): per Resource, the accessors the front end asks for with `appends` (`appends[]=x`, `appends: [...]`, `params.appends`…), with `exists` depending on whether the model declares them. They are unconfirmed proposals: `larapack:fix` never writes them into `$appendable`, because a wrong list stops showing data on screen.

### What the generated tests check {#generated-tests}

`verify` checks the shape; tests check authorization. Each `<Model>EndpointsTest` opens authorization to check that every action responds, and since 9.1 it also carries three tests that pass as generated and don't depend on what the policy decides:

| Test | What it catches |
|---|---|
| `test_<modelo>_cada_accion_requiere_sesion` | An action that responds without a session: each one must give 401. |
| `test_<modelo>_cada_accion_pregunta_a_la_politica` | An `authorize()` that doesn't ask: with a session and authorization denied, each action gives 403. |
| `test_<modelo>_index_pasa_por_su_managed_filter` | An unscoped listing: an `IndexRequest` that doesn't force `managed`, or a `ManagedFilter` SearchSurge can't find. |

Each declared endpoint's test gains the same (`test_con_sesion_pregunta_a_la_autorizacion`): 403 with a session and authorization denied, also on public ones and on `controllers[]`. The exception is a `controllers[]` endpoint declared with [`"authorize": "authenticated"`](/en/larapack/endpoints#authenticated): its test is `test_con_sesion_basta_la_sesion`, which with authorization denied expects anything but 403. What your `canView()` lets through and what your policy decides are slots: test them in tests of your own, with your domain's users.

### What to do with the result

- **It exits with 1** if there is any error, or any warning with `--strict`. `customised` and what the lock approves never make it fail.
- **The JSON output** has the shape of [the larapack:verify output](/en/larapack/commands#json-verify).
- An agent is done when `verify` exits with 0, only flags slots as `customised`, and none of its controllers does more than `return $request->handle();`.

### In CI: `verify --strict` as a required check {#ci}

The guard acts while an agent has the hooks; the barrier that doesn't depend on anyone is the protected branch. Since 9.1, `larapack:ci` makes `verify --strict` a branch check:

```bash
php artisan larapack:ci --dry-run
php artisan larapack:ci --owner=@acme/architecture
```

1. **It creates `.github/workflows/larapack.yml`** with one job, **"LaraPack verify"**, which runs `larapack:verify --strict --format=json` on every `pull_request` and every `push` to the default branch. It picks the PHP from `config.platform.php` or the minimum `composer.lock` installs with, and the `ext-*` from `composer.json`. It edits no other workflow, and if its own differs it won't overwrite it without `--force`: it shows the diff, writes nothing —not CODEOWNERS either, which it shows as "would add"— and exits with 1.
2. **With `--owner`** (repeatable) it merges the lock, the workflow and CODEOWNERS itself into CODEOWNERS, without duplicating or touching other lines. Without `--owner` it doesn't invent an owner.
3. **It prints what it can't do**: protect the branch requiring the check and code-owner review (*Require review from Code Owners*), with the `gh api --method PUT 'repos/<owner>/<repo>/branches/<branch>/protection'` command for the owner to run. It never runs it. Every argument is in single quotes, so it pastes the same into bash, zsh and PowerShell. The branch comes from the remote: if it's unknown or has shell characters, the command carries `RAMA` in its place and says so.

The job name is the check name: if someone changes it, the protection waits for a check that never arrives and blocks everything. The check can only be required once GitHub has seen it, so commit first and let it run once.

Two options so the gate has no back door:

- **Not even an administrator skips it.** With `enforce_admins` set to `false`, whoever pushes as an administrator goes through without the check or the review, and GitHub only notes it: that's the case of an orchestrator pushing to the branch with the owner's account. The command `larapack:ci` prints asks for `true` (`--enforce-admins`, the default), and `--no-enforce-admins` sets it to `false` with a warning. The price is that GitHub won't let you approve your own PR: the agent's PRs have to come from an account other than the sole code owner's.
- **The project's runners.** `--runs-on` (repeatable, `--runs-on=self-hosted --runs-on=linux`, or a JSON list, `--runs-on='["self-hosted","linux"]'`) puts the job on the runners the project already uses. Without it the job goes to `ubuntu-latest`, and if other workflows run somewhere else it says so, with the option already written out. A job that never starts leaves the required check pending and nothing merges; and in a monorepo where `verify` takes minutes, the hosted runner bills them on every PR.

A package created with `larapack:new` carries the same job in its `tests.yml`, and `larapack:audit` warns with `verify-job` when the CI of a package that uses LaraPack doesn't run `verify --strict`. A package under `packages/` of a repository whose root already runs `verify --strict` gets no warning: the root's `verify` goes through it with a single lock. See [The workflows](/en/ci/workflows#verify).

## larapack:audit {#audit}

```bash
php vendor/bin/builder larapack:audit                     # the current package
php vendor/bin/builder larapack:audit packages --all      # every package in a directory
php vendor/bin/builder larapack:audit --format=json --strict
```

It compares the package with the **baseline**: the `ecosystem.json` of the LaraPack running the command. Updating LaraPack updates the baseline.

```json
{
    "php": { "require": "^8.3", "matrix": ["8.3", "8.4", "8.5"] },
    "laravel": { "illuminate": "^13.0", "testbench": "^11.0" },
    "dev": { "phpunit/phpunit": "^12.0 || ^13.0", "laravel/pint": "^1.18", "larastan/larastan": "^3.0" },
    "node": { "engines": ">=22.12", "ci": "22" },
    "js": { "vite": "^8.0.0", "vitest": "^5.0.0", "vue": "^3.5.0", "react": "^19.0.0" },
    "internal": {
        "innoboxrr/larapack-generator": "^9.0",
        "innoboxrr/traits": "^2.1",
        "innoboxrr/support": "^2.1",
        "innoboxrr/search-surge": "^3.0"
    },
    "internalNpm": { "innoboxrr-form-core": "^2.9.0", "…": "…" },
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
| `verify-job` | warning | The package uses LaraPack and no workflow runs `larapack:verify --strict`. Since 9.1. Add it with `larapack:ci` or by copying the job from a freshly created package. |

### npm checks

| Code | Level | What it detects |
|---|---|---|
| `npm-field` | warning | `name`, `version`, `license`, `type`, `exports`, `files` or `sideEffects` is missing. `sideEffects: false` counts as declared. |
| `node-engines` | warning | `engines.node` isn't exactly `>=22.12`. |
| `js-version` | per the rule | `vite`, `vitest`, `vue` or `react` in `dependencies` or `devDependencies`. `peerDependencies` aren't checked: they say what the library can work against, and holding them to the baseline would narrow them for no gain. |
| `workflow-missing` | error | `tests.yml` or `release.yml` is missing. |
| `bump-patch` | error or warning | Same as for Composer. |

A directory with neither `composer.json` nor `package.json` gives `not-a-package` (warning).

::: tip The generated module isn't audited on its own
The audit reads the `composer.json` and `package.json` of the path it receives. The `package.json` in `resources/vue` or `resources/react` is only audited if you pass that path; its `innoboxrr-*` versions are the ones in `internalNpm`, and it requires Vite 8. The `js` baseline is the one for the ecosystem's npm packages, which since 9.0 are on Vite 8 too, with Vitest 5.
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
