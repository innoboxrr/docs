# Requests, routes and languages

Five small packages, none tied to a framework. They're what each generated model contract uses:

| Package | Version | For |
|---|---|---|
| `innoboxrr-http-request` | 2.0.0 | Making requests with retries, confirmation and cancellation |
| `innoboxrr-route-resolver` | 2.0.0 | Turning a Laravel route name into a URL |
| `innoboxrr-i18n` | 1.2.0 | Translating with Laravel-style keys |
| `innoboxrr-locale-generator` | 2.0.0 | Extracting `t('…')` keys into JSON files |
| `innoboxrr-maskjs` | 2.0.0 | Input masks |

## Requests: innoboxrr-http-request

```bash
npm i innoboxrr-http-request
```

```js
import makeHttpRequest from 'innoboxrr-http-request'

// GET: data goes in the query string. Up to 3 retries, every 1.5 s.
const posts = await makeHttpRequest('get', route('api.blog.post.index'), { page: 2 }, {}, 3, 1500)

// PUT with a JSON body
await makeHttpRequest('put', route('api.blog.post.update'), { post_id: 1, title: 'New' })
```

It returns the response **body** (`response.data`), not the axios response.

```text
makeHttpRequest(method, url, data, headers, maxRetries, retryInterval, confirmOptions, options)
```

| Parameter | Default | What it does |
|---|---|---|
| `method` | required | Lowercased. |
| `url` | required | |
| `data` | `{}` | For GET and HEAD it goes in the query string; for everything else, DELETE included, in the body. Generated routes read the id from the body. |
| `headers` | `{}` | |
| `maxRetries` | `0` | Maximum number of retries, on top of the first attempt. |
| `retryInterval` | `1500` | Milliseconds between retries. |
| `confirmOptions` | `null` | SweetAlert2 `Swal.fire()` options. The question is asked **once**, before sending. |
| `options.timeout` | `30000` | Milliseconds. There used to be no timeout, and a request could hang forever. |
| `options.signal` | — | An `AbortSignal` to cancel. |
| `options.withCredentials` | — | Passed to axios. |

### Retries

Only what may be transient is retried:

| Outcome | Retried? |
|---|---|
| No response (network, timeout) | Yes |
| `5xx` | Yes |
| `429` | Yes, waiting the `Retry-After` seconds if the server sends them; otherwise `retryInterval` |
| Any other `4xx` | **No** |
| Cancelled confirmation | **No** |

Retrying a `422` three times means getting the same validation error three times, and a `403` won't fix itself. `isRetryable(error)` is exported, in case you want the same rule elsewhere.

### Confirmation and cancellation

```js
import makeHttpRequest, { RequestCancelledError } from 'innoboxrr-http-request'

try {
    await makeHttpRequest('delete', url, { post_id: 1 }, {}, 0, 1500, {
        title: 'Confirm operation',
        text: 'Are you sure you want to delete it?',
        icon: 'warning',
        showCancelButton: true,
    })
} catch (error) {
    if (error instanceof RequestCancelledError) {
        return // the user said no: not a failure
    }

    showError(error)
}
```

- **The confirmation uses SweetAlert2.** It takes the application's `window.Swal` if it exists; otherwise, the `sweetalert2` bundled with the package.
- **If the user doesn't confirm,** the function throws `RequestCancelledError`, with `name === 'RequestCancelledError'` and `cancelled === true`. It used to be a generic `Error`, indistinguishable from a network failure.

::: tip Generated modules confirm with the theme
The model contract LaraPack generates doesn't use `confirmOptions`. It asks with form-core's `confirmAction()`, which follows the theme and dark mode, and throws `RequestCancelledError` when the answer is no. The tables recognize `RequestCancelledError` and `CanceledError` and stay silent.
:::

To cancel a request in flight:

```js
const controller = new AbortController()

const pending = makeHttpRequest('get', url, { q: 'table' }, {}, 0, 1500, null, { signal: controller.signal })

controller.abort() // axios rejects with an error named 'CanceledError'
```

::: warning With `maxRetries`, an aborted request is retried too
`isRetryable` only checks whether there was a response, and an aborted request has none. If you cancel with `signal`, keep `maxRetries` at `0`.
:::

### Vue plugin

```js
import { VueHttpRequestPlugin } from 'innoboxrr-http-request/vue'

app.use(VueHttpRequestPlugin) // this.$httpRequest
```

It has its own entry point so a React project doesn't pull it in. The Vuex plugin was removed in 2.0: the ecosystem uses Pinia, and a Pinia store imports the function directly.

| Exports | |
|---|---|
| `innoboxrr-http-request` | `makeHttpRequest` (also the default), `RequestCancelledError`, `isRetryable` |
| `innoboxrr-http-request/vue` | `VueHttpRequestPlugin` (also the default) |

## Routes: innoboxrr-route-resolver

The front end never hardcodes a URL. Laravel exports its named routes and the browser resolves them by name, so the backend can move a route without breaking anything in the UI.

```bash
npm i innoboxrr-route-resolver
php artisan route:json
```

`php artisan route:json` is the [routes-to-json](/en/packages/routes-to-json) command: it writes the name → URI map that `setRoutes()` loads. Run it again every time you add or change a route.

```js
import route, { setRoutes } from 'innoboxrr-route-resolver'
import routes from './routes.json'

setRoutes(routes)

route('api.blog.post.index')
```

### `route(name, ...args)`

An example with these routes:

```js
setRoutes({
    'api.deals.deal.index': 'api/deals/deal/index',
    'api.deals.deal.show': 'api/deals/deal/{deal}',
    'api.deals.deal.tags': 'api/deals/deal/{deal}/tags/{tag?}',
})

route('api.deals.deal.index')                        // '//<host>/api/deals/deal/index'
route('api.deals.deal.show', 7)                      // '//<host>/api/deals/deal/7'                positional
route('api.deals.deal.show', { deal: 7 })            // '//<host>/api/deals/deal/7'                named
route('api.deals.deal.tags', { deal: 7 })            // '//<host>/api/deals/deal/7/tags'           optional omitted
route('api.deals.deal.index', { page: 2, ids: [1, 2] })
// '//<host>/api/deals/deal/index?page=2&ids%5B%5D=1&ids%5B%5D=2'
```

- **Named or positional mode.** A single argument that is an object (and not an array) means named mode. Anything else is positional mode: each argument fills the next parameter, in order.
- **Optional parameters.** A `{param?}` with no value is dropped from the URL. It used to consume an argument anyway and leave `undefined` in the path.
- **Required parameters.** A missing one **throws** `Missing required parameter "deal" for route api.deals.deal.show`, instead of leaving `undefined` in the URL.
- **Values** go through `encodeURIComponent`.
- **Leftovers.** In named mode, anything that isn't a parameter goes to the query string: arrays as `key[]`, and `null` or `undefined` values are skipped. In positional mode, extra arguments are ignored.
- **The result is a protocol-relative URL:** `//host/uri`, which the browser completes with the page's protocol.

### Host and strict mode

| Function | What it does |
|---|---|
| `setRoutes(map)` | Loads the name → URI map. |
| `hasRoute(name)` | Whether the name exists. |
| `setBaseUrl('api.example.test')` | Sets the host. With no argument, it goes back to `location.host`. |
| `setStrict(true)` | An unknown route throws `Unknown route <name>` instead of logging it and returning `undefined`. |

- **The default host is `location.host`,** which, unlike `hostname`, includes the port. Without it, URLs broke locally against `:8000`. It's read when `route()` is called, not when the module is imported, because in SSR or a test `window` may not exist yet.
- **Strict mode is off by default,** so applications that already tolerated unknown routes keep working. Turn it on in tests.

::: warning `setBaseUrl` takes a host, not a URL
The URL is built as `//` + host + `/` + URI. `setBaseUrl('https://api.example.test')` would produce `//https://api.example.test/…`. Pass just `api.example.test`, with the port if needed.
:::

## Languages: innoboxrr-i18n

```bash
npm i innoboxrr-i18n
```

```js
import t, { addTranslations, setLocale } from 'innoboxrr-i18n'
import { translations as catalog } from 'acme-catalog'

addTranslations(catalog)                                                         // the module's, first
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))  // the application's, after
setLocale(document.documentElement.lang)

t('Welcome')
t('Hello :name', { name: 'Ada' })
```

| Export | What it does |
|---|---|
| `t(key, replace)` (default) | The translation in the current locale or, if there is none, the key itself. Each `:name` is replaced with its value, every occurrence. |
| `addTranslations(source)` | Adds translations to the ones already loaded. A key loaded later wins. |
| `setTranslations(source)` | Replaces everything loaded so far. |
| `setLocale(locale)` / `getLocale()` | The current locale. An empty value is ignored. The default is `'en-US'`. |
| `hasTranslation(key)` | Whether the key has a non-empty translation in the current locale. |

`source` is an object keyed by locale, like `{ en: {…}, es: {…} }`, or Vite's `eager` glob over JSON files.

### Several sources

- **Order.** Load the modules' translations first and the application's after: that way the application has the last word and can fix any module text.
- **An empty translation means "not translated yet".** For example `"Create": ""`, which is what `locale-gen` writes for a new key. It never overrides a translation loaded earlier and, with nothing else, `t()` shows the key instead of a blank.
- **Generated modules use English keys.** So while `es.json` has a key left empty, the English text shows.

### How the locale is matched

- **The locale is the file name:** `/resources/locales/es.json` is `es` and the rest of the path is ignored. The locale used to be searched for in the whole path, and `es` appears in «resources» and «locales».
- **Regional variants stack on their base language:** with `es-MX`, the `es` keys are used and `es-MX` wins where both exist.
- **A variant can serve as the base:** if `es` is requested and only `es-MX` exists, that one is used.
- **Case and `_` don't matter:** `es_MX.json` matches `setLocale('es-mx')`.

::: warning It isn't reactive
`t()` reads the catalog at the moment it's called. An already-rendered component isn't re-translated after `setLocale()`. Set the locale before mounting the application; to switch languages, reload the page or re-render whatever shows text.
:::

::: tip Replacement names that don't clash
Each replacement is a `replaceAll` of `:name`, so `:name` would also replace the start of `:names`. Use names that aren't prefixes of each other.
:::

## Translation keys: locale-gen

`innoboxrr-locale-generator` walks the code, finds the `t('…')` calls and writes one `<locale>.json` per language. New keys are added and **existing ones are left alone**. Generated modules ship it as `npm run locale`.

```bash
npm i -D innoboxrr-locale-generator

npx locale-gen                       # es and en, from ./src into ./src/locales
npx locale-gen es en fr -f ./src -o ./src/locales -m t
npx locale-gen es -t                 # translate new keys with Google Translate
npx locale-gen -v                    # list how many strings each file has
```

| Option | Default | What it does |
|---|---|---|
| `[languages…]` | `es en` | The target languages, separated by spaces. |
| `-f <path>` | `./src` | File or directory to scan. |
| `-o <path>` | `./src/locales` | Where to write the `.json` files. Created if missing. |
| `-m <method>` | `t` | The translation function's name. |
| `-t` | off | Translates keys that didn't exist yet with Google Translate. |
| `-v` | off | Lists the strings found in each file. |
| `-h`, `--help` | | Help. |

Configuration resolves in this order, and later wins: the defaults, `locale.config.js` in the current directory, and the command line.

```js
// locale.config.js
module.exports = {
    languages: ['es', 'en'],
    method: 't',
    sourcePath: './src',
    outputPath: './src/locales',
    translate: false,
}
```

- **Files it scans.** `.vue`, `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.html` and `.php`. It skips `node_modules`, `dist`, `docs`, `.git`, `vendor` and `coverage`.
- **What it finds.** Calls whose first argument is a string literal, in single, double or back quotes.
- **The method name is escaped,** so `-m $t` works. `$t` used to be read as an end-of-line anchor and extraction silently returned zero strings.
- **Only a whole call matches:** with `t` as the method, `split('a')` doesn't count as `t('a')`.
- **Format.** Files are written with 4-space indentation. A new key without `-t` is written as `""`.
- **`-t` needs `GOOGLE_TRANSLATE_KEY`,** read from the `.env` in the current directory. Without it, or if the API fails, the process exits with code 1.

::: warning Two names for the Google key
- **This npm CLI** reads `GOOGLE_TRANSLATE_KEY`.
- **The Laravel package** (`locale:translate`) reads `GOOGLE_TRANSLATE_API_KEY`: see [locale-generator](/en/packages/locale-generator).

If you use both, define both variables.
:::

::: warning If you're coming from the package README
The `innoboxrr-locale-generator` README is out of date. The code says:

- **The default method** is `t`, not `__lang`.
- **There are two options the README doesn't mention:** `-o` and `-v`.
- **The default output** is `./src/locales`.
- **It doesn't scan `.py` files,** and it does scan `.jsx`, `.tsx`, `.mjs` and `.php`.
:::

To use it from code, the package exports `extractStrings(file, method)`, `extractStringsFromDirectory(directory, method, { onFile })`, `generateLocaleJSON(strings, locale, translate, directory)` and `translateString(text, locale)`.

## Masks: innoboxrr-maskjs

```bash
npm i innoboxrr-maskjs
```

A mask is two strings **of the same length**:

```js
const PHONE = {
    format: '(***) ***-****', // what each position accepts
    mask: '(___) ___-____',   // the visible template
}
```

| In `format` | Accepts |
|---|---|
| `*` | A digit |
| `a` | A letter, including accented letters and ñ |
| `A` | A letter or a digit |
| Any other character | A literal: the character at the same position in `mask` is written |

```js
import { applyMask, unmask, isComplete, isMaskSpec } from 'innoboxrr-maskjs'

applyMask('5512345678', PHONE)   // { value: '(551) 234-5678', cursor: 14, complete: true }
unmask('(551) 234-5678', PHONE)  // '5512345678': what gets sent to the backend
isComplete('551234', PHONE)      // false
isMaskSpec(PHONE)                // true
```

- **`applyMask` doesn't care how the value arrived,** whether typed, pasted, deleted or loaded from the API: it pulls out the valid characters and places them again. It's idempotent, so it can run on every keystroke. With an invalid mask it throws `TypeError`.
- **`maskElement(input, spec)`** attaches the mask to a DOM `<input>` and returns the function that detaches it. It formats on input and on paste, and places the cursor.

::: code-group

```vue [Vue]
<script setup>
    import { ref } from 'vue'
    import { formatDirective as vFormat } from 'innoboxrr-maskjs/vue'

    const phone = ref('')
    const PHONE = { mask: '(___) ___-____', format: '(***) ***-****' }
</script>

<template>
    <input v-format="PHONE" v-model="phone">
</template>
```

```jsx [React]
import { useState } from 'react'
import { applyMask } from 'innoboxrr-maskjs'
import { useMask } from 'innoboxrr-maskjs/react'

const PHONE = { mask: '(___) ___-____', format: '(***) ***-****' }

// Controlled, the usual case: no hook needed
export function Controlled() {
    const [phone, setPhone] = useState('')

    return <input value={phone} onChange={(e) => setPhone(applyMask(e.target.value, PHONE).value)} />
}

// Uncontrolled
export function Uncontrolled() {
    const ref = useMask(PHONE)

    return <input ref={ref} />
}
```

:::

- **The Vue directive** updates if the mask changes and detaches on unmount.
- **`TextInputComponent`** uses it internally through the `maskFormat` prop, in both frameworks.
