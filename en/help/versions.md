# Versions and compatibility

The current version of every package in the ecosystem, what each one requires, and
where its upgrade guide lives.

## Which version you have

```bash
composer show "innoboxrr/*"
npm ls --depth=0 | grep innoboxrr
```

## Compatibility matrix

| | Application (the base app and modules generated inside it) | Ecosystem PHP package | Ecosystem npm package |
|---|---|---|---|
| **PHP** | 8.3 or later | `^8.3`; CI tests 8.3 and 8.4 (LaraPack also 8.5) | — |
| **Laravel** | 13 | `illuminate/*` `^13.0`, Testbench `^11.0` | — |
| **PHPUnit** | — | `^12.0 \|\| ^13.0` in new packages | — |
| **Node** | 22.12 or later | — | `engines.node` `>=22.12`; CI tests 22 and 24; releases on Node 22 with the latest npm |
| **Vite** | `^8`, with `@vitejs/plugin-vue ^6` or `@vitejs/plugin-react ^6` | A package's module, also `^8` | `^8.0` |
| **Vitest** | — | — | `^5.0` |
| **Vue** | `vue ^3.5`, `vue-router ^4.5`, `pinia ^3` | — | `vue ^3.5` as a peer |
| **React** | `react ^19`, `react-router-dom ^7`, `zustand ^5` | — | `react ^19` as a peer |
| **Sanctum and Excel** | `laravel/sanctum ^4.3`, `maatwebsite/excel ^4.0` | The same, in the `require` written by `larapack:new` | — |
| **axios** | `^1.7` | — | — |

::: info
Since LaraPack 9.0 npm packages test with **Vite 8 and Vitest 5**, like applications,
and Node 20 leaves the matrix: Vitest 5 requires Node `^22.12 || >=24`. See
[The npm packages' test toolchain](/en/ci/workflows#node).
:::

The source of truth for these versions is `ecosystem.json`, inside LaraPack. See
[The baseline](/en/ci/).

## Laravel packages

| Package | Version | Requires | Upgrade |
|---|---|---|---|
| `innoboxrr/larapack-generator` | 9.0.0 | PHP `^8.3`, `illuminate/support ^13.0`, `symfony/console ^7.4 \|\| ^8.0` | [Upgrade guide](/en/larapack/upgrade) |
| `innoboxrr/laravel-setup` | 7.0.1 | PHP `^8.3`, `laravel/framework ^13.0`, LaraPack `^7.10` with `conflict <7.10.2`; installs laravel-auth `^6.1.0` | No migration from 6.x: 7 is for new applications ([Base application](/en/app-base/)) |
| `innoboxrr/laravel-auth` | 6.1.0 | PHP `^8.3`, `illuminate/support ^13.0` | [6.0 to 6.1 and 5.x to 6.0](/en/packages/laravel-auth) |
| `innoboxrr/laravel-options` | 2.1.0 | PHP `^8.3`, `illuminate/support ^13.0`, search-surge `^3.0`, traits `^2.1` | [laravel-options](/en/packages/laravel-options) |
| `innoboxrr/laravel-notifications` | 2.1.0 | PHP `^8.3`, `laravel/framework ^13.0` | [laravel-notifications](/en/packages/laravel-notifications) |
| `innoboxrr/laravel-uploads` | 2.1.1 | PHP `^8.3`, `illuminate/support ^13.0`, traits `^2.1` | [laravel-uploads](/en/packages/laravel-uploads) |
| `innoboxrr/laravel-audit` | 2.1.1 | PHP `^8.3`, `illuminate/support ^13.0`, search-surge `^3.0`, traits `^2.1` | [laravel-audit](/en/packages/laravel-audit) |
| `innoboxrr/laravel-env-editor` | 2.1.1 | PHP `^8.3`, `laravel/framework ^13.0` | [laravel-env-editor](/en/packages/laravel-env-editor) |
| `innoboxrr/aws-file-manager` | 2.0.0 | PHP `^8.3`, `laravel/framework ^13.0` | [aws-file-manager](/en/packages/aws-file-manager) |
| `innoboxrr/locale-generator` | 2.1.0 | PHP `^8.3`, `illuminate/support ^13.0` | [locale-generator](/en/packages/locale-generator) |
| `innoboxrr/routes-to-json` | 2.1.0 | PHP `^8.3`, `illuminate/support ^13.0` | [routes-to-json](/en/packages/routes-to-json) |
| `innoboxrr/support` | 2.1.1 | PHP `^8.3`, `illuminate/support ^13.0` | [support, traits and search-surge](/en/packages/support-traits-search) |
| `innoboxrr/traits` | 2.1.0 | PHP `^8.2`, `illuminate/* ^12.0 \|\| ^13.0` | [support, traits and search-surge](/en/packages/support-traits-search) |
| `innoboxrr/search-surge` | 3.0.3 | PHP `^8.2`, `illuminate/* ^12.0 \|\| ^13.0` | [v2 to v3](/en/packages/support-traits-search) |

`traits` and `search-surge` also accept PHP 8.2 and Laravel 12: wide constraints,
legitimate, covered by their own CI. For a package without a guide, each version's
notes are in its repository's `CHANGELOG.md`.

## UI packages

All of them declare `engines.node >=20`.

| Package | Version | Peers | Upgrade |
|---|---|---|---|
| `innoboxrr-form-core` | 2.8.0 | — | [form-core](/en/ui/form-core) |
| `innoboxrr-form-elements` | 6.8.0 | `vue ^3.5.0`, `sortablejs ^1.14.0`, `lightvue` | [Form components](/en/ui/form-elements) |
| `innoboxrr-react-form-elements` | 3.8.0 | `react ^19.0.0`, `react-dom ^19.0.0` | [Form components](/en/ui/form-elements) |
| `innoboxrr-vue-datatable` | 3.1.1 | `vue ^3.5.0`, `vue-router ^4.5.0`, `innoboxrr-form-core ^2.6.0`, `innoboxrr-form-elements ^6.4.0` | [2.x to 3.0](/en/ui/datatables) |
| `innoboxrr-react-datatable` | 3.1.1 | `react ^19.0.0`, `react-dom ^19.0.0`, `react-router-dom ^7.0.0`, `innoboxrr-form-core ^2.6.0`, `innoboxrr-react-form-elements ^3.4.0` | [2.x to 3.0](/en/ui/datatables) |
| `innoboxrr-http-request` | 2.0.0 | `vue ^3.5.0` | [Requests, routes and languages](/en/ui/http-routes-i18n) |
| `innoboxrr-route-resolver` | 2.0.0 | — | [Requests, routes and languages](/en/ui/http-routes-i18n) |
| `innoboxrr-i18n` | 1.2.0 | — | [Requests, routes and languages](/en/ui/http-routes-i18n) |
| `innoboxrr-js-validator` | 2.0.1 | — | [Validation](/en/ui/js-validator) |
| `innoboxrr-locale-generator` | 2.0.0 | — | — |
| `innoboxrr-fab` | 1.1.0 | `vue ^3.5.0` | — |
| `innoboxrr-multipart-uploader` | 4.0.0 | — | — |
| `innoboxrr-vue-utils` | 1.2.0 | — | — |
| `innoboxrr-js-libs` | 3.0.1 | — | — |
| `innoboxrr-maskjs` | 2.0.0 | `react ^18.0.0 \|\| ^19.0.0`, `vue ^3.5.0` | — |

A generated module declares the `internalNpm` versions from `ecosystem.json`
(`innoboxrr-form-elements ^6.7.0`, `innoboxrr-vue-datatable ^3.1.0`…). They're minimums:
with `^` they also install the versions in this table.

## What changed most recently

| Version | What changes | What to do |
|---|---|---|
| LaraPack 9.0.0 | `verify` checks every controller, hand-written ones included; `endpoints` and `controllers` declare what isn't CRUD; the guard as a hook; the Resource filters `appends` and the IndexRequest forces `managed`; the npm baseline moves to Vite 8, Vitest 5 and Node `>=22.12` | Follow [From 8.0 to 9.0](/en/larapack/upgrade#from-80-to-90) |
| LaraPack 7.10.3 | With `--format=json`, every command prints only the JSON document, `larapack:import` included, and also on failure. The generated `models/<kebab>/index.js` no longer sends `_token` on GET requests | Upgrade; see the [upgrade guide](/en/larapack/upgrade) |
| `innoboxrr-vue-datatable` and `innoboxrr-react-datatable` 3.1.1 | GET requests don't carry the CSRF token in the query string | Nothing |
| `innoboxrr-js-validator` 2.0.1 | Error messages are inserted as text, not HTML | If a message contained HTML, it now shows literally |
| `innoboxrr/laravel-auth` 6.1.0 | Leaving impersonation only accepts POST with a CSRF token; a GET returns 405 | Change every call to POST (see [Troubleshooting](/en/help/#leaving-impersonation-returns-405)) |
| `innoboxrr/laravel-setup` 7.0.1 | The interfaces leave impersonation with POST, and the application requires laravel-auth `^6.1.0` | In an application created with 7.0.0, change the session store by hand |
| `innoboxrr-form-elements` 6.8.0 | `CodeMirrorComponent` loads its language on demand, follows the app theme (`theme` `auto`) and no longer grabs focus on mount (`autofocus` `false`) | Pass `autofocus` if you relied on focus; `theme="dark"` restores the old look |
| `innoboxrr-react-form-elements` 3.8.0 | `CodeMirrorComponent` loads its language on demand | Nothing |

## Upgrade guides

- **LaraPack:** [Upgrade guide](/en/larapack/upgrade), with a section per version since
  5.x and the general procedure.
- **laravel-auth:** 5.x to 6.0 and 6.0 to 6.1, in [laravel-auth](/en/packages/laravel-auth).
- **search-surge:** v2 to v3, in [support, traits and search-surge](/en/packages/support-traits-search).
- **Datatables:** 2.x to 3.0, in [Tables](/en/ui/datatables).
- **laravel-setup:** there's no migration from 6.x. Version 7 is for new applications:
  [Install](/en/app-base/install).
- **Everything else:** each repository's `CHANGELOG.md`. `innoboxrr/traits` doesn't have
  one yet.
