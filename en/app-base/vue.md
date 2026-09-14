# The base application with Vue

`php artisan app:setup` without `--react` builds the interface with Vue 3, vue-router 4 and Pinia 3. This page maps the code: where each thing lives, how it boots and where you change it. What it must honor is in [The interface contract](/en/app-base/contract).

## The files

```text
package.json
vite.config.js
resources/views/app.blade.php
resources/vue/
├── routes.json                 rewritten by php artisan route:json
├── index.js                    the LaraPack module (generated)
├── src/                        its models (generated)
└── app/                        the base application: yours
    ├── main.js                 boot
    ├── App.vue                 RouterView, ToastRegion and ConfirmHost
    ├── module.js               loads the LaraPack module with a glob
    ├── config.js               adminOnly
    ├── http.js                 axios, apiUrl, interceptors and error messages
    ├── i18n.js                 setupI18n
    ├── lang/es.json            application translations
    ├── router/
    │   ├── index.js            routes, SITE_PAGES and titles
    │   ├── guards.js           guards
    │   └── menu.js             buildMenu and menuShortcuts
    ├── stores/
    │   ├── auth.js             session (laravel-auth)
    │   ├── options.js          options (laravel-options)
    │   ├── notifications.js    bell (laravel-notifications)
    │   └── ui.js               dark mode and sidebar
    ├── auth/                   AuthLayout, LoginView, RegisterView,
    │                           ForgotPasswordView, ResetPasswordView
    ├── admin/
    │   ├── AdminLayout.vue
    │   ├── DashboardView.vue
    │   ├── ProfileView.vue
    │   ├── SiteEditorView.vue
    │   ├── site-editor.js      editor logic, without Vue
    │   ├── user.js             avatarOf, initialsOf, firstNameOf
    │   └── components/         AdminBanners, AdminSidebar, NotificationsBell,
    │                           ThemeToggle, UserMenu
    ├── components/
    │   ├── FormField.vue       field with a linked label
    │   └── useValidatedForm.js validation with js-validator
    ├── errors/NotFoundView.vue
    ├── site/
    │   ├── SitePage.vue        a site page from the theme option
    │   ├── ThemeManager.vue    renders the sections
    │   ├── render.js           which sections render
    │   ├── links.js            isInternalLink, safeHref
    │   ├── SiteLink.vue        internal or external link
    │   ├── cookies.js          consent cookie
    │   └── sections/
    │       ├── index.js        the section registry
    │       ├── props.js        prop normalization
    │       ├── social.js       social networks
    │       └── legacy/         header, hero, section, footer, cookie-consent
    └── styles/
        ├── app.css             admin panel and authentication
        └── site.css            public site
```

## Dependencies and build

`package.json` brings `axios`, `vue`, `vue-router`, `pinia`, `innoboxrr-form-core`, `innoboxrr-form-elements`, `innoboxrr-vue-datatable`, `innoboxrr-http-request`, `innoboxrr-i18n`, `innoboxrr-js-validator` and `innoboxrr-route-resolver`. For development it brings `vite` 8, `@vitejs/plugin-vue` 6, `laravel-vite-plugin` 3 and `concurrently`. The scripts are `dev` (`vite`) and `build` (`vite build`).

`vite.config.js`:

- Entry `resources/vue/app/main.js`.
- Alias `@app` → `resources/vue/app`.
- `transformAssetUrls` disabled: site images come from the options, and Vite must not treat a `src` as an import.
- `resolve.dedupe` for `axios`, `pinia`, `vue`, `vue-router` and the `innoboxrr-*` packages. The LaraPack module and the application must share a single copy: form-core keeps toasts and theme in module state, and two copies of axios share neither interceptors nor the XSRF header.
- `storage/framework/views` is excluded from the watcher.

`resources/views/app.blade.php` sets `lang` from `app()->getLocale()` and the `csrf-token`. It also carries an inline script that applies the stored dark mode **before** painting, so the page does not flash light:

```blade
<script>
    try {
        var theme = localStorage.getItem('theme');
        if (theme === 'dark' || theme === 'light') {
            document.documentElement.dataset.theme = theme;
        }
    } catch (e) {}
</script>

@vite('resources/vue/app/main.js')
```

## Boot

`main.js` imports `innoboxrr-form-core/styles`, `styles/app.css` and `styles/site.css`, and loads `../src/theme.js` with `import.meta.glob` if it exists. Then, in `boot()`:

1. `configureAxios(axios)`: `withCredentials`, `withXSRFToken`, `Accept: application/json` and `X-Requested-With: XMLHttpRequest`.
2. `setRoutes(routes)` with `resources/vue/routes.json`.
3. `setupI18n(moduleTranslations)`: the module translations first, then `app/lang/*.json` (the application's win), and `setLocale(document.documentElement.lang || 'en')`.
4. `createPinia()`, `createApp(App)`, `app.use(pinia)` and, if the module exports a plugin with `install`, `app.use(modulePlugin)`.
5. `useUiStore(pinia).init()`: applies the stored theme and listens to the system's.
6. `await Promise.allSettled([auth.load(), options.load()])`. The guards and the first page need to know who the user is and which site to render. If either fails, boot continues.
7. `createAppRouter({ moduleRoutes })`.
8. `installGuards(router, { getSession, adminOnly, onDenied })`. `onDenied` shows the toast "Only an administrator can open that page.".
9. `router.afterEach`: `document.title = documentTitle(to, options.option)`.
10. `installInterceptors({ onUnauthorized })`: on a 401 it clears the session and, unless the current route is a guest route, goes to `auth.login` with `redirect`.
11. `app.use(router)` and `app.mount('#app')`.

`module.js` loads the LaraPack module with a glob, so the application builds even before any model is generated:

```js
const found = Object.values(import.meta.glob('../index.js', { eager: true }))[0] ?? {}

export const moduleRoutes = Array.isArray(found.routes) ? found.routes : []
export const moduleTranslations = found.translations ?? {}
export const modulePlugin = found.default ?? null
```

`App.vue` mounts `RouterView`, `ToastRegionComponent` and `ConfirmHostComponent` exactly once. Both the application's own screens and the generated ones show their toasts and confirmations there.

## The router

`router/index.js` exports `SITE_PAGES`, `buildRoutes(moduleRoutes)`, `createAppRouter({ moduleRoutes, history })`, `formatTitle` and `documentTitle`.

| Path | Name | `meta` | Component |
|---|---|---|---|
| `/`, `/privacy`, `/terms`, `/contact`, `/join` | `site.home`, `site.privacy`, … | `{ page }` | `SitePage.vue` (eager) |
| `/auth` | — | `{ guest: true }` | `AuthLayout.vue`; `''` redirects to `auth.login` |
| `/auth/login` | `auth.login` | `title: 'Sign in'` | `LoginView.vue` |
| `/auth/register` | `auth.register` | `title: 'Create account'` | `RegisterView.vue` |
| `/auth/forgot-password` | `auth.forgot-password` | `title: 'Forgot your password?'` | `ForgotPasswordView.vue` |
| `/auth/reset-password/:token/:email` | `auth.reset-password` | `title: 'Choose a new password'` | `ResetPasswordView.vue` |
| `/admin` | — | `{ auth: true }` | `AdminLayout.vue` |
| `/admin` (child `''`) | `admin.dashboard` | `title: 'Home'` | `DashboardView.vue` |
| `/admin/profile` | `admin.profile` | `title: 'Profile'` | `ProfileView.vue` |
| `/admin/site` | `admin.site` | `{ admin: true, title: 'Site' }` | `SiteEditorView.vue` |
| children of `/admin` | the module's | the module's (`auth: true`, `title`) | the module's |
| `/:pathMatch(.*)*` | `not-found` | `title: 'Page not found'` | `NotFoundView.vue` |

- Titles are **getters** (`get title() { return t('Home') }`): they translate when read, not when the file is imported, which happens before `setLocale()`.
- Every view except `SitePage` loads with `import()` on navigation.
- `scrollBehavior` restores the saved position, scrolls to `#hash` when present and otherwise to the top.
- `documentTitle(to, option)` returns `<title> · <site_name>`. On a site page the title comes from `theme.<page>.title`; elsewhere, from the deepest route with `meta.title`. If both parts are equal, it is written once.

## The guards

`router/guards.js` holds pure functions. They take the destination route and the session, and look at **the whole chain** `to.matched`: a child inherits `auth` from `/admin`, and a user's detail view inherits its list being in `adminOnly`.

| Function | Returns |
|---|---|
| `requiresGuest(to)` | Some route in the chain has `meta.guest === true`. |
| `requiresAuth(to)` | Some route has `meta.auth === true`. |
| `requiresAdmin(to, adminOnly)` | Some route has `meta.admin === true` or its `name` is in `adminOnly`. |
| `safeRedirect(value)` | The value if it starts with `/` and not `//` or `/\`; otherwise `null`. |
| `resolveNavigation(to, { authenticated, isAdmin, adminOnly })` | `{ redirect, reason }`, per the table below. |
| `installGuards(router, { getSession, adminOnly, onDenied })` | Registers `beforeEach`. Calls `onDenied` only for reason `admin`. |

`resolveNavigation` decides in this order:

| Case | Redirects to | `reason` |
|---|---|---|
| Guest route and there is a session | `{ name: 'admin.dashboard' }` | `guest` |
| Needs a session or an admin, and there is no session | `{ name: 'auth.login', query: { redirect: to.fullPath } }` | `auth` |
| Needs an admin and the user is not one | `{ name: 'admin.dashboard' }` | `admin` |
| Anything else | — | `null` |

::: warning Guards are not security
They decide which screens are shown. The backend protects the data: policies, `ManagedFilter` and the `admin` middleware.
:::

## The menu

`router/menu.js`:

- `readTitle(record)` reads `meta.title`, whether a string or a function.
- `isMenuRoute(record)` accepts a route with a `name`, a `path` without `:` and a title.
- `buildMenu(moduleRoutes, { isAdmin, adminOnly, t })` returns **groups**:

```js
[
    { id: 'main', label: null, items: [
        { id: 'admin.dashboard', label: 'Home', icon: 'home', to: { name: 'admin.dashboard' } },
        // module routes that are not in adminOnly
    ] },
    // only when isAdmin:
    { id: 'administration', label: 'Administration', items: [
        // module routes that are in adminOnly
        { id: 'admin.site', label: 'Site', icon: 'mdi:web', to: { name: 'admin.site' } },
        { id: 'log-viewer', label: 'Logs', icon: 'mdi:text-box-search-outline', href: '/log-viewer', external: true },
        { id: 'env-editor', label: 'Environment', icon: 'mdi:tune-variant', href: '/env-editor', external: true },
    ] },
]
```

- A module entry is `{ id: name, label, icon: meta.icon ?? 'box', to: { name } }`.
- `menuShortcuts(groups)` flattens every entry except Home: these are the dashboard cards.

## State (Pinia)

### `stores/auth.js` (`app.auth`)

State: `session` (`{ user, authenticated, is_admin, verified, impersonating }`) and `loaded`. Computed: `user`, `authenticated`, `isAdmin`, `verified`, `impersonating`.

| Action | Request | Then |
|---|---|---|
| `load()` | GET `auth.get.auth` with `skipAuthHandling` | `normalizeSession(data)`; on failure, `clear()` |
| `login({ email, password, remember })` | GET CSRF cookie, POST `auth.login` | `load()` |
| `register(data)` | GET CSRF cookie, POST `auth.register` | `load()` |
| `logout()` | POST `auth.logout` with `skipAuthHandling` | `clear()` always |
| `forgotPassword({ email })` | POST `auth.forgot.password` | returns `data` |
| `resetPassword({ token, email, password, password_confirmation })` | POST `auth.reset.password` | returns `data` |
| `updatePassword({ old_password, password, password_confirmation })` | POST `auth.update.password` | returns `data` |
| `resendVerification()` | POST `auth.email.verification.notification` | returns `data` |
| `revertImpersonation()` | POST `auth.revert.impersonate` | `load()` |
| `setUser(next)` | — | merges `next` into the session user |
| `clear()` | — | empty session |

`normalizeSession` only treats the session as open when `user` is an object and `authenticated` is not `false`. The route names are in `AUTH_ROUTES`. The profile (name, email and photo) is not in this store: `admin/ProfileView.vue` handles it.

### `stores/options.js` (`app.options`)

State: `values` (key → decoded value), `records` (key → `{ id, name }`) and `loaded`.

| Function | What it does |
|---|---|
| `load()` | GET `api.laravel-options.option.index` with `paginate: 0`. It does not catch errors: `Promise.allSettled` absorbs them at boot. |
| `option(path, fallback)` | `option('site_name')`, `option('theme.home.title')`. It first looks up the whole key and, if missing, walks into the JSON by dots. |
| `save(key, value)` | With an `id`, PUT `api.laravel-options.option.update` with `{ option_id, value }`. Without one, POST `api.laravel-options.option.create` with `{ key, name, value }`. Updates `records` and `values`. |

Only a JSON object or array is decoded (`decodeValue`): a `site_name` of `"2024"` stays text. A non-string value is saved serialized to JSON (`serializeValue`). `decodeOptions`, `readOption` and `buildSaveRequest` are exported too.

### `stores/notifications.js` (`app.notifications`)

State: `unread`, `items` and `loading`. Constants: `LATEST_LIMIT = 10` and `POLL_INTERVAL = 60_000`.

| Function | Request |
|---|---|
| `fetchUnreadCount()` | GET `innoboxrr.notifications.index.unread.count` |
| `fetchLatest(limit = 10)` | GET `innoboxrr.notifications.index` with `limit` |
| `markAsRead(notification)` | POST `innoboxrr.notifications.mark.as.read` with `notificationId`. Returns the action. |
| `markAllAsRead()` | POST `innoboxrr.notifications.mark.all.as.read` |
| `reset()` | — |

`startUnreadPolling(store, { interval, doc })` fetches the count when called, every `interval` and when the tab becomes visible. It returns the function that stops it. `resolveAction(action)` returns `{ type: 'router', to }` for an internal path, `{ type: 'location', href }` for `http(s)://…`, and `null` for anything else. `notificationMessage` reads `data.message` or `data.title`.

### `stores/ui.js` (`app.ui`)

State: `themeChoice` (`'dark'`, `'light'` or `null`), `theme`, `isDark` and `sidebarOpen`. Actions: `init()`, `toggleTheme()`, `openSidebar()`, `closeSidebar()` and `toggleSidebar()`. The choice is stored in `localStorage.theme`. With no choice, `data-theme` is not written and form-core follows the system.

## Requests: `http.js`

| Export | What it does |
|---|---|
| `http` | The application's only axios copy. The LaraPack module reaches it through `innoboxrr-http-request`, so the interceptors also cover its requests. |
| `configureAxios(instance)` | The defaults set at boot. |
| `apiUrl(name, params)` | `route(name, params)`, but it **throws** `Unknown backend route "x". Run php artisan route:json.` when the route is not in `routes.json`. With `undefined`, axios would request the current page and the failure would be silent. |
| `csrfCookieUrl()`, `requestCsrfCookie()` | `route('sanctum.csrf-cookie')` if it exists; otherwise `/sanctum/csrf-cookie`. |
| `createErrorHandler({ instance, onUnauthorized })` | On a **419** it fetches a new CSRF cookie and retries the request once (`csrfRetried`). On a **401** it calls `onUnauthorized`, unless the request has `skipAuthHandling: true`. |
| `installInterceptors({ instance, onUnauthorized })` | Registers the handler. |
| `errorMessage(error, t)` | The message for the user: with no response, "Could not connect to the server."; 429; 403 with the backend's message unless it is Laravel's generic one; otherwise `data.message` or a generic one. |
| `validationErrors(error)` | The `{ field: [messages] }` errors of a 422, or `null`. |

```js
import { apiUrl, http } from '@app/http.js'

await http.post(apiUrl('api.app.user.update'), { user_id: 1, name: 'Ana' })

// A request that already expects to have no session:
await http.get(apiUrl('auth.get.auth'), { skipAuthHandling: true })
```

## Forms

`components/FormField.vue` is a field whose label is linked with `for` and `id`. It exists because form-elements' `TextInputComponent` does not give the control an `id`, so its label does not name it for screen readers. It takes `v-model`, `label`, `name`, `type`, `autocomplete`, `validators` and `hint`; any other attribute goes to the `<input>`.

`components/useValidatedForm.js` validates with js-validator before submitting and places a 422's errors under each field:

```vue
<template>
    <form ref="form" novalidate @submit.prevent="handleSubmit">
        <p v-if="error" class="app-alert" role="alert">{{ error }}</p>
        <FormField v-model="email" name="email" type="email" :label="t('Email')" validators="required email" />
        <button type="submit" class="fe-button" :disabled="busy">{{ t('Save') }}</button>
    </form>
</template>

<script setup>
    import { ref } from 'vue'
    import t from 'innoboxrr-i18n'
    import FormField from '@app/components/FormField.vue'
    import { useValidatedForm } from '@app/components/useValidatedForm.js'

    const email = ref('')

    const { form, busy, error, handleSubmit } = useValidatedForm(async ({ setError }) => {
        // your request; a 422 is shown next to each field
    }, {
        statusMessages: { 403: t('You are not allowed to do this.') },
    })
</script>
```

`useValidatedForm(submit, { statusMessages })` returns `{ form, busy, error, handleSubmit, resetErrors }`. `submit` receives `{ setError }`. On an error that is not a 422, `error` takes `statusMessages[status]` or `errorMessage(error, t)`. The validator messages (`required`, `email`, `password_mismatch`, `password_missing`) go through `t()`.

## Where to change things

In Vue these settings are written in their own files. In React they live in `config.js` ([With React](/en/app-base/react)).

| What | Where |
|---|---|
| Module routes only admins see | `config.js` → `adminOnly` (route names) |
| Site pages | `router/index.js` → `SITE_PAGES`, and `admin/site-editor.js` → `DEFAULT_PAGES` |
| Fixed entries of the "Administration" group (Site, Logs, Environment) | `router/menu.js` → `buildMenu` |
| How often the notifications count is polled | `stores/notifications.js` → `POLL_INTERVAL`; how many are listed, `LATEST_LIMIT` |
| User update route and photo upload route | `admin/ProfileView.vue` → `USER_UPDATE` and `UPLOAD` |
| Admin prefix | `router/index.js` (`path: '/admin'`). The menu uses route names. |
| Where a login lands | `auth/LoginView.vue` |
| Denied route toast | `main.js` → `onDenied` |
| Site sections | `site/sections/index.js` |
| Strings | `lang/es.json` |
| Styles | `styles/app.css`, `styles/site.css` |

Full recipes are in [Customize and extend](/en/app-base/customize).

## Tests

This interface's tests live in the `innoboxrr/laravel-setup` package, in `tests/Frontend/vue`, and test `stubs/app/vue/resources/vue/app` directly. **They are not copied into your application.**

| File | What it tests |
|---|---|
| `tests/auth-store.test.js` | Session, login, logout, returning from impersonation |
| `tests/guards.test.js` | `resolveNavigation`, `safeRedirect` |
| `tests/menu.test.js` | `buildMenu`, `adminOnly`, `menuShortcuts` |
| `tests/notifications-bell.test.js` | Bell, count, actions |
| `tests/options-store.test.js` | Decoding, dotted reads, saving |
| `tests/sections.test.js` | The sections and their props |
| `tests/site-editor.test.js` | Draft, invalid JSON, saving |
| `tests/theme-manager.test.js` | Which sections render and where |

```bash
cd tests/Frontend/vue
npm install
npx vitest run
```

- Vitest 3 with jsdom.
- `@app/` points at the stubs, and `resolve.dedupe` resolves their imports from this folder.
- `innoboxrr-form-elements` is replaced by `support/form-elements.js`: the full package pulls in TinyMCE, CodeMirror and vue-tel-input, which do not start in jsdom.

The package CI runs this suite and the React one on Node 22 before releasing.
