# Troubleshooting

Each problem, with its symptom, its cause and how to fix it. Many come from an old
package version: current versions are in
[Versions and compatibility](/en/help/versions).

[[toc]]

## Session and access

### Every admin table returns 401 after logging in

**Symptom.** Login works, but every admin table returns 401 and sends you back to the
login screen.

**Cause.** Sanctum doesn't recognize the requests as coming from the SPA itself and
rejects the session cookie. That happens when:

- `APP_URL` isn't the address you open the app with, including its port;
- the address isn't in `SANCTUM_STATEFUL_DOMAINS`, which by default covers
  `localhost`, `127.0.0.1:8000` and the `APP_URL` host;
- `SESSION_DOMAIN` doesn't match that address;
- `$middleware->statefulApi()` is missing from `bootstrap/app.php`.

**Fix.**

```ini
# .env: the exact browser address, including the port
APP_URL=http://127.0.0.1:8000
```

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})
```

```bash
php artisan config:clear
```

The base application already has `statefulApi()`. In your own application, check it.

### Two local applications log each other out

**Symptom.** Logging in to one application logs you out of the other.

**Cause.** Both run on `127.0.0.1` on different ports and share cookies.

**Fix.** Serve the second one on `localhost`, and put that address in its `APP_URL`:

```bash
php artisan serve --host=localhost --port=8001
```

### Requests return 419

**Symptom.** A POST, PUT or DELETE returns 419.

**Cause.** The CSRF cookie is missing or expired. Also, since axios 1.6 the
`X-XSRF-TOKEN` header isn't sent without `withXSRFToken`, not even to the same origin.

**Fix.** The base application's interface fetches a new cookie from
`/sanctum/csrf-cookie` and retries the request once. In your own front end:

```js
axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true

await axios.get('/sanctum/csrf-cookie')   // before logging in
```

If it keeps failing, check `SESSION_DOMAIN` and `SANCTUM_STATEFUL_DOMAINS`: they're the
usual reason a session "doesn't stick".

### Leaving impersonation returns 405

**Symptom.** While impersonating, the button to return to your own account returns 405,
or does nothing and the session stays impersonated.

**Cause.** laravel-auth 6.1.0 only accepts POST on `auth.revert.impersonate`: over GET,
another site could end an admin's impersonation with an `<img>`. Your interface still
calls it with GET. This affects applications created with laravel-setup 7.0.0 and any
custom front end.

**Fix.** Call it with POST and the CSRF token. The application's interface is yours
from the moment it's installed, so upgrading laravel-setup doesn't change it: edit the
session store.

::: code-group

```js [Vue: stores/auth.js]
const revertImpersonation = async () => {
    await http.post(apiUrl(AUTH_ROUTES.revertImpersonation))
    // …
}
```

```js [React: stores/auth.js]
revertImpersonation: async () => {
    const { data } = await http.post(resolve('auth.revert.impersonate'))
    // …
},
```

```blade [Blade]
<form method="POST" action="{{ route('auth.revert.impersonate') }}">
    @csrf
    <button type="submit">Back to my account</button>
</form>
```

:::

See [laravel-auth](/en/packages/laravel-auth).

### Changing the password logs the user out

**Symptom.** After changing the password, the next API request returns 401.

**Cause.** laravel-auth before 6.0.3 didn't renew the password hash stored in the
session, and `AuthenticateSession` treated the session as invalid.

**Fix.** `composer update innoboxrr/laravel-auth` to 6.0.3 or later.

### The verify-your-email banner shows for users who can't verify

**Symptom.** The interface asks users whose model doesn't implement `MustVerifyEmail`
to verify their email.

**Cause.** laravel-auth before 6.0.2 answered `verified: false` for every user without
a verified email.

**Fix.** Upgrade laravel-auth to 6.0.2 or later.

### The admin can't see the admin area, or gets 403

**Symptom.** With your account the admin menu group doesn't show, a screen returns 403,
or a new model doesn't appear in the menu.

**Cause.** One of these:

- `ADMIN_EMAILS` is empty or doesn't include your email, so `isAdmin()` returns
  `false`;
- the config is cached and the `.env` change hasn't been read;
- the model's route has no title, or has parameters: the menu only lists first-level
  routes with a title and no parameters;
- the interface hasn't been rebuilt.

**Fix.**

```ini
# .env: comma-separated
ADMIN_EMAILS=you@example.com,someone@example.com
```

```bash
php artisan config:clear
php artisan route:json
npm run build
```

To restrict a model to admins, add its route to `adminOnly`: the name in Vue, the id in
React. See [The admin panel](/en/app-base/admin).

### An admin gets 403 when saving the site options

**Symptom.** The site editor doesn't save: every write returns 403.

**Cause.** laravel-options before 2.1.0 never registered its policy.

**Fix.** Upgrade `innoboxrr/laravel-options` to 2.1.0 or later.

### The `.env` editor fails with "Route [login] not defined"

**Symptom.** Opening `/env-editor` without a session throws "Route [login] not
defined".

**Cause.** The `auth` middleware redirects guests to a route named `login`, and the
application doesn't have one.

**Fix.** Say where login lives, as the base application does:

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->redirectGuestsTo('/auth/login');
})
```

## Routes and front end

### The table is empty even though the API returns data

**Symptom.** The index request returns 200 with records and the table renders none.

**Cause.** The table expects `data`, `meta` and `links` at the root of the response.
Without `JsonResource::withoutWrapping()` an extra `data` wrapper arrives.

**Fix.**

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

### "Unknown backend route", or a request to the current page

**Symptom.** The console shows
`Unknown backend route "x". Run php artisan route:json.`, or a request goes to the URL
of the page you're on.

**Cause.** The route isn't in `routes.json`: an endpoint was added and not exported
again, or `routes-to-json` writes the file somewhere other than where the interface
reads it.

**Fix.**

```bash
php artisan route:json
npm run build
```

Check `path` in `config/routes-to-json.php` (or `JSON_ROUTES_FILE`). The base
application uses `resources/<ui>/routes.json`; the package default is
`resources/vue/assets/json/routes.json`. So you don't forget:

```json
"build": "php artisan route:json && vite build"
```

### The admin panel has no styles

**Symptom.** The generated module renders without any styling.

**Cause.** In a package module generated before LaraPack 7.7.1, `sideEffects` in
`resources/<ui>/package.json` doesn't include `src/theme.js`, so Vite drops the theme
import and the stylesheet with it.

**Fix.**

::: code-group

```json [Vue]
"sideEffects": ["*.css", "*.vue", "src/theme.js"]
```

```json [React]
"sideEffects": ["*.css", "src/theme.js"]
```

:::

### The module breaks with vue-router, Pinia or React Router

**Symptom.** Injection errors, two routers, or empty stores when mounting a module.

**Cause.** `npm install vue-router pinia` without versions installs majors the module
doesn't declare (vue-router 5, Pinia 4). And a module installed from a folder can bring
its own copy of each.

**Fix.**

::: code-group

```bash [Vue]
npm install vue vue-router@4 pinia@3 @vitejs/plugin-vue
```

```bash [React]
npm install react react-dom react-router-dom@7 zustand@5 @vitejs/plugin-react
```

:::

```js
// vite.config.js
resolve: { dedupe: ['vue', 'vue-router', 'pinia'] },
```

### Model and field names show up in English

**Symptom.** LaraPack's own strings are translated, but "Price", "Status" or "Products"
show up as-is.

**Cause.** By design. LaraPack can't know what your model and fields are called in each
language: it leaves them as `""` in `src/locales/es.json`, and while they are, the key
shows.

**Fix.** Translate them in the module's `resources/<ui>/src/locales/es.json` or in the
application's language file (`resources/<ui>/app/lang/es.json` in the base
application). Regenerating adds missing keys and never overwrites a written translation.

## Boot, migrations and cache

### `php artisan migrate` fails on a new application with `CACHE_STORE=database`

**Symptom.** On a freshly created Laravel 13 application, `migrate` fails before the
cache table is created.

**Cause.** Several providers read the cache at boot, and with `CACHE_STORE=database`
(Laravel 13's default) the table doesn't exist yet. They also shared the keys
`auth_policies` and `events_and_observers`, so one package received another's
listeners.

**Fix.** Upgrade laravel-options 2.1.0, laravel-notifications 2.1.0, laravel-uploads
2.1.x, laravel-audit 2.1.x, aws-file-manager 2.0.0 and support 2.1.1, and regenerate
LaraPack's event provider (7.10 or later):

```bash
php vendor/bin/builder larapack:event-service-provider --dry-run
php vendor/bin/builder larapack:event-service-provider --force
```

If you edited it, `--force` keeps it: remove the
`Cache::remember('events_and_listeners', ...)` by hand and iterate `discoverEvents()`
directly.

### Application routes load twice, or verification emails arrive twice

**Symptom.** Routes registered twice, or two verification emails per sign-up.

**Cause.** Old package versions had providers extending Laravel's `RouteServiceProvider`
and `EventServiceProvider`, which reloaded the application's routes and events.

**Fix.** Upgrade to the Laravel 13 versions: laravel-options, laravel-notifications,
laravel-uploads, laravel-audit and laravel-env-editor 2.1.x, aws-file-manager 2.0.0,
locale-generator and routes-to-json 2.1.0, support 2.1.1, and laravel-auth 6.0.1 or
later.

### "Table already exists", or the same create migration twice

**Symptom.** `migrate` fails because the table already exists, and there are two
`create_<table>_table` files with different timestamps.

**Cause.** Before LaraPack 7.7.1, re-importing duplicated create migrations.

**Fix.** Delete the newer one and its entry in `.larapack/manifest.json`, and upgrade
LaraPack: it now reuses create, metas and pivot migrations.

### I changed columns in the JSON and no alter migration was written

**Symptom.** You re-import after changing a column and no
`<date>_alter_<table>_table.php` appears.

**Cause.** One of these:

- the create migration was edited by hand, and LaraPack doesn't guess at what was
  written outside the laraimport;
- the change is to a foreign key, which would mean dropping and recreating it with its
  data;
- the create migration wasn't generated by LaraPack, like Laravel's `users` migration,
  and is skipped;
- in an earlier version you regenerated the create migration of an already migrated
  table with `--force`: that difference never reached the database and LaraPack can no
  longer see it.

**Fix.** Write that migration by hand, once:

```bash
php artisan make:migration alter_products_table
```

The base application already adds `payload` and `softDeletes` to `users` with its own
migration. See [Migrations and schema changes](/en/larapack/migrations).

## Generation

### `larapack:verify` fails with `route-not-declared`

**Symptom.** After removing unneeded actions by hand, `verify` fails, and so does CI.

**Cause.** There's a route, method, request or view for an action the model doesn't
declare, or the other way round: something the JSON still declares was deleted by hand.

**Fix.** Declare the real shape in `laraimport.json` and regenerate:

```json
{ "name": "AuditEvent", "immutable": true, "routes": { "only": ["policies", "index", "show"] } }
```

```bash
php vendor/bin/builder larapack:import --dry-run
php vendor/bin/builder larapack:import --force
```

### The output of `larapack:import --format=json` can't be decoded

**Symptom.** An agent or a script fails to read the import report.

**Cause.** Before LaraPack 7.10.3, `larapack:import --format=json` printed progress
lines ("Processing model: …") ahead of the document.

**Fix.** Upgrade LaraPack to 7.10.3 or later. Since then the output is a single
document, including on failure.

### Generated code isn't formatted

**Symptom.** `pint --test` fails in CI on files nobody edited.

**Cause.** The project doesn't have Pint in `vendor/laravel/pint` (or `LARAPACK_PINT`
points at a file that doesn't exist): the import says so in text mode, and in JSON
`formatted` is `null`. A failure of Pint itself doesn't stop generation and isn't
reported.

**Fix.**

```bash
composer require --dev laravel/pint
vendor/bin/pint
```

### `--force` didn't apply the change to a file

**Symptom.** You regenerate with `--force` and a file stays as it was.

**Cause.** `--force` never overwrites a hand-edited file: it keeps it and says so
(`preserved`). Also, the `Relations`, `Storage` and `Operations` traits are only created
when missing, and generated tests are never overwritten.

**Fix.** Carry the change into each preserved file by hand. If you don't want the edit,
delete the file and import again.

### In an application, generated tests fail with namespace errors or 404

**Symptom.** In an application generated with LaraPack 7.10.0, almost every generated
test fails.

**Cause.** Factories were generated in `App\Database\Factories` and tests in
`App\Tests`, which the application doesn't autoload, and the tests called URIs without
`app/` and without a session.

**Fix.**

1. Factories and models: `larapack:import --dry-run`, then
   `larapack:import --force`. In edited ones, change `App\Database\Factories` to
   `Database\Factories`.
2. Tests: if you didn't touch them, delete
   `tests/Feature/Models/<Model>EndpointsTest.php` and import again. If you edited
   them, change `App\Tests` to `Tests`, call `route('api.app.<model>.<action>')`, and
   log in before each call.
3. If LaraPack 7.10.0 created `tests/TestCase.php` extending
   `Orchestra\Testbench\TestCase`, delete it and import again.
4. Register the `EventServiceProvider` in `bootstrap/providers.php`.

See the [upgrade guide](/en/larapack/upgrade).

## Exports and files

### The export fails with "No hint path defined for [app]"

**Symptom.** In an application generated with LaraPack 7.10.0 or 7.10.1, every export
fails while rendering.

**Cause.** It requested the view `app::excel.<model>`, which nobody registers, and read
`app.notification_via` and `app.export_disk` from Laravel's own config.

**Fix.** Regenerate the export and its notification:

```bash
php artisan larapack:import --dry-run
php artisan larapack:import --force
```

If you edited them, change `config('app.excel_view', 'app::excel.')` to
`config('larapack.excel_view', 'excel.')`, and `app.notification_via` and
`app.export_disk` to `larapack.notification_via` and `larapack.export_disk`. Move
those keys from `config/app.php` to `config/larapack.php` (`larapack:config` creates
it).

### The export finishes but nobody gets notified

**Symptom.** The export raises no error and the file never arrives.

**Cause.** One of these:

- in an application, the `EventServiceProvider` isn't in `bootstrap/providers.php`;
- `notification_via` includes `database` and there's no notifications table;
- with `notification_via` set to `['mail']`, the default, the notification goes by
  email: the application must be able to send it.

**Fix.**

```bash
php artisan larapack:event-service-provider   # then register it in bootstrap/providers.php
php artisan make:notifications-table
php artisan migrate
```

And add `database` to `notification_via` in `config/larapack.php` (or the package
config) if you want the notification in the bell.

### Uploading a file returns 422 or fails

**Symptom.** Uploading an avatar or another file returns 422, or fails when saving.

**Cause.**

- The file type isn't allowed: laravel-uploads doesn't accept SVG.
- It exceeds `max_size` (`LARAVEL_UPLOADS_MAX_SIZE`, 10240 KB by default).
- laravel-uploads' default disk is `s3`, and S3 isn't configured.

**Fix.** Upload an allowed type, or adjust the limit or the disk:

```ini
LARAVEL_UPLOADS_DISK=public
LARAVEL_UPLOADS_MAX_SIZE=10240
```

The base application already sets `LARAVEL_UPLOADS_DISK=public`.

### aws-file-manager returns 503 or 422

**Symptom.** The file manager API always returns 503, or 422 when making a file public.

**Cause.** It returns 503 until the bucket and region are configured, and 422 when
public visibility is requested on a bucket without ACLs
(`AWS_FILE_MANAGER_USE_ACL=false`).

**Fix.**

```ini
AWS_BUCKET=my-bucket
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
AWS_FILE_MANAGER_USE_ACL=false
```

## Windows and Composer

### Composer can't resolve PHP 8.3 packages, or resolves differently from CI

**Symptom.** Locally, Composer won't install packages that require PHP 8.3, or installs
versions CI rejects.

**Cause.** Laragon's `composer` on the PATH runs on PHP 8.2 and is Composer 2.8.x: it
doesn't install PHP 8.3-only packages and doesn't block security advisories the way CI
does.

**Fix.** Run an up-to-date `composer.phar` with PHP 8.4:

```bash
"C:/laragon/bin/php/php-8.4/php.exe" composer.phar self-update
"C:/laragon/bin/php/php-8.4/php.exe" composer.phar update
```

(adjust the path to your installation). In the base application, pass it to
`app:install`: a `.phar` runs with the same PHP as Artisan.

```bash
php artisan app:install --composer=C:/path/composer.phar
```

### `install:api` didn't install Sanctum

**Symptom.** Generated routes fail because `auth:sanctum` doesn't exist, even though you
ran `php artisan install:api`.

**Cause.** `install:api` uses the `composer` on the PATH and doesn't say when it fails.

**Fix.**

```bash
composer show laravel/sanctum     # is it there?
composer require laravel/sanctum  # with the right Composer and PHP
```

The base application doesn't use `install:api`: it publishes Sanctum's migrations in
`app:install` and works with `statefulApi()`.

### The suite fails locally with "could not find driver"

**Symptom.** Database tests fail locally and pass in CI.

**Cause.** The local PHP lacks `pdo_sqlite`. CI has it.

**Fix.** Without touching `php.ini`:

```bash
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit
```

### Other local pitfalls

- **With little free memory**, parallel `composer update` and PHPUnit runs across
  packages get killed. Run them one at a time.
- **Bash heredocs** mangle `\\` in PHP namespaces. Write PHP scripts to a file with an
  editor.
- **`gh api` prints the body of a 404** to standard output. Check the exit code, not the
  output.

## CI

### The Release workflow doesn't start and leaves no log

**Symptom.** `Release` shows `startup_failure`, with no steps and no log.

**Cause.** `release.yml` doesn't declare `permissions: contents: write`, and the
repository's default permission is read-only.

**Fix.**

```yaml
jobs:
    release:
        permissions:
            contents: write

        uses: innoboxrr/.github/.github/workflows/php-release.yml@main
```

### CI can't install `orchestra/testbench ^9`

**Symptom.** `composer update` fails in CI and works locally.

**Cause.** CI's Composer blocks packages with security advisories by default, and every
Laravel 11 release has them. The local Composer is older and resolves.

**Fix.** Widen the constraint:

```json
"orchestra/testbench": "^9.0 || ^10.0 || ^11.0"
```

Reproduce it from the CI job log, not locally.

### Tests fails on the audit and nothing is released

**Symptom.** The "Auditar contra la línea base del ecosistema" step fails, and `Release`
doesn't publish.

**Cause.** An error-level finding: a narrow constraint (`^7.10.2` against `^7.10`),
`version` in `composer.json`, a missing workflow, or no tests.

**Fix.** Reproduce it locally and fix it:

```bash
php vendor/innoboxrr/larapack-generator/builder larapack:audit .
```

To require a minimum above the baseline, use
[`conflict`](/en/ci/#requiring-a-minimum-above-the-baseline-conflict).

### I fixed the shared workflow and CI still fails the same way

**Symptom.** You fixed something in `innoboxrr/.github`, rerun the run, and it fails
with the old error.

**Cause.** `gh run rerun` reuses the reusable workflow version of the original run.

**Fix.** Start a new run: a push, or `workflow_dispatch` on workflows that have it, such
as `Release`.

### `gh run view --log-failed` shows nothing

**Symptom.** The job failed and the command prints no log.

**Cause.** Jobs inside a nested reusable workflow don't show up in `--log-failed`.

**Fix.** Fetch the job log through the API:

```bash
gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion == "failure") | .databaseId'
gh api repos/<owner>/<repo>/actions/jobs/<job-id>/logs
```

### A package with private dependencies won't install in CI

**Symptom.** `composer update` can't find a private package.

**Cause.** It needs `COMPOSER_AUTH`, and `secrets: inherit` doesn't cross organizations:
a repository in another organization calling an `innoboxrr` workflow doesn't pass the
secret. Composer also needs every private repository declared as `vcs` at the root,
including transitive ones.

**Fix.**

```yaml
jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main
        secrets:
            COMPOSER_AUTH: ${{ secrets.COMPOSER_AUTH }}
```

### `tests/` or `.gitattributes` is missing from an extracted package

**Symptom.** A package extracted from another repository arrives without tests.

**Cause.** `git archive` honors `export-ignore` and silently leaves out whatever
`.gitattributes` marks.

**Fix.** Don't extract with `git archive`: copy the working tree.

### Two domain packages form an install cycle

**Symptom.** Composer can't install two packages that reference each other.

**Cause.** Each declares the other in `require`.

**Fix.** Only what's needed to load a class goes in `require`: a trait, a parent class,
an interface, a migration or a provider. A model that only appears in a relation or a
service goes in `suggest`.

### `npm publish` asks for a one-time password

**Symptom.** The npm release fails asking for an OTP, right after signing provenance.

**Cause.** One of these:

- there's a `NODE_AUTH_TOKEN`, and npm authenticates with it instead of OIDC;
- npm predates OIDC support;
- the trusted publisher isn't configured on npmjs.com for that repository and
  `release.yml`;
- `id-token: write` is missing.

**Fix.** Remove the token, use `node-release.yml` (it already upgrades npm and declares
`id-token: write`), and configure the trusted publisher. See
[Releasing a version](/en/ci/releasing#npm-packages).

### `npm install` fails in CI with Vitest 4 and Vite 8.3

**Symptom.** `npm install` crashes on Node 20 and 22 and works on Node 24.

**Cause.** Vitest 4 with Vite 8.3 won't install with npm 10, the npm bundled with Node 20
and 22.

**Fix.** The ecosystem's npm packages stay on `vite ^7.1` and `vitest ^3`. See
[The workflows](/en/ci/workflows#why-satellites-stay-on-vite-7-and-vitest-3).

### The npm release finished and `npm view` still shows the old version

**Symptom.** `Release` is green and the registry doesn't list the new version.

**Cause.** The npm registry can take a while to list it.

**Fix.** Wait, and check in the log that the publish went out with provenance and that
the tag `v<version>` exists. Don't publish the same version again.

## Tests

### jsdom tests hang when opening a menu

**Symptom.** A test that opens a `MenuComponent` or datatable menu never finishes.

**Cause.** The real `@floating-ui/dom` hangs in jsdom.

**Fix.** Mock it, as the packages themselves do:

```js
vi.mock('@floating-ui/dom', () => ({
    autoUpdate: vi.fn((reference, floating, update) => {
        update()

        return () => {}
    }),
    computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
    flip: vi.fn(),
    offset: vi.fn(),
    shift: vi.fn(),
}))
```

### A dialog or menu behaves differently in jsdom

**Symptom.** In tests, a dialog doesn't sit on top, or a popover doesn't open the way it
does in the browser.

**Cause.** jsdom has neither `showModal()` nor the Popover API. Components fall back to
the `open` and `hidden` attributes.

**Fix.** Assert on those attributes in tests, and check the real behavior in a browser.

### Automated tests in a real browser

- **Items in a hidden popover menu ignore clicks dispatched by script.** Use real mouse
  clicks.
- **Several batches of actions fired at once lose keystrokes.** Fire them one at a time.
