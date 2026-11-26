# Releasing a version

In the ecosystem, **the version is declared and the tag is derived**. A person bumps
`VERSION` (or `package.json`'s `version`), pushes, and if the tests pass CI creates the
tag and the registry publishes it.

## Why it works this way

A `bump-patch.yml` copied into 22 repositories used to auto-increment a tag on every
push to `master` **without running a single test**. It also read the latest version
with `git tag --sort=creatordate`, which sorts by date rather than semver, and a
`#major` mentioned in passing in a commit message was enough to release a major version
by accident.

With the current model:

- **The version is an explicit decision**, in a file that shows up in the diff.
- **Tests are the gate:** a push with a failing test releases nothing.
- **A tag that already exists isn't recreated:** pushing without changing the version
  releases nothing, and a released version is never overwritten.

## PHP packages

1. Make the change and check it locally (see the [checklist](#checklist)).
2. Bump `VERSION` following semver and describe the change in `CHANGELOG.md`.
3. Push to `master` (or `main`).
4. `Tests` runs the suite, the audit and the repository's own jobs.
5. If it passes, `Release` reads `VERSION` and creates the tag **without a `v` prefix**
   (`2.1.1`).
6. Packagist publishes when it receives the tag.

```bash
cat VERSION                          # 2.1.1
git push origin master
gh run watch                         # follow the running workflow
git ls-remote --tags origin 2.1.1    # the tag exists
composer show --all innoboxrr/support | grep versions
```

Each repository's `release.yml`:

```yaml
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

::: danger
Without `permissions: contents: write` in that file, a repository whose default
permission is read-only won't start the workflow: `startup_failure`, no log.
:::

::: warning
**Dispatching `Release` by hand (`workflow_dispatch`) skips the test gate:** the job
runs even if `Tests` is red. Use it only to retry a release whose `Tests` already
passed.
:::

**Don't put `"version"` in `composer.json`.** Composer discards every tag that doesn't
match it, so the new version would stay invisible. `larapack:audit` flags it as an
error (`composer-version`).

## npm packages

1. Bump `version` in `package.json` and describe the change in `CHANGELOG.md`.
2. Push to `master`.
3. `Tests` runs the Node matrix.
4. If it passes, `Release` upgrades npm, installs and tests again, **publishes** with
   provenance, and then creates the tag `v<version>` (`v3.1.1`).

```bash
node -p "require('./package.json').version"
git push origin master
gh run watch
npm view innoboxrr-vue-datatable version
```

### Trusted publishing (OIDC)

Publishing uses no token: npm trusts the repository and its workflow.

Once per package, on npmjs.com → the package → **Settings → Trusted Publisher**:
GitHub Actions, with the repository, the `release.yml` workflow and permission to
publish. The job needs `id-token: write`, which `node-release.yml` already declares.

::: danger
**Don't pass `NODE_AUTH_TOKEN` or `NPM_TOKEN`.** When npm sees a token it authenticates
with it **instead of** using OIDC, and publishing ends up asking for a two-factor code
nobody can type in CI: provenance gets signed and the publish fails right after.
:::

- **A new package** needs its owner to configure the trusted publisher on npmjs.com
  before CI can publish it.
- **npm must be recent.** Node 22's npm predates OIDC support, which is why
  `node-release.yml` runs `npm install -g npm@latest` before publishing.
- **The registry can take a while** to list the new version even when the log shows
  the publish with provenance. Check the log and the tag before publishing again.

::: info
The ecosystem's npm `release.yml` files don't declare `permissions`; the reusable
workflow does. If a repository's default token permission is read-only, the same thing
happens as with PHP. In that case, declare `contents: write` and `id-token: write` on
the calling job.
:::

## Commit conventions

- **In Spanish, explaining why**, not what the diff does. For example, "No mandar el
  token CSRF en la query de las peticiones GET" ("Don't send the CSRF token in the
  query string of GET requests").
- **One per conceptual change.** A `laraimport.json` change and its regeneration go
  together; business logic written afterwards goes in another commit.
- **`.larapack/manifest.json` is committed** together with the code it describes.
- **The release has its own commit**, which bumps `VERSION` and the `CHANGELOG`:
  "Publicar la 6.1.0: volver de una suplantación es un POST con token CSRF". The bump
  can also go in the same commit as the change; what counts is that nothing is
  released until the version changes.
- **Push to `master`**: the gate is the tests, not a release branch.
- **No agent attribution lines** (an AI's `Co-Authored-By`) in the ecosystem's
  repositories.

## CHANGELOG

Each version says **what changed, why, and what whoever upgrades has to do**.
LaraPack's format (in Spanish):

```md
## 7.10.2

Lo que encontró el piloto de la aplicación base al exportar dentro de una
aplicación, y un aviso falso en cada importación. Lo que se genera en un paquete
no cambia.

- **La exportación renderiza en una aplicación.** Pedía su vista como
  `app::excel.<modelo>` con `config('app.excel_view')`: nadie registra las vistas
  `app::` y cada exportación fallaba con "No hint path defined for [app]". Ahora
  pide `excel.<modelo>`, la vista que genera en `resources/views/excel`.

### Para proyectos existentes

Una aplicación generada con 7.10.0 o 7.10.1 tiene que regenerar con `--force` los
archivos de exportación de `app/Exports` y `app/Notifications`. Un paquete no tiene
que hacer nada.
```

- One `## X.Y.Z` heading per version, newest first.
- A context paragraph, then bullets that start with the change in bold and follow with
  the reason.
- **`### Para proyectos existentes`** ("for existing projects") when there's something
  to do. If it takes many steps, they go in the README's upgrade guide ("De 7.10.1 a
  7.10.2") and the CHANGELOG links to it.

Some packages, such as `laravel-auth`, use the Keep a Changelog format, with dates and
sections like "Security" or "Cambio incompatible" (breaking change). That's fine too:
what can't be missing is the reason and what whoever upgrades must do.

## Checklist

### PHP package

1. The working tree is clean and up to date with `origin/master`.
2. `vendor/bin/phpunit` passes. On Windows without SQLite:
   `php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit`.
3. If it uses LaraPack: `php vendor/bin/builder larapack:verify` has no errors.
4. `php vendor/innoboxrr/larapack-generator/builder larapack:audit .` has no errors. If
   you need a minimum above the baseline, use
   [`conflict`](/en/ci/#requiring-a-minimum-above-the-baseline-conflict).
5. If it has the `quality` job: `vendor/bin/pint --test` and
   `vendor/bin/phpstan analyse`.
6. If it has UI tests: `npm install` and `npx vitest run` in each
   `tests/Frontend/<ui>`.
7. `VERSION` bumped following semver, and no `version` in `composer.json`.
8. `CHANGELOG.md` with the reason and, if needed, "Para proyectos existentes"; the
   README upgrade guide, if there are steps.
9. Pushed. `Tests` and `Release` green, the tag exists and Packagist lists it.
10. Packages that depend on this new version update their `require` or `conflict`
    **after** the tag exists.

### npm package

1. `npm install` and `npm test` pass on Node 22 and on Node 24, the ones CI uses.
2. `version` bumped in `package.json`; `engines.node` is `>=22.12`; `name`, `license`,
   `type`, `exports`, `files` and `sideEffects` are present.
3. `CHANGELOG.md` updated.
4. Trusted publisher configured on npmjs.com (essential for a new package), and no
   `NODE_AUTH_TOKEN` in the workflow or the secrets it receives.
5. Pushed. `Tests` and `Release` green, and the tag `v<version>` exists.
6. `npm view <package> version` shows the new one; it may take a while.
7. If generated modules should require the new version, update `internalNpm` in
   `ecosystem.json` and release LaraPack.
