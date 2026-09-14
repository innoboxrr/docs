# Upgrade guide

Check the installed version with `composer show innoboxrr/larapack-generator` and find your row. Sections are applied **in order**, from the one after your version up to the latest. The full notes for each version are in LaraPack's `CHANGELOG.md`.

## Where you are

| You're on | Effort | What breaks | Sections to follow |
|---|---|---|---|
| 5.x | High | PHP and Laravel, command names, where the interface module lives, the look | [5.x → 6.0](#from-5x-to-60), [6.x → 7.0](#from-6x-to-70) and all later ones |
| 6.x | Medium | The module's look, icons, releasing | [6.x → 7.0](#from-6x-to-70) and all later ones |
| 7.0 | Low | Nothing; `verify` gains checks | [7.0 → 7.1](#from-70-to-71) and later |
| 7.1 | Low | `audit` rejects `version` in `composer.json` | [7.1 → 7.2](#from-71-to-72) and later |
| 7.2 | Medium | Vue routes with `meta.auth`; files to regenerate | [7.2 → 7.3](#from-72-to-73) and later |
| 7.3 | Low | Nothing | [7.3 → 7.4](#from-73-to-74) and later |
| 7.4 | Medium | Datatables 3.0; toasts and confirmation in the application | [7.4 → 7.5](#from-74-to-75) and later |
| 7.5.0 | Low | Nothing; three npm dependencies | [7.5.0 → 7.5.1](#from-750-to-751) and later |
| 7.5.1 | Medium | The application loads the module's translations; some keys change | [7.5 → 7.6](#from-75-to-76) and later |
| 7.6 | Medium if you use metas; low otherwise | Metas wired up; traits and support 2.1 | [7.6 → 7.7](#from-76-to-77) and later |
| 7.7.0 | Low | Export ships Excel and uses the `local` disk | [7.7.0 → 7.7.1](#from-770-to-771) and later |
| 7.7.1 | Low | The detail page names the record by its column | [7.7 → 7.8](#from-77-to-78) and later |
| 7.8 | Low | Nothing; datatables 3.1 and Vite 8 in the module | [7.8 → 7.9](#from-78-to-79) and later |
| 7.9 | Low | The event provider is regenerated | [7.9 → 7.10](#from-79-to-710) and later |
| 7.10.0 | Nothing in a package; low in an application | In an application, factories and tests to regenerate | [7.10.0 → 7.10.1](#from-7100-to-7101) and later |
| 7.10.1 | Nothing in a package; low in an application | In an application, the export and its notification to regenerate | [7.10.1 → 7.10.2](#from-7101-to-7102) and later |
| 7.10.2 | Low | The `--format=json` output and the model contract without `_token` on GET | [7.10.2 → 7.10.3](#from-7102-to-7103) |

## The procedure, whatever your version

1. **Work on a branch, with a clean tree** and `.larapack/manifest.json` under version control.
2. **Take a starting snapshot** with the current version: `php vendor/bin/builder larapack:verify --format=json`. The `customised` files are the ones regeneration won't touch.
3. **Update the generator**, with `--dev` if it's in `require-dev`:

   ```bash
   composer require --dev innoboxrr/larapack-generator:"^7.10"
   ```

4. **Update the agent instructions**: `php vendor/bin/builder larapack:skill --force`.
5. **Validate the contract**: `php vendor/bin/builder larapack:validate --vue --react`. A new schema may flag something that used to pass.
6. **Regenerate**, with a dry run first:

   ```bash
   php vendor/bin/builder larapack:import --vue --react --dry-run --force
   php vendor/bin/builder larapack:import --vue --react --force
   ```

   Leave out `--vue` or `--react` if the project doesn't have that module.
7. **Carry the changes over to edited files by hand.** Every file the previous step preserved didn't get the version's fixes; your version's section says what changed in each one. Remember that traits and tests are never rewritten.
8. **Align the dependencies.** `larapack:audit` reports which Composer versions don't meet the baseline. In `resources/<ui>/package.json`, the `innoboxrr-*` dependencies must match `internalNpm` in `ecosystem.json`; if that file is edited, change them by hand.
9. **Check**: `larapack:verify`, `vendor/bin/phpunit`, `larapack:audit`, `php artisan route:json` if any route changed, the front-end build, and a pass through the interface in the browser.

## From 5.x to 6.0 {#from-5x-to-60}

6.0 moves to Laravel 13 and PHP 8.3, renames the commands and moves the interface module into the package. None of this is compatible with 5.x.

**Requirements.** PHP `^8.3`, `illuminate/support ^13.0` and `symfony/console ^7.4 || ^8.0`. For internal dependencies, those of the current baseline (`innoboxrr/traits`, `innoboxrr/support` and `innoboxrr/search-surge`, see `ecosystem.json`).

**Commands.** Update scripts, CI and documentation:

```text
make:full-model   →  larapack:full-model
json:importer     →  larapack:import
remove:full-model →  larapack:remove-full-model
```

The `builder` binary keeps the old names as aliases; Artisan doesn't.

**The contract.** `laraimport.json` is validated against a schema before generating. Run `larapack:validate` and fix the JSON until it passes. `assignments` and `filters` are deprecated.

**The interface.** The module lives in the package's `resources/vue` or `resources/react` and is published as its own npm package. Point the application's imports at the new package.

**The manifest.** A 5.x project has no `.larapack/manifest.json`, so the generator doesn't overwrite anything that already exists, not even with `--force`. To adopt it:

1. Generate into a clean copy: `larapack:import --root=../copia-limpia`.
2. Compare the files you didn't touch with `git diff --no-index`.
3. In the project, delete the ones without changes of yours and import again: that's how they enter the manifest.
4. Port the ones with your changes by hand onto the new version, or leave them knowing they won't receive fixes.

**Fixes you get by regenerating.** Forms that had to be submitted twice, migrations in an order that made `migrate` fail, rules with quantifiers that wiped the request's `messages()` and `handle()`, and relations that pointed to `App\Models` inside a package.

## From 6.x to 7.0 {#from-6x-to-70}

The interface module stops depending on UIkit, Tailwind and Font Awesome, which nobody declared. **A 6.x module isn't upgraded by changing the version number**: its look came from the application.

**The look.** Regenerate the module. The application imports each module's theme once (`import 'acme-catalogo/src/theme.js'`) and no longer needs UIkit and Font Awesome for it. If the application has its own design system, connect it with `setTheme`. The global mixins `inputClass` and `buttonClass` are no longer used.

**Icons.** They're requested by semantic name. **Translate hand-written resources**: `'icon' => 'fa-eye'` becomes `'icon' => 'show'`, `fa-edit` becomes `edit`, `fa-trash` becomes `delete` and `fa-plus` becomes `plus`.

**Global components.** `BreadcrumbsComponent` and `DropdownButtonComponent` are no longer needed: the module generates its own `Breadcrumbs` and `ActionMenu`. Remove their global registration if it only existed for the generated modules.

**The baseline.** Run `larapack:audit` and fix what it reports: PHP, `illuminate/*`, testbench and internal dependencies.

**Releasing.** `bump-patch.yml` released on every push without running tests. Replace it with `tests.yml` and `release.yml` (see [The workflows](/en/ci/workflows)) and create `VERSION` with the current version. To see the exact files, create a package with `larapack:new` in a separate directory: its `--dry-run` leaves no files behind.

## From 7.0 to 7.1 {#from-70-to-71}

Nothing needs to change: a `laraimport.json` that doesn't declare the new keys generates exactly the same thing.

`routes`, `immutable` and `secret` are new. If on some model you **deleted unneeded actions by hand**, `larapack:verify` now reports it as `route-not-declared` and CI fails. Declare the real shape in the JSON and regenerate with `--force`:

```json
{ "name": "AuditEvent", "immutable": true, "routes": { "only": ["policies", "index", "show"] } }
```

`immutable-write` and `secret-exposed` are new errors too. See [Routes, immutables, secrets and users](/en/larapack/actions).

## From 7.1 to 7.2 {#from-71-to-72}

`larapack:audit` treats a `composer.json` that pins its own `version` as an error, because Composer discards every tag that doesn't match it. **Delete the `"version"` line from `composer.json`** and release from `VERSION`.

## From 7.2 to 7.3 {#from-72-to-73}

7.3 fixes what kept a generated package from booting and working once installed in an application.

**Regenerate with `--force`** and, in what you edited, apply by hand:

| File | What changed |
|---|---|
| `AppServiceProvider` | Loads migrations, views and configuration, which used to be commented out. |
| Policies | Type-hint `Authenticatable` instead of `App\Models\User`, call `isAdmin()` only if it exists, and switch off `forceDelete` in `$exceptAbilities`. |
| `Traits/Storage` | `forceDeleteModel()` no longer does `abort(403)`. It's a trait: change it by hand. |
| Factories | Give a value to every column type and use the related model's factory. |
| `tests/TestCase.php` | Registers the package, migrates, authenticates with Sanctum and opens up authorization. In a package, `tests/User.php` is generated too. |
| Endpoint tests | Call routes by name. They aren't rewritten: delete them and import again if you didn't touch them. |

**Vue module routes.** They declare `meta: { auth: true }` and no longer import `@router/middleware`. **If the application protected routes by reading `meta.middleware`, switch to reading `meta.auth`**; in React, `handle.auth`.

**In the application.** Make sure you have `laravel/sanctum` and `JsonResource::withoutWrapping()`.

## From 7.3 to 7.4 {#from-73-to-74}

Nothing breaks.

- To start a package, use `larapack:new` instead of copying another one.
- If you ran `larapack:providers` more than once, check `extra.laravel.providers` in `composer.json` and remove duplicate providers.
- If the project has `phpunit.xml.dist` and also a generated `phpunit.xml`, delete the latter: it was shadowing the former.

## From 7.4 to 7.5 {#from-74-to-75}

Generated modules now work like a desktop application. It's the upgrade with the most front-end changes since 7.0.

**npm dependencies** in `resources/<ui>/package.json`:

| Package | Version |
|---|---|
| `innoboxrr-form-core` | `^2.6.0` |
| `innoboxrr-form-elements` (Vue) | `^6.4.0` |
| `innoboxrr-react-form-elements` (React) | `^3.4.0` |
| `innoboxrr-vue-datatable` (Vue) | `^3.0.0` |
| `innoboxrr-react-datatable` (React) | `^3.0.0` |

**In the application, once:** mount `ToastRegionComponent` and `ConfirmHostComponent` (see [Mounting a package](/en/larapack/mount-in-app#toasts-and-confirmation)). Without them toasts aren't visible and the confirmation falls back to `window.confirm`.

**Regenerate with `--force`** and, in what you edited, apply by hand:

| File | What changed |
|---|---|
| `views/AdminView` | Keeps the table mounted, opens create in a drawer and reloads with `refresh()` instead of remounting the table with a `key`. Adds the command palette. |
| `views/CreateView`, `views/EditView` | No longer navigate or render breadcrumbs: they notify with `updateData` (Vue) or `onUpdateData` (React). **An edited form that navigates on save leaves the drawer open over another page.** |
| `views/ShowView` | A skeleton while the record loads, and editing in a drawer. |
| `widgets/DataTable` | Exposes `refresh()` (Vue, `defineExpose`) or accepts `ref` (React). |
| `widgets/ModelCard`, `widgets/ModelProfile` | Theme classes instead of Tailwind; delete shows a toast and doesn't treat a cancellation as an error. |
| `src/components/ActionMenu` | A dropdown menu on top of `MenuComponent`; items accept `icon`. |
| `models/<kebab>/index.js` | Delete, force delete and export ask with `confirmAction` instead of SweetAlert. Cancelling still rejects with `RequestCancelledError`. |

**If your code uses the datatables directly**, 3.0 isn't compatible with 2.x:

- `NavDropdownComponent`, `IconRouteComponent`, `IconLinkComponent`, `DisabledLinkComponent` and `PaginationComponent` (Vue) no longer exist, nor do `ActionListComponent` and `DatatableIcon` (React).
- `DataTableComponent` receives the TanStack Table instance.
- The default texts are in Spanish and are changed with the `labels` prop.
- A failure is no longer retried silently: it's shown and retried by hand.
- jsdom tests that open a menu have to mock `@floating-ui/dom`.

The READMEs of both datatables have their own "De 2.x a 3.0" (from 2.x to 3.0) section; see also [Tables](/en/ui/datatables).

**Check in the browser**: create from the table, edit from the detail page, delete with confirmation, a delete that fails, and the palette with Ctrl+K.

## From 7.5.0 to 7.5.1 {#from-750-to-751}

No need to regenerate. Bump three dependencies in `resources/<ui>/package.json`:

| Package | Version |
|---|---|
| `innoboxrr-form-core` | `^2.7.0` |
| `innoboxrr-form-elements` (Vue) | `^6.5.0` |
| `innoboxrr-react-form-elements` (React) | `^3.5.0` |

With them, forms no longer need Tailwind: labels, the repeatable group, the file drop zone, the code input's boxes and the avatar get their look from the theme. If your application overrode those fields with Tailwind classes, check that they look as expected in light and dark mode.

## From 7.5 to 7.6 {#from-75-to-76}

Generated code now speaks a single language, the application's: every visible text is an English key, and LaraPack writes its Spanish translation.

**npm dependencies** in `resources/<ui>/package.json`: `innoboxrr-i18n` `^1.2.0`, and `innoboxrr-locale-generator` `^2.0.0` in `devDependencies`. The `locale` script changes from `npx locale-gen` to `locale-gen`.

**In the application, once:** load the module's translations before your own and pick the language (see [Translations](/en/larapack/mount-in-app#translations)):

```js
addTranslations(translations)   // import { translations } from 'your-module'
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))
setLocale(document.documentElement.lang)
```

**Regenerate with `--force`.** Module files you edited are preserved; apply the change to them by hand:

| File | What changed |
|---|---|
| `src/i18n.js` | New. Exports `translations` and `tableLabels()`. |
| `src/locales/en.json`, `es.json` | New. LaraPack adds any missing keys every time it generates and never touches a written translation. |
| The module's `index.js` | Exports `translations`. |
| `models/<kebab>/routes/index.js` | `title` is a getter that translates when read. It used to be hard-coded Spanish with the class name ("Editar Products"). |
| `views/AdminView`, `views/ShowView` | Breadcrumbs, palette, drawer and tab title are translated. |
| `widgets/DataTable` | Passes `labels` to the table. |
| `src/components/Breadcrumbs`, `ActionMenu` | Their accessible label is translated. |
| `Http/Resources/Models/<Model>Resource.php` | Each row's actions use `__()`. |
| `Notifications/<Model>/ExportNotification.php` | Subject and body use `__()`; the subject used to be in English and the body in Spanish. |
| `Http/Events/<Model>/Events/*` | Take the request's language. They used to default to `'en'` and call `App::setLocale`, so every create, update or delete switched the rest of the request to English. |

**Keys that change.** If your application already translated the old ones, move them:

| Before | Now |
|---|---|
| `Create Posts` | `Create :name`, with `name` = `t('Post')` |
| `Post created` | `Record created` |
| `Post deleted` | `Record deleted` |

**In the Laravel package:** the generated provider loads `lang/` with `loadJsonTranslationsFrom`. If your `AppServiceProvider` is older, add:

```php
$this->loadJsonTranslationsFrom(__DIR__ . '/../../lang');
```

**Translate your own.** The model's name and its fields stay as `""` in `src/locales/es.json`; while they do, the screen shows the English key.

**Check in the browser**, in Spanish and in English: the index, the table with an error, the palette, create, edit and delete.

## From 7.6 to 7.7 {#from-76-to-77}

What's generated with `metas: true` now works: it saves the form's metas and maintains `payload`. A model without metas comes out the same as before.

**Composer**, in the package's `composer.json`: `innoboxrr/traits` `^2.1` and `innoboxrr/support` `^2.1` (new: it flattens the form's nested groups).

**npm**, optional because it arrives through `^`: `innoboxrr-form-core` `^2.8.0`, `innoboxrr-form-elements` `^6.6.0` and `innoboxrr-react-form-elements` `^3.6.0`, with the phone input that follows the theme.

**In the laraimport:**

- Declare `protected_metas` with the metas only your code writes.
- You no longer need to declare `payload`: it's added automatically. If you declared it `creatable` or `updatable`, `larapack:validate` warns and it's ignored.

**Regenerate and apply the trait changes by hand.** `Relations`, `Storage` and `Operations` are only created if they don't exist, so not even `--force` rewrites them. In a model with metas:

| File | What changed |
|---|---|
| `Traits/Relations/<Model>Relations.php` | The `metas()` relation. Without it, `meta()` and `setMeta()` fail. |
| `Traits/Storage/<Model>Storage.php` | `createModel()` and `updateModel()` call `updateModelMetas()`, which flattens with `RequestFormater` and rebuilds `payload`. |
| `Traits/Operations/<Model>Operations.php` | `buildPayload()` and `updatePayload()`, which saves without firing events. |
| `Models/<Model>.php` | `$protected_metas` comes from the contract; `payload` is kept out of `$fillable`, `$creatable`, `$updatable` and `$export_cols`. |
| `database/factories/<Model>Factory.php` | No longer makes up a `payload`. |

The exact content of the three traits is in [Metas and payload](/en/larapack/metas#the-traits).

**If you already used metas by hand**, `innoboxrr/traits` 2.1 changes two things:

- `update_metas()` ignores the keys in `$protected_metas`, even if they're in `$editable_metas`.
- An empty array deletes the meta; it used to be saved as `"[]"`.

**New meta migrations** no longer include `softDeletes()`: the trait deletes for real. Existing tables don't change.

**Check**: create a record sending a nested group, edit it clearing a meta, and look at `payload` in the response.

## From 7.7.0 to 7.7.1 {#from-770-to-771}

What a pilot found in a fresh Laravel 13 application. The contract doesn't change.

**If the admin panel renders unstyled**, add `src/theme.js` to `sideEffects` in `resources/<ui>/package.json`:

```json
"sideEffects": ["*.css", "*.vue", "src/theme.js"]
```

In React, `["*.css", "src/theme.js"]`. Without it, Vite drops the theme import, and the stylesheet with it.

**If you have duplicate migrations** (`create_<tabla>_table` twice with different times), delete the newer one and its entry in `.larapack/manifest.json`. Importing again no longer duplicates them, and `import --dry-run` no longer writes files.

**Export**, in the package's `composer.json` and its configuration:

- `maatwebsite/excel` moves from `require-dev` or `suggest` to `require`;
- `export_disk` defaults to `local`, and `notification_via` defaults to `['mail']`.

Regenerate `ExportRequest` and `ExportNotification` with `--force` if you didn't edit them: they report a clear message when something fails and link to a signed download.

**In the application**: `$middleware->statefulApi()` in `bootstrap/app.php`, and `vue-router@4` with `pinia@3` (see [Mounting a package](/en/larapack/mount-in-app)).

## From 7.7 to 7.8 {#from-77-to-78}

The detail page, the breadcrumbs and the tab title name the record by its column. They used to always read `.name`, and a model with `title` showed the model's name instead.

**In the laraimport, optional:** `"display": "sku"` if the column that names the record isn't `name`, `title` or the first text column. A column that doesn't exist, or a `secret` one, is a `larapack:validate` error.

**Regenerate with `--force`** `views/ShowView` and `widgets/ModelCard`. If you edited them, replace `.name` with the column by hand in those two files: three places in total. A model with `name` comes out the same as before.

## From 7.8 to 7.9 {#from-78-to-79}

Bulk actions, inline editing, export from the palette, fields for metas, alter migrations, Pint and Larastan, and Vite 8. The contract doesn't change: without `routes`, a model gains `bulkUpdate` and `bulkDelete` automatically.

**Regenerate with `--force`**, with a dry run first. The controller, the routes, `PoliciesRequest` and the endpoint test change, and so do `index.js`, `widgets/DataTable`, `views/AdminView`, `forms/CreateForm` and `forms/EditForm` in the interface. `BulkUpdateRequest` and `BulkDeleteRequest` appear. A model with `routes.only` only gets them if you add them to the list.

**If you edited any of them**, the minimum to do by hand:

- `PoliciesRequest`: `'bulkUpdate' => 'update'` and `'bulkDelete' => 'delete'` in `$policyMethodMapping`;
- `widgets/DataTable`: pass `selectable` to the table, and a model with `dataTableComponents: () => ({ ClickToEdit: ClickToEditComponent })` (in React, a wrapper that passes `save` as `onSave`);
- `index.js`: `bulkActions()`, `bulkUpdateModels`, `updateField` and `bulkDeleteModels` can be copied as they are from a freshly generated package.

The endpoint test isn't rewritten: if you didn't touch it, delete it and import again to get the bulk action tests.

**Dependencies** in `resources/<ui>/package.json`: `innoboxrr-vue-datatable` or `innoboxrr-react-datatable` `^3.1.0`, `innoboxrr-form-elements` `^6.7.0` or `innoboxrr-react-form-elements` `^3.7.0`, `vite` `^8.0.0` and, in React, `@vitejs/plugin-react` `^6.0.0`.

**Migrations.** From now on, changing columns and reimporting writes an alter migration. If you previously regenerated with `--force` the create migration of an already migrated table, that difference never reached your database and LaraPack can no longer see it: write that alter migration by hand, once. See [Migrations](/en/larapack/migrations#alter-migrations).

**Formatting and types, optional in an existing package:** `composer require --dev laravel/pint larastan/larastan`, copy `pint.json`, `phpstan.neon.dist` and the `quality` job of `tests.yml` from a freshly created package, and format once with `vendor/bin/pint` in its own commit.

**The Vue phone input validates by country**, like the React one: a 10-digit number that isn't valid for its country stops passing, and a 9-digit Spanish one starts passing. What it emits doesn't change.

## From 7.9 to 7.10 {#from-79-to-710}

The contract doesn't change: `authenticatable` is new and optional. The baseline now requires `innoboxrr/larapack-generator ^7.10`; `larapack:audit` warns, without failing, anyone still on `^7.0`.

**Regenerate the event provider** with `larapack:event-service-provider --force`, first with `--dry-run`. The previous one read the cache at boot: in an application with `CACHE_STORE=database`, which is what Laravel 13 ships with, `php artisan migrate` failed before creating the cache table. And since the key was the same in every package, one package received another's listeners. If you edited it, remove the `Cache::remember('events_and_listeners', ...)` and walk `discoverEvents()` directly.

**Modules inside an application.** The interface module no longer writes `package.json` or `vite.config.js` when the project is an application: they overwrote the application's. If an earlier version left them in `resources/<ui>/`, nothing uses them: the application compiles the module with its own Vite, and its `package.json` must declare the module's dependencies.

## From 7.10.0 to 7.10.1 {#from-7100-to-7101}

The contract doesn't change. In a package there's nothing to do: the generated code is the same.

**In an application generated with 7.10.0**, factories lived in `App\Database\Factories` and tests in `App\Tests`, which the application doesn't load, and the tests called URIs that don't exist, without a session. Regenerate or fix by hand:

- **Factories and models.** `larapack:import --dry-run` and then `larapack:import --force`. In the ones you edited, replace `App\Database\Factories` with `Database\Factories` in the factory and in the model's `use`.
- **Tests.** They're never overwritten, not even with `--force`. If you didn't touch them, delete `tests/Feature/Models/<Model>EndpointsTest.php` and import again. If you edited them, replace `App\Tests` with `Tests`, call the routes with `route('api.app.<modelo>.<acción>')` and log in before each call, like the new test does.
- **`tests/TestCase.php`.** If LaraPack 7.10.0 created it because the application didn't have one, it extends `Orchestra\Testbench\TestCase`: delete it and import again.
- **Register the `EventServiceProvider`** in `bootstrap/providers.php` if you didn't have it (`larapack:event-service-provider` creates it): without it, the export never notifies.

The new tests log in with the factory of the model in `auth.providers.users.model`, open up authorization in their `setUp()` and, in bulk update, leave out unique columns such as `users.email`.

## From 7.10.1 to 7.10.2 {#from-7101-to-7102}

The contract doesn't change. In a package there's nothing to do: the generated code is the same.

**In an application generated with 7.10.0 or 7.10.1**, every export failed when rendering ("No hint path defined for [app]"), and its notification read `app.notification_via` and `app.export_disk`, inside Laravel's configuration. Regenerate or fix by hand:

- **Export and notification.** `larapack:import --dry-run` and then `larapack:import --force`: `app/Exports/<Plural>Exports.php` and `app/Notifications/<Model>/ExportNotification.php` are regenerated. In the ones you edited, replace `config('app.excel_view', 'app::excel.')` with `config('larapack.excel_view', 'excel.')`, and `app.notification_via` and `app.export_disk` with `larapack.notification_via` and `larapack.export_disk`.
- **Configuration.** If you added `excel_view`, `notification_via` or `export_disk` to `config/app.php`, move them to `config/larapack.php` (`larapack:config` creates it) and remove them from `config/app.php`.
- **The `users` migration.** Nothing to do: `larapack:import` no longer treats it as edited by hand or asks for an alter migration against it. It skips it with "no la generó LaraPack" (LaraPack didn't generate it).

## From 7.10.2 to 7.10.3 {#from-7102-to-7103}

Neither the contract nor the generated PHP changes.

- **The `--format=json` output.** It's a single JSON document, also when something fails: `{"ok": false, "error": "..."}` with exit code 1. If your CI or your agent stripped the `larapack:import` progress before decoding, that's no longer needed: decode the whole output. The laraimport warnings go in `findings`.
- **The CSRF token on GET requests.** The model contract (`models/<entidad>/index.js`) no longer sends `_token` in `getPolicies`, `getPolicy`, `indexModel` or `showModel`. If you didn't edit it, `larapack:import --vue --force` (or `--react`) regenerates it; if you edited it, remove `_token: csrfToken(),` from those four calls. Writes still send it.
- **The tables.** Bump `innoboxrr-vue-datatable` or `innoboxrr-react-datatable` to `^3.1.1`, which does the same for the table's own requests.
