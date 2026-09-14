# locale-generator

`innoboxrr/locale-generator` **2.1.0** collects the translation keys your application and its SPA use into `<locale>.json`. It keeps the translations you already have and can fill in the missing ones with Google Translate.

```bash
php artisan locale:generate es      # add the keys found in the code to es.json
php artisan locale:translate es     # translate the ones that are still empty
```

This is the PHP generator. The frontend has an npm counterpart, `innoboxrr-locale-generator` (`locale-gen`); see [Requests, routes and languages](/en/ui/http-routes-i18n).

## Install

```bash
composer require innoboxrr/locale-generator
```

It requires PHP `^8.3`, `illuminate/support ^13.0` and `guzzlehttp/guzzle ^7.7`. The providers are auto-discovered.

## Configuration

`config/locale-generator.php`:

| Key | Default | What it decides |
|---|---|---|
| `lang_path` | `env('LOCALE_GENERATOR_LANG_PATH')`; when empty, `lang_path()` | Directory of the `<locale>.json` files. A relative path resolves against the project root |
| `routes` | `[resource_path()]` | Directories to scan. `node_modules` and `vendor` are always skipped |
| `extensions` | `php`, `vue`, `js`, `jsx`, `ts`, `tsx` | Extensions of the files to read |
| `google_api_key` | `env('GOOGLE_TRANSLATE_API_KEY')` | The key `locale:translate` uses |

An empty `routes` or `extensions` list, as in a configuration published by an older version, means the default.

## Environment variables

| Variable | Use |
|---|---|
| `LOCALE_GENERATOR_LANG_PATH` | `lang_path`, for example `resources/locales` |
| `GOOGLE_TRANSLATE_API_KEY` | `google_api_key`. Without it, `locale:translate` fails without calling Google |

::: warning The Google key has different names in PHP and npm
This package reads `GOOGLE_TRANSLATE_API_KEY`. The npm generator (`innoboxrr-locale-generator`) reads `GOOGLE_TRANSLATE_KEY`. If you use both, define both variables.
:::

## Publishing

| Tag | What it copies |
|---|---|
| `config` | `config/locale-generator.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\LocaleGenerator\Providers\AppServiceProvider" --tag=config
```

## Migrations

It ships no migrations.

## Commands

### `locale:generate {locale}`

Extracts the literal keys of `__('…')`, `trans('…')`, `t('…')` and `$t('…')` (also `this.$t('…')`), in single or double quotes, and merges them into `<lang_path>/<locale>.json`.

- **The key must be a complete string literal as the first argument.** `t('Hello ' + name)` and template literals are skipped, because guessing them would write garbage.
- **The function name can't be glued to something else.** `alert('x')`, `emit('x')`, `import('x')` or `i18n.t('x')` are not keys.
- **It reads whole files**, so a call split across several lines still counts.
- **Entries already in the file are kept as they are**, including keys that no longer appear in the code. New keys are appended with an empty value. Until they are translated, Laravel's `__()` shows the key itself.
- **An existing file that isn't valid JSON** is left untouched and the command fails.
- **It creates the directory** if needed, and writes unescaped UTF-8 with a trailing newline.

### `locale:translate {filename} {--force}`

Translates the empty values of `<lang_path>/<filename>.json` with Google Cloud Translation (v2), one request per key.

- **Target language.** It is the file name: `es`, or `pt_BR`, sent as `pt-BR`. Both `es` and `es.json` are accepted. Google detects the source language.
- **Plain text.** It sends `format=text`, so no HTML entities come back.
- **Existing translations** are not overwritten. `--force` translates every key again.
- **Nested groups.** Only strings are translated; a nested group is left as is.
- **Failures.** If Google fails halfway, the translations obtained so far are saved and the command exits with an error. It also exits non-zero when the file is missing, isn't JSON, or the API key is missing.

## HTTP routes

It registers no routes.

## Policies and gates

It defines no policies or abilities.

## Extension points

Only the configuration: what gets scanned (`routes`, `extensions`) and where the result goes (`lang_path`).

## In the base application

`app:setup` requires `innoboxrr/locale-generator ^2.1`, but **no install step runs it**. The base application's translations live in three places:

| File | What it translates | Who reads it |
|---|---|---|
| `lang/es.json` | Laravel's backend messages | Laravel's `__()` |
| `resources/<ui>/app/lang/*.json` | The base interface's strings, written as `t('English key')` | The SPA, through `addTranslations` |
| `resources/<ui>/src/locales/{en,es}.json` | The labels of the module LaraPack generates | The SPA, before the application's own |

::: warning With the default configuration, SPA keys end up in lang/es.json
`routes` scans all of `resources/`: the base interface, the generated module and the Blade views. `lang_path` points at `lang/`. So `php artisan locale:generate es` writes the SPA's keys into Laravel's file, which the SPA doesn't read. To feed the base interface, point both at its folder:

```dotenv
LOCALE_GENERATOR_LANG_PATH=resources/vue/app/lang
```

and in `config/locale-generator.php`, `'routes' => [resource_path('vue/app')]`.
:::

The generated module's keys are left empty in `es.json` on purpose. Translate them in `src/locales/es.json` or in the application's file.

## Upgrading

### From 1.x to 2.1

- **`locale:translate` only translates empty keys.** Before, it translated all of them and overwrote hand-corrected ones. `--force` brings that behaviour back.
- **`locale:translate` exits non-zero when it fails.** Before, it exited with 0.
- **`locale:generate` keeps everything already in the file.** Before, it removed keys that no longer appeared in the code.
- **Extraction is stricter.** Only `__`, `t`, `$t` and `trans` with a complete string literal count.
- **A `null` `lang_path` uses `lang_path()`.** Before, it tried to write `/es.json` at the root of the disk.
- **New variables.** `google_api_key` reads `GOOGLE_TRANSLATE_API_KEY`, and `lang_path` reads `LOCALE_GENERATOR_LANG_PATH`.

Both command signatures are unchanged; `--force` is new.

## Pitfalls

- **A key isn't extracted.** It's built by concatenation or with a template literal, or called on another object (`i18n.t('x')`).
- **New keys land in a different file.** Check `lang_path` and `routes` (see the warning above).
- **The file has keys that are no longer used.** The command never deletes; clean them up by hand.
- **"Set GOOGLE_TRANSLATE_API_KEY in your .env".** The variable is missing, or you defined the npm generator's variable instead.
- **Translation costs more than expected.** It's one request per key. Without `--force`, only empty keys are requested.
- **The command fails saying the file isn't valid JSON.** Someone edited it by hand. The command leaves it untouched: fix it and run again.
