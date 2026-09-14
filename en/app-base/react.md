# The base application with React

`php artisan app:setup --react` builds the interface with React 19, React Router 7 (data router) and Zustand 5. It is the same application as the Vue one, under the same [contract](/en/app-base/contract). This page covers the code, the boot sequence and the settings, which in React live in `config.js`.

## The files

```text
package.json
vite.config.js
resources/views/app.blade.php
resources/react/
├── routes.json                  rewritten by php artisan route:json
├── index.js                     the LaraPack module (generated)
├── src/                         its models (generated)
└── app/                         the base application: yours
    ├── main.jsx                 boot
    ├── App.jsx                  RouterProvider, ToastRegion and ConfirmHost
    ├── config.js                application settings
    ├── http.js                  axios and interceptors
    ├── i18n.js                  setupI18n
    ├── lang/es.json
    ├── router/
    │   ├── index.jsx            route tree and access-denied toast
    │   ├── guards.js            guards as loaders
    │   ├── menu.js              buildMenu
    │   └── RootLayout.jsx       tab title and ScrollRestoration
    ├── stores/
    │   ├── auth.js              session and profile
    │   ├── options.js           options, useOption, useSiteName
    │   ├── notifications.js     bell
    │   └── ui.js                dark mode, sidebar, useIsDark
    ├── auth/                    AuthLayout, LoginView, RegisterView,
    │                            ForgotPasswordView, ResetPasswordView
    ├── admin/
    │   ├── AdminLayout.jsx
    │   ├── DashboardView.jsx
    │   ├── ProfileView.jsx
    │   ├── SiteEditorView.jsx
    │   ├── siteEditor.js        editor logic, without React
    │   └── components/          JsonEditor, MenuLink, NotificationBell,
    │                            SectionEditor, SessionBanners, SidebarMenu, UserMenu
    ├── components/              ThemeToggle, UserAvatar
    ├── errors/                  ErrorView, NotFoundView
    ├── forms/
    │   ├── errors.js            errorMessage
    │   └── useValidator.js      validation with js-validator
    ├── site/
    │   ├── SitePage.jsx
    │   ├── ThemeManager.jsx
    │   └── sections/
    │       ├── index.js         the section registry
    │       ├── shared.jsx       shared pieces and helpers
    │       └── legacy/          header, hero, section, footer, cookie-consent
    └── styles/
        ├── app.css
        └── site.css             imported by SitePage.jsx
```

## Dependencies and build

`package.json` brings `axios`, `react`, `react-dom`, `react-router-dom`, `zustand`, `innoboxrr-form-core`, `innoboxrr-react-form-elements`, `innoboxrr-react-datatable`, `innoboxrr-http-request`, `innoboxrr-i18n`, `innoboxrr-js-validator` and `innoboxrr-route-resolver`. For development it brings `vite` 8, `@vitejs/plugin-react` 6, `laravel-vite-plugin` 3 and `concurrently`.

`vite.config.js`:

- Entry `resources/react/app/main.jsx`.
- Alias `@app` → `resources/react/app`.
- `resolve.dedupe` for `react`, `react-dom`, `react-router-dom`, `zustand` and `axios`. With two copies of axios the interceptors would not see the module's requests; with two copies of React or the router, their hooks break.
- `storage/framework/views` is excluded from the watcher.

`resources/views/app.blade.php` carries the same dark-mode script as Vue, `@viteReactRefresh` before `@vite('resources/react/app/main.jsx')`, and a `<noscript>`.

## Boot

`main.jsx` imports `innoboxrr-form-core/styles`, `innoboxrr-react-form-elements/src/css/form-elements.css` and `styles/app.css`. It loads the module with `import.meta.glob('../index.js', { eager: true })` and `../src/theme.js` if it exists. Then, in `boot()`:

1. `configureHttp(axios)`: `withCredentials`, `withXSRFToken`, `Accept` and `X-Requested-With`.
2. `installInterceptors(axios, { onUnauthenticated })` with `unauthenticatedHandler`: on a 401 it clears the session and navigates to `/auth/login?redirect=…`, unless it is already on `/auth/…`.
3. `setRoutes(routes)` with `resources/react/routes.json`.
4. `setupI18n(module.translations)`: module first, `app/lang/*.json` second, and `setLocale(document.documentElement.lang || 'en')`.
5. `useUiStore.getState().initTheme()`.
6. `module.registerModuleRoutes?.(adminBase)`: registers the module's route names in `innoboxrr-react-datatable` with the same prefix the routes are mounted under, so the table can build its links by name.
7. `await Promise.all([auth.load(), options.load()])`. Each store catches its own errors, so a failure does not stop boot.
8. `createAppRouter({ moduleRoutes: module.routes ?? [] })`.
9. `createRoot(#app).render(<StrictMode><App router={router} /></StrictMode>)`.

`App.jsx` mounts `RouterProvider`, `ToastRegionComponent` (labelled "Alerts") and `ConfirmHostComponent`, exactly once.

## `config.js`

What the application decides and the LaraPack module cannot know:

| Export | Default | What it decides |
|---|---|---|
| `adminOnly` | `['AdminUsers']` | **Ids** of the module routes only admins see. An id also covers its children. |
| `adminBase` | `'/admin'` | Prefix used to register the module's route names and to build menu links. |
| `userUpdateRoute` | `'api.app.user.update'` | The generated user's update route, used by the profile and the photo. |
| `adminTools` | Logs (`/log-viewer`) and Environment (`/env-editor`) | "Administration" group tools served by Laravel: `{ id, label, href, icon }`. They open in a new tab and `label` goes through `t()`. |
| `notificationsInterval` | `60_000` | Milliseconds between notification-count polls. |
| `sitePages` | `home`, `privacy`, `terms`, `contact`, `join` | Site pages: `{ key, path, name, label }`. They create the routes and the editor tabs. |

::: warning `adminBase` does not move the admin panel on its own
The tree in `router/index.jsx` mounts the admin panel at `path: 'admin'`, and the guards and several screens redirect to a hard-coded `/admin`. If you change `adminBase`, change those too.
:::

## The router (data router)

`router/index.jsx` exports `buildRoutes({ moduleRoutes, adminOnly, getSession, onDenied })`, `createAppRouter(options)` (with `createBrowserRouter`) and `announceDenied`.

| Id | Path | `handle` | Element |
|---|---|---|---|
| `root` | `/` | — | `RootLayout`; `errorElement: <ErrorView />`; `HydrateFallback: () => null` |
| `site.home` | index of `/` | `{ page: 'home' }` | `<SitePage page="home" />` |
| `site.privacy`, `site.terms`, `site.contact`, `site.join` | `privacy`, `terms`, … | `{ page }` | `<SitePage page={key} />` |
| `auth` | `auth` | `{ guest: true }` | `AuthLayout` |
| `auth.login` | `auth/login` | `title: 'Log in'`, `guest` | `LoginView` |
| `auth.register` | `auth/register` | `title: 'Create an account'`, `guest` | `RegisterView` |
| `auth.forgot-password` | `auth/forgot-password` | `title: 'Forgot your password?'`, `guest` | `ForgotPasswordView` |
| `auth.reset-password` | `auth/reset-password/:token/:email` | `title: 'Choose a new password'`, `guest` | `ResetPasswordView` |
| `admin` | `admin` | `{ auth: true }` | `<AdminLayout moduleRoutes={…} />` |
| `admin.dashboard` | index of `admin` | `title: 'Home'`, `auth` | `DashboardView` |
| `admin.profile` | `admin/profile` | `title: 'Profile'`, `auth` | `ProfileView` (`lazy`) |
| `admin.site` | `admin/site` | `title: 'Site'`, `auth`, `admin` | `SiteEditorView` (`lazy`: it brings CodeMirror, which the public site has no reason to download) |
| the module's | children of `admin` | `title`, `auth` | the module's |
| `not-found` | `*` | `title: 'Page not found'` | `NotFoundView` |

- Titles are getters that translate when read.
- `errorElement` shows `ErrorView` when a screen fails to load, for example a chunk that no longer exists after a deploy. It offers to reload or go home.
- `RootLayout` sets the `<title> · <site name>` tab title on every non-site route and mounts `ScrollRestoration`. Site pages set their own from `SitePage`.

## The guards

React Router has no `beforeEach`, so `router/guards.js` puts **a loader with its guard on every route** in the tree. The parent's loader is not enough: React Router does not rerun a parent's loader when navigating between its children, and the session may have changed in between.

| Export | What it does |
|---|---|
| `withGuards(routes, { adminOnly, getSession, onDenied })` | Copies the tree and sets `loader: createGuardLoader(…)` on every route, keeping any loader it already had. |
| `requirementsFor(route, inherited, adminOnly)` | `{ guest, auth, admin }` including the parents'. `admin` is `handle.admin === true` or the `id` in `adminOnly`; `admin` implies `auth`. |
| `checkAccess(requirements, session, target)` | `null` or `{ reason, redirect }`. |
| `createGuardLoader(requirements, { getSession, onDenied }, loader)` | If access is denied, calls `onDenied` and throws `redirect(…)`. |
| `safeRedirect(value, fallback = '/admin')` | The value if it is an internal path; otherwise `fallback`. |
| `loginPath(target)` | `/auth/login?redirect=<encoded target>` |
| `hasParams(path)` | Whether the path has `:` or `*`. |

| Case | Redirects to | `reason` |
|---|---|---|
| `guest` and there is a session | `/admin` | `guest` |
| `auth` and there is no session | `/auth/login?redirect=…` | `auth` |
| `admin` and `is_admin` is not `true` | `/admin` | `admin` |

`announceDenied` shows "That section is only for administrators.". It avoids showing it twice, because the parent's and the child's loaders run at the same time.

::: warning Guards are not security
They decide which screens are shown. The backend protects the data: policies, `ManagedFilter` and the `admin` middleware.
:::

## The menu

`buildMenu({ moduleRoutes, isAdmin, adminOnly, base, tools, translate })` in `router/menu.js` returns **`{ main, admin }`**:

```js
{
    main: [
        { id: 'admin.dashboard', label: 'Home', to: '/admin', icon: 'home', end: true },
        // module routes that are not in adminOnly
    ],
    admin: [ // empty for non-admins
        // module routes that are in adminOnly
        { id: 'admin.site', label: 'Site', to: '/admin/site', icon: 'mdi:web' },
        { id: 'log-viewer', label: 'Logs', href: '/log-viewer', icon: 'mdi:text-box-search-outline', external: true },
        { id: 'env-editor', label: 'Environment', href: '/env-editor', icon: 'mdi:tune-variant', external: true },
    ],
}
```

- Every first-level module route that is not an `index`, has a `path` without parameters and has `handle.title` becomes an entry, in the order the module exports it.
- An entry is `{ id, label, to: base + path, icon: handle.icon ?? 'box', restricted }`.
- `AdminLayout` builds the menu and passes it to its children as the `Outlet` context (the `menu` key); `DashboardView` reads it with `useOutletContext()`.
- `SidebarMenu` renders both groups and `MenuLink` each entry: a `NavLink` for an SPA screen, a new-tab link for a tool.

## State (Zustand)

Each store is created by a factory that receives its dependencies (`http`, `resolve`, …), so it can be tested without a network. Inside a component you read it with a selector; outside, with `getState()`:

```jsx
const user = useAuthStore((state) => state.user)
await useAuthStore.getState().load()
```

### `stores/auth.js`

State: `user`, `authenticated`, `is_admin`, `verified`, `impersonating` and `loaded`.

| Action | Request | Then |
|---|---|---|
| `load()` | GET `auth.get.auth` with `skipAuthRedirect` | Stores the fields; on failure, logs to the console and stays a guest. |
| `login({ email, password, remember })` | GET CSRF cookie, POST `auth.login` | `load()`; returns `data` |
| `register({ name, email, password, password_confirmation })` | GET CSRF cookie, POST `auth.register` | `load()` |
| `logout()` | POST `auth.logout` with `skipAuthRedirect` | `clear()` always |
| `forgotPassword({ email })` | GET CSRF cookie, POST `auth.forgot.password` | returns `data` |
| `resetPassword({ token, email, password, password_confirmation })` | GET CSRF cookie, POST `auth.reset.password` | returns `data` |
| `updatePassword({ old_password, password, password_confirmation })` | POST `auth.update.password` | returns `data` |
| `resendVerification()` | POST `auth.email.verification.notification` | returns `data` |
| `revertImpersonation()` | POST `auth.revert.impersonate` | `load()` |
| `updateProfile({ name, email })` | PUT `userUpdateRoute` with `user_id` | `load()` |
| `updateAvatar(file)` | POST `lu.upload.file` (multipart `file`, `visibility=public`), then PUT `userUpdateRoute` with `avatar` | `load()`; returns the `uri` |
| `removeAvatar()` | PUT `userUpdateRoute` with `avatar: ''` | `load()` |
| `clear()` | — | empty session |

`payloadOf(user)` and `avatarOf(user)` read `payload.avatar`, whether `payload` arrives as an object or as JSON text.

### `stores/options.js`

State: `values`, `records` (key → `{ id, key, name }`) and `loaded`.

| Function | What it does |
|---|---|
| `load()` | GET `api.laravel-options.option.index` with `paginate: 0` and `hydrate(list)`. On failure, logs to the console. |
| `hydrate(list)` | Decodes JSON objects and arrays, and keeps everything else as text. |
| `option(path, fallback = null)` | Dotted reads: `option('theme.home.title')`. |
| `save(key, value)` | With an `id`, PUT `api.laravel-options.option.update` with `{ option_id, name, key, value }`. Without one, POST `api.laravel-options.option.create` with `{ key, name: key, value }`. |

The hooks `useOption(path, fallback)` and `useSiteName()` subscribe to `values` and resolve outside the selector: a selector that returns a new object on every read makes Zustand re-render endlessly. `useSiteName()` falls back to the title Blade set (`config('app.name')`) when `site_name` is missing.

### `stores/notifications.js`

State: `count`, `items` and `loading`.

| Function | Request |
|---|---|
| `fetchCount()` | GET `innoboxrr.notifications.index.unread.count` |
| `fetchLatest(limit = 10)` | GET `innoboxrr.notifications.index` with `limit` |
| `markAsRead(notification)` | POST `innoboxrr.notifications.mark.as.read`. Returns `resolveAction(…)`. |
| `markAllAsRead()` | POST `innoboxrr.notifications.mark.all.as.read` |
| `startPolling(interval = notificationsInterval)` | The count at start, every `interval` and when the tab becomes visible. Returns the function that stops it. |
| `reset()` | — |

### `stores/ui.js`

State: `theme` (`'dark'`, `'light'` or `null`) and `sidebarOpen`. Actions: `initTheme()`, `toggleTheme()` and `setSidebarOpen(open)`. The `useIsDark()` hook combines the choice with `prefers-color-scheme` through `useSyncExternalStore`. The `localStorage` key is `theme`, the same as in Vue and in the Blade script.

## Requests: `http.js`

| Export | What it does |
|---|---|
| `configureHttp(http)` | The axios defaults. |
| `csrfCookieUrl()` | `route('sanctum.csrf-cookie')` if it exists; otherwise `/sanctum/csrf-cookie`. |
| `createErrorHandler({ http, onUnauthenticated, csrfUrl })` | On a **419** it fetches a new cookie and retries the request once. On a **401** it calls `onUnauthenticated`, unless the request has `skipAuthRedirect: true`. |
| `installInterceptors(http, options)` | Registers the handler. |
| `unauthenticatedHandler({ clearSession, navigate, currentPath })` | Clears the session and navigates to login, unless already on `/auth/…`. |

Unlike Vue, there is no `apiUrl`: the stores call `route(name, params)` from `innoboxrr-route-resolver` directly.

## Forms

The forms use `innoboxrr-react-form-elements`' `TextInputComponent` (`value` and `onChange(value)`, `validators`, `autoComplete`, `showPasswordLabel` and `hidePasswordLabel`) with two helpers:

- `forms/useValidator.js` returns `{ form, showServerErrors, clear }`. `form` is the `<form>` ref; the hook creates `new JSValidator(form, { messages }).init()` and destroys it on unmount. `showServerErrors(error)` places a 422's errors next to each field and returns `true`, or `false` if it was not a 422.
- `forms/errors.js` → `errorMessage(error, fallback)`: with no response, a connection error; 429; 403; the first validation error; `data.message`; or a generic one.

```jsx
const { form, showServerErrors } = useValidator()

const submit = async (event) => {
    event.preventDefault()

    try {
        await save(values)
    } catch (error) {
        if (! showServerErrors(error)) {
            notifyError(errorMessage(error))
        }
    }
}

return <form ref={form} onSubmit={submit} noValidate>…</form>
```

## The site

- `SitePage({ page })` reads `theme.<page>`, sets the title and, if the page does not exist, shows "This page has no content yet". It imports `styles/site.css`.
- `ThemeManager({ sections, registry })` filters with `visibleSections` and splits header and footer with `splitLandmarks`. It wraps each section in a `SectionBoundary`, so one that fails does not take the page down.
- **Each section receives a single prop, `props`**, holding the JSON object: `<HeroOne props={…} />`.
- `sections/shared.jsx` exports `asArray`, `asText`, `asObject`, `isOn`, `isInternal`, `safeHref`, `SmartLink`, `OptionalImage`, `Brand`, `SOCIAL_NETWORKS`, `SocialLinks`, `SectionHeader`, `Checklist` and `HeroCopy`.

Each section's details are in [The site and its editor](/en/app-base/site).

## Where to change things

| What | Where |
|---|---|
| Module routes only admins see | `config.js` → `adminOnly` (ids) |
| Site pages | `config.js` → `sitePages` |
| "Administration" group tools | `config.js` → `adminTools`; "Site" is in `router/menu.js` |
| Notifications interval | `config.js` → `notificationsInterval` |
| User update | `config.js` → `userUpdateRoute`; the upload route `lu.upload.file` is in `stores/auth.js` |
| Admin prefix | `config.js` → `adminBase`, plus `path: 'admin'` in `router/index.jsx` and the `/admin` in guards and screens |
| Where a login lands | `auth/LoginView.jsx` (`safeRedirect`, `/admin` by default) |
| Denied route toast | `router/index.jsx` → `announceDenied` |
| Site sections | `site/sections/index.js` |
| Strings | `lang/es.json` |
| Styles | `styles/app.css`, `styles/site.css` |

Full recipes are in [Customize and extend](/en/app-base/customize).

## Tests

They live in the `innoboxrr/laravel-setup` package, in `tests/Frontend/react`, and test `stubs/app/react/resources/react/app`. **They are not copied into your application.**

| File | What it tests |
|---|---|
| `auth.test.js` | The session and profile store |
| `guards.test.jsx` | `requirementsFor`, `checkAccess`, `withGuards`, `safeRedirect` |
| `menu.test.js` | `buildMenu` and `adminOnly` |
| `notifications.test.jsx` | Bell and notifications store |
| `options.test.js` | Decoding, `readPath`, `save` |
| `screens.test.jsx` | Authentication and admin screens |
| `sections.test.jsx` | The sections and their props |
| `site-editor.test.jsx` | The site editor |
| `theme-manager.test.jsx` | `visibleSections` and `splitLandmarks` |

```bash
cd tests/Frontend/react
npm install
npx vitest run
```

- Vitest 3, jsdom and Testing Library.
- `@app` points at the stubs, and `resolve.dedupe` resolves their imports from this folder.
- The `innoboxrr-*` packages are inlined because they publish uncompiled JSX.

::: tip Why the harness uses Vite 7
The application asks for `vite ^8` and `@vitejs/plugin-react ^6`, but the test harness stays on `vite ^7.1` and `@vitejs/plugin-react ^5`. Vitest 4 with Vite 8.3 breaks `npm install` on npm 10.
:::
