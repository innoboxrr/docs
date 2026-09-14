# Preparing the project

An agent only follows the LaraPack flow if it knows about it. The instructions live
inside LaraPack, in `skill/SKILL.md`, and get copied into the project where the agent
actually reads them. Before that, pick the right starting point.

## Pick a starting point

| You're going to… | Start with | What it saves you |
|---|---|---|
| Build an application | The [base application](/en/app-base/) (`innoboxrr/laravel-setup`) | Session, site, admin panel, the generated user, and everything a generated module expects from its host |
| Build a package | `larapack:new` | A baseline `composer.json`, providers, tests, workflows, `AGENTS.md` and the skill already installed |
| Work on an existing project | `composer require` LaraPack, then `larapack:skill` | None of the above: read [In an existing project](/en/getting-started/existing-project) |

### A new application: the base application

This is the best starting point for an agent, because it removes the work agents do
worst: glue. The base application already has `statefulApi()`,
`JsonResource::withoutWrapping()`, providers registered in `bootstrap/providers.php`,
toast and confirmation hosts mounted, module translations loaded, and a menu built
from each model's routes. The user is already declared in `laraimport.json` with
`authenticatable`, so the agent adds models to the same file and they show up in the
menu.

::: code-group

```bash [Vue]
composer create-project laravel/laravel my-app
cd my-app
# configure the database and APP_URL in .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup
git diff                      # review what it wrote
# put your email in ADMIN_EMAILS in .env

php artisan app:install
php artisan larapack:skill
composer run dev
```

```bash [React]
composer create-project laravel/laravel my-app
cd my-app
# configure the database and APP_URL in .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup --react
git diff                      # review what it wrote
# put your email in ADMIN_EMAILS in .env

php artisan app:install
php artisan larapack:skill
composer run dev
```

:::

::: warning
**`APP_URL` must be the exact address you open the app with, including the port.**
Sanctum only accepts the session cookie from the domains in
`SANCTUM_STATEFUL_DOMAINS`. With any other address, login works but every admin
table returns 401. It's the first thing an agent misdiagnoses.
:::

`app:setup` only runs on a freshly created application (it refuses without
`--force`) and **installs nothing**: it writes `composer.json`, `package.json`, the
config, the screens and the user. `app:install` updates dependencies, migrates,
seeds the example site, exports `routes.json` and builds. `larapack:skill` comes
after `app:install`, because that `composer update` is what brings LaraPack into
`vendor/`. Details in [Install](/en/app-base/install).

Adding a model to the base application is always the same:

```bash
php artisan larapack:validate laraimport.json --vue
php artisan larapack:import laraimport.json --vue
php artisan migrate
php artisan route:json
npm run build
```

(with `--react` in a React application). To restrict it to admins, add its route to
`adminOnly`: the route name in Vue, its id in React. See
[Customize and extend](/en/app-base/customize).

### A new package: `larapack:new`

```bash
php vendor/bin/builder larapack:new acme/catalog packages/catalog
cd packages/catalog
composer install
```

`php vendor/bin/builder` is the binary of an existing LaraPack installation, for
example the application you'll use the package in. Inside a Laravel application,
`php artisan larapack:new` works too.

`larapack:new` leaves the agent everything it needs:

- `.claude/skills/larapack/SKILL.md`, the skill already installed;
- `AGENTS.md`, pointing at the skill for agents other than Claude Code;
- `composer.json` with the [baseline](/en/ci/) versions, LaraPack in `require-dev`,
  and `phpunit.xml.dist` with a first test;
- `tests.yml` and `release.yml`, `pint.json`, `phpstan.neon.dist`, `VERSION` at
  0.1.0 and `CHANGELOG.md`.

It refuses a directory that already has a `composer.json`, and
`larapack:new acme/catalog --dry-run` reports exactly what it would create. The
generated `.gitattributes` marks `.claude` and `AGENTS.md` as `export-ignore`, so the
agent instructions don't ship to whoever installs the package.

### An existing project

```bash
composer require --dev innoboxrr/larapack-generator
```

In a package that wasn't created with `larapack:new`, once:

```bash
php vendor/bin/builder larapack:providers   # App, Auth, Event and Route
php vendor/bin/builder larapack:config
```

Then align versions with `larapack:audit` and copy the workflows from a freshly
created package (`larapack:new vendor/x --dry-run` in an empty directory lists them).
In an application, first read [Package or application](/en/concepts/package-or-application):
providers are registered by hand in `bootstrap/providers.php`.

::: info
The LaraPack README shows `composer require innoboxrr/larapack-generator` without
`--dev`. `larapack:new` and the base application put it in `require-dev`, which is
the consistent choice: generated code doesn't depend on LaraPack at runtime.
:::

## Install the skill

```bash
php vendor/bin/builder larapack:skill                  # -> .claude/skills/larapack/SKILL.md
php vendor/bin/builder larapack:skill --path=AGENTS.md # for agents that read AGENTS.md
php vendor/bin/builder larapack:skill --print          # to standard output
php vendor/bin/builder larapack:skill --source         # path of the original inside vendor/
php vendor/bin/builder larapack:skill --force          # overwrite the destination
```

Inside an application, the same with `php artisan larapack:skill`.

| Option | What it does |
|---|---|
| `--path=PATH` | Destination, relative to the project root. Defaults to `.claude/skills/larapack/SKILL.md`. |
| `--print` | Writes the skill to standard output and installs nothing. |
| `--source` | Prints only the path of the original inside the package. |
| `--force` | Overwrites the destination even if it exists and differs. |
| `--root=PATH` | The project to install into, if not the discovered one. |

**Why a copy.** No agent reads a package inside `vendor/`: neither Claude Code nor
Codex looks there. And because the original lives in LaraPack, upgrading the
generator brings new instructions; you just copy them again.

The skill itself is written in Spanish, like the rest of LaraPack's messages.

### Claude Code

Claude Code loads the skill from `.claude/skills/larapack/` on its own when a task
touches models, endpoints, forms or views. The skill's description tells it to use
the skill before hand-writing any controller, request, policy, migration or UI
module.

### Codex and other agents

They read `AGENTS.md`. There are two ways to give it to them:

- **A short `AGENTS.md` that points at the skill.** This is what `larapack:new`
  creates (in Spanish):

  ````md
  # Instrucciones para agentes

  La arquitectura de este paquete la genera LaraPack. Antes de crear o cambiar un
  modelo, un endpoint, una request, una política, una migración o una vista, lee
  `.claude/skills/larapack/SKILL.md` y sigue su flujo: se declara en
  `laraimport.json` y se genera, no se escribe a mano.

  Si ese archivo falta, o LaraPack se actualizó:

  ```
  php vendor/bin/builder larapack:skill --force
  ```
  ````

  It says: LaraPack generates this package's architecture; before creating or
  changing a model, endpoint, request, policy, migration or view, read the skill and
  follow its flow; if the file is missing or LaraPack was upgraded, run
  `larapack:skill --force`.

- **The whole skill in `AGENTS.md`**, with `larapack:skill --path=AGENTS.md`.

::: warning
In a package created with `larapack:new`, `AGENTS.md` already exists. Without
`--force`, `--path=AGENTS.md` leaves it alone; with `--force` it replaces the pointer
(and any project rules you added) with the full skill.
:::

### After upgrading LaraPack

The instructions travel with the generator version. After every upgrade:

```bash
php vendor/bin/builder larapack:skill --force
```

Without `--force`, a destination that differs from the package isn't overwritten, so
project rules added to the copy aren't lost. In that case the command prints "Ya
existe y difiere del paquete" ("already exists and differs from the package") and
**exits 0**: it doesn't fail. To see what changed before overwriting:

```bash
git diff --no-index .claude/skills/larapack/SKILL.md "$(php vendor/bin/builder larapack:skill --source)"
```

::: tip
If you added your own rules to the skill copy, move them to another file before using
`--force`. That way upgrading LaraPack doesn't wipe them.
:::

## Check the project is ready

Before asking the agent for anything:

1. **`.larapack/manifest.json` is committed.** Without it the generator can't tell
   your code from its own and becomes conservative with everything.
2. **`laraimport.json` validates:** `larapack:validate --vue` (or `--react`). The
   base application already ships the user.
3. **`larapack:verify` is green.** In a project where nothing has been generated yet
   it warns with `empty-manifest`.
4. **Pint is in the project** (`composer require --dev laravel/pint`). Without it,
   generated code stays unformatted: the import says so in text mode, and in JSON
   `formatted` is `null`.
5. **The test suite passes:** `vendor/bin/phpunit`.
6. **In a package, `larapack:audit` has no errors.**

With that, the agent starts from green and any red that shows up is its own. Continue
with [The agent loop](/en/ai/loop).
