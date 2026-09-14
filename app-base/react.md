# La aplicación base con React

`php artisan app:setup --react` monta la interfaz con React 19, React Router 7 (data router) y Zustand 5. Es la misma aplicación que la de Vue, con el mismo [contrato](/app-base/contrato). Aquí están el código, el arranque y los ajustes, que en React viven en `config.js`.

## Los archivos

```text
package.json
vite.config.js
resources/views/app.blade.php
resources/react/
├── routes.json                  lo reescribe php artisan route:json
├── index.js                     el módulo de LaraPack (generado)
├── src/                         sus modelos (generados)
└── app/                         la aplicación base: tuya
    ├── main.jsx                 arranque
    ├── App.jsx                  RouterProvider, ToastRegion y ConfirmHost
    ├── config.js                los ajustes de la aplicación
    ├── http.js                  axios e interceptores
    ├── i18n.js                  setupI18n
    ├── lang/es.json
    ├── router/
    │   ├── index.jsx            árbol de rutas y aviso de acceso denegado
    │   ├── guards.js            guardas como loaders
    │   ├── menu.js              buildMenu
    │   └── RootLayout.jsx       título de la pestaña y ScrollRestoration
    ├── stores/
    │   ├── auth.js              sesión y perfil
    │   ├── options.js           opciones, useOption, useSiteName
    │   ├── notifications.js     campana
    │   └── ui.js                modo oscuro, barra lateral, useIsDark
    ├── auth/                    AuthLayout, LoginView, RegisterView,
    │                            ForgotPasswordView, ResetPasswordView
    ├── admin/
    │   ├── AdminLayout.jsx
    │   ├── DashboardView.jsx
    │   ├── ProfileView.jsx
    │   ├── SiteEditorView.jsx
    │   ├── siteEditor.js        lógica del editor, sin React
    │   └── components/          JsonEditor, MenuLink, NotificationBell,
    │                            SectionEditor, SessionBanners, SidebarMenu, UserMenu
    ├── components/              ThemeToggle, UserAvatar
    ├── errors/                  ErrorView, NotFoundView
    ├── forms/
    │   ├── errors.js            errorMessage
    │   └── useValidator.js      validación con js-validator
    ├── site/
    │   ├── SitePage.jsx
    │   ├── ThemeManager.jsx
    │   └── sections/
    │       ├── index.js         el registro de secciones
    │       ├── shared.jsx       piezas y helpers comunes
    │       └── legacy/          header, hero, section, footer, cookie-consent
    └── styles/
        ├── app.css
        └── site.css             lo importa SitePage.jsx
```

## Dependencias y compilación

`package.json` trae `axios`, `react`, `react-dom`, `react-router-dom`, `zustand`, `innoboxrr-form-core`, `innoboxrr-react-form-elements`, `innoboxrr-react-datatable`, `innoboxrr-http-request`, `innoboxrr-i18n`, `innoboxrr-js-validator` e `innoboxrr-route-resolver`. En desarrollo trae `vite` 8, `@vitejs/plugin-react` 6, `laravel-vite-plugin` 3 y `concurrently`.

`vite.config.js`:

- Entrada `resources/react/app/main.jsx`.
- Alias `@app` → `resources/react/app`.
- `resolve.dedupe` de `react`, `react-dom`, `react-router-dom`, `zustand` y `axios`. Con dos copias de axios, los interceptores no verían las peticiones del módulo; con dos de React o del router, sus hooks fallan.
- `storage/framework/views` fuera del watcher.

`resources/views/app.blade.php` lleva el mismo script de modo oscuro que Vue, `@viteReactRefresh` antes de `@vite('resources/react/app/main.jsx')` y un `<noscript>`.

## El arranque

`main.jsx` importa `innoboxrr-form-core/styles`, `innoboxrr-react-form-elements/src/css/form-elements.css` y `styles/app.css`. Carga el módulo con `import.meta.glob('../index.js', { eager: true })` y `../src/theme.js` si existe. Después, en `boot()`:

1. `configureHttp(axios)`: `withCredentials`, `withXSRFToken`, `Accept` y `X-Requested-With`.
2. `installInterceptors(axios, { onUnauthenticated })` con `unauthenticatedHandler`: ante un 401, limpia la sesión y navega a `/auth/login?redirect=…` salvo que ya esté en `/auth/…`.
3. `setRoutes(routes)` con `resources/react/routes.json`.
4. `setupI18n(module.translations)`: módulo primero, `app/lang/*.json` después, y `setLocale(document.documentElement.lang || 'en')`.
5. `useUiStore.getState().initTheme()`.
6. `module.registerModuleRoutes?.(adminBase)`: registra los nombres de ruta del módulo en `innoboxrr-react-datatable` con el mismo prefijo con el que se montan, para que la tabla construya sus enlaces por nombre.
7. `await Promise.all([auth.load(), options.load()])`. Cada estado captura sus propios errores, así que uno que falle no para el arranque.
8. `createAppRouter({ moduleRoutes: module.routes ?? [] })`.
9. `createRoot(#app).render(<StrictMode><App router={router} /></StrictMode>)`.

`App.jsx` monta `RouterProvider`, `ToastRegionComponent` (con la etiqueta «Alerts») y `ConfirmHostComponent`, una sola vez.

## `config.js`

Lo que decide la aplicación y el módulo de LaraPack no sabe:

| Export | Por omisión | Qué decide |
|---|---|---|
| `adminOnly` | `['AdminUsers']` | **Ids** de las rutas del módulo que sólo ve un administrador. Un id cubre también a sus hijas. |
| `adminBase` | `'/admin'` | Prefijo con el que se registran los nombres de ruta del módulo y se construyen los enlaces del menú. |
| `userUpdateRoute` | `'api.app.user.update'` | La ruta del update del usuario generado, que usan el perfil y la foto. |
| `adminTools` | Registros (`/log-viewer`) y Entorno (`/env-editor`) | Herramientas del grupo «Administración» que sirve Laravel: `{ id, label, href, icon }`. Se abren en otra pestaña y `label` pasa por `t()`. |
| `notificationsInterval` | `60_000` | Milisegundos entre consultas del contador de notificaciones. |
| `sitePages` | `home`, `privacy`, `terms`, `contact`, `join` | Páginas del sitio: `{ key, path, name, label }`. Crean las rutas y las pestañas del editor. |

::: warning `adminBase` no mueve el administrador por sí solo
El árbol de `router/index.jsx` monta el administrador en `path: 'admin'`, y las guardas y varias pantallas redirigen a `/admin` escrito a mano. Si cambias `adminBase`, cambia también esas rutas.
:::

## El router (data router)

`router/index.jsx` exporta `buildRoutes({ moduleRoutes, adminOnly, getSession, onDenied })`, `createAppRouter(options)` (con `createBrowserRouter`) y `announceDenied`.

| Id | Ruta | `handle` | Elemento |
|---|---|---|---|
| `root` | `/` | — | `RootLayout`; `errorElement: <ErrorView />`; `HydrateFallback: () => null` |
| `site.home` | índice de `/` | `{ page: 'home' }` | `<SitePage page="home" />` |
| `site.privacy`, `site.terms`, `site.contact`, `site.join` | `privacy`, `terms`, … | `{ page }` | `<SitePage page={key} />` |
| `auth` | `auth` | `{ guest: true }` | `AuthLayout` |
| `auth.login` | `auth/login` | `title: 'Log in'`, `guest` | `LoginView` |
| `auth.register` | `auth/register` | `title: 'Create an account'`, `guest` | `RegisterView` |
| `auth.forgot-password` | `auth/forgot-password` | `title: 'Forgot your password?'`, `guest` | `ForgotPasswordView` |
| `auth.reset-password` | `auth/reset-password/:token/:email` | `title: 'Choose a new password'`, `guest` | `ResetPasswordView` |
| `admin` | `admin` | `{ auth: true }` | `<AdminLayout moduleRoutes={…} />` |
| `admin.dashboard` | índice de `admin` | `title: 'Home'`, `auth` | `DashboardView` |
| `admin.profile` | `admin/profile` | `title: 'Profile'`, `auth` | `ProfileView` (`lazy`) |
| `admin.site` | `admin/site` | `title: 'Site'`, `auth`, `admin` | `SiteEditorView` (`lazy`: trae CodeMirror, y el sitio público no tiene por qué descargarlo) |
| las del módulo | hijas de `admin` | `title`, `auth` | las del módulo |
| `not-found` | `*` | `title: 'Page not found'` | `NotFoundView` |

- Los títulos son getters que traducen al leerse.
- `errorElement` enseña `ErrorView` si una pantalla falla al cargar, por ejemplo un chunk que ya no existe tras un despliegue. Ofrece recargar o ir al inicio.
- `RootLayout` pone el título `<título> · <nombre del sitio>` en toda ruta que no es del sitio y monta `ScrollRestoration`. Las páginas del sitio ponen el suyo desde `SitePage`.

## Las guardas

React Router no tiene `beforeEach`, así que `router/guards.js` pone un **loader con su guarda en cada ruta** del árbol. No basta con el padre: React Router no vuelve a ejecutar el loader de un padre al navegar entre sus hijas, y la sesión puede haber cambiado.

| Export | Qué hace |
|---|---|
| `withGuards(routes, { adminOnly, getSession, onDenied })` | Copia el árbol y pone en cada ruta `loader: createGuardLoader(…)`, sin perder el loader que ya tuviera. |
| `requirementsFor(route, inherited, adminOnly)` | `{ guest, auth, admin }` sumando los padres. `admin` es `handle.admin === true` o el `id` en `adminOnly`; `admin` implica `auth`. |
| `checkAccess(requirements, session, target)` | `null` o `{ reason, redirect }`. |
| `createGuardLoader(requirements, { getSession, onDenied }, loader)` | Si hay acceso denegado, llama a `onDenied` y lanza `redirect(…)`. |
| `safeRedirect(value, fallback = '/admin')` | El valor si es una ruta interna; si no, `fallback`. |
| `loginPath(target)` | `/auth/login?redirect=<target codificado>` |
| `hasParams(path)` | Si la ruta tiene `:` o `*`. |

| Caso | Redirige a | `reason` |
|---|---|---|
| `guest` y hay sesión | `/admin` | `guest` |
| `auth` y no hay sesión | `/auth/login?redirect=…` | `auth` |
| `admin` y `is_admin` no es `true` | `/admin` | `admin` |

`announceDenied` enseña «That section is only for administrators.». Evita que salga dos veces, porque el loader del padre y el de la hija se evalúan a la vez.

::: warning Las guardas no son seguridad
Deciden qué pantallas se enseñan. Lo que protege los datos es el backend: políticas, `ManagedFilter` y el middleware `admin`.
:::

## El menú

`buildMenu({ moduleRoutes, isAdmin, adminOnly, base, tools, translate })` en `router/menu.js` devuelve **`{ main, admin }`**:

```js
{
    main: [
        { id: 'admin.dashboard', label: 'Inicio', to: '/admin', icon: 'home', end: true },
        // rutas del módulo que no están en adminOnly
    ],
    admin: [ // vacío si no es administrador
        // rutas del módulo que están en adminOnly
        { id: 'admin.site', label: 'Sitio', to: '/admin/site', icon: 'mdi:web' },
        { id: 'log-viewer', label: 'Registros', href: '/log-viewer', icon: 'mdi:text-box-search-outline', external: true },
        { id: 'env-editor', label: 'Entorno', href: '/env-editor', icon: 'mdi:tune-variant', external: true },
    ],
}
```

- Entra cada ruta de primer nivel del módulo que no es `index`, tiene `path` sin parámetros y tiene `handle.title`, en el orden en que la exporta el módulo.
- Una entrada es `{ id, label, to: base + path, icon: handle.icon ?? 'box', restricted }`.
- `AdminLayout` construye el menú y lo pasa a sus hijas como contexto del `Outlet` (la clave `menu`); `DashboardView` lo lee con `useOutletContext()`.
- `SidebarMenu` pinta los dos grupos y `MenuLink` cada entrada: `NavLink` para una pantalla de la SPA, enlace en otra pestaña para una herramienta.

## Los estados (Zustand)

Cada estado se crea con una fábrica que recibe sus dependencias (`http`, `resolve`, …), para poder probarlo sin red. Dentro de un componente se lee con un selector; fuera, con `getState()`:

```jsx
const user = useAuthStore((state) => state.user)
await useAuthStore.getState().load()
```

### `stores/auth.js`

Estado: `user`, `authenticated`, `is_admin`, `verified`, `impersonating` y `loaded`.

| Acción | Petición | Después |
|---|---|---|
| `load()` | GET `auth.get.auth` con `skipAuthRedirect` | Guarda los campos; si falla, escribe en consola y queda como visitante. |
| `login({ email, password, remember })` | GET cookie CSRF, POST `auth.login` | `load()`; devuelve `data` |
| `register({ name, email, password, password_confirmation })` | GET cookie CSRF, POST `auth.register` | `load()` |
| `logout()` | POST `auth.logout` con `skipAuthRedirect` | `clear()` siempre |
| `forgotPassword({ email })` | GET cookie CSRF, POST `auth.forgot.password` | devuelve `data` |
| `resetPassword({ token, email, password, password_confirmation })` | GET cookie CSRF, POST `auth.reset.password` | devuelve `data` |
| `updatePassword({ old_password, password, password_confirmation })` | POST `auth.update.password` | devuelve `data` |
| `resendVerification()` | POST `auth.email.verification.notification` | devuelve `data` |
| `revertImpersonation()` | POST `auth.revert.impersonate` | `load()` |
| `updateProfile({ name, email })` | PUT `userUpdateRoute` con `user_id` | `load()` |
| `updateAvatar(file)` | POST `lu.upload.file` (multipart `file`, `visibility=public`), luego PUT `userUpdateRoute` con `avatar` | `load()`; devuelve el `uri` |
| `removeAvatar()` | PUT `userUpdateRoute` con `avatar: ''` | `load()` |
| `clear()` | — | sesión vacía |

`payloadOf(user)` y `avatarOf(user)` leen `payload.avatar`, venga `payload` como objeto o como texto JSON.

### `stores/options.js`

Estado: `values`, `records` (clave → `{ id, key, name }`) y `loaded`.

| Función | Qué hace |
|---|---|
| `load()` | GET `api.laravel-options.option.index` con `paginate: 0` y `hydrate(list)`. Si falla, escribe en consola. |
| `hydrate(list)` | Decodifica objetos y arreglos JSON, y deja el resto como texto. |
| `option(path, fallback = null)` | Lectura por puntos: `option('theme.home.title')`. |
| `save(key, value)` | Con `id`, PUT `api.laravel-options.option.update` con `{ option_id, name, key, value }`. Sin él, POST `api.laravel-options.option.create` con `{ key, name: key, value }`. |

Los hooks `useOption(path, fallback)` y `useSiteName()` se suscriben a `values` y resuelven fuera del selector: un selector que devuelve un objeto nuevo en cada lectura hace que Zustand repinte sin fin. `useSiteName()` cae en el título que puso Blade (`config('app.name')`) si falta `site_name`.

### `stores/notifications.js`

Estado: `count`, `items` y `loading`.

| Función | Petición |
|---|---|
| `fetchCount()` | GET `innoboxrr.notifications.index.unread.count` |
| `fetchLatest(limit = 10)` | GET `innoboxrr.notifications.index` con `limit` |
| `markAsRead(notification)` | POST `innoboxrr.notifications.mark.as.read`. Devuelve `resolveAction(…)`. |
| `markAllAsRead()` | POST `innoboxrr.notifications.mark.all.as.read` |
| `startPolling(interval = notificationsInterval)` | Contador al empezar, cada `interval` y al volver a la pestaña. Devuelve la función que lo detiene. |
| `reset()` | — |

### `stores/ui.js`

Estado: `theme` (`'dark'`, `'light'` o `null`) y `sidebarOpen`. Acciones: `initTheme()`, `toggleTheme()` y `setSidebarOpen(open)`. El hook `useIsDark()` combina la elección con `prefers-color-scheme` mediante `useSyncExternalStore`. La clave de `localStorage` es `theme`, la misma que en Vue y en el script de Blade.

## Peticiones: `http.js`

| Export | Qué hace |
|---|---|
| `configureHttp(http)` | Los valores por omisión de axios. |
| `csrfCookieUrl()` | `route('sanctum.csrf-cookie')` si existe; si no, `/sanctum/csrf-cookie`. |
| `createErrorHandler({ http, onUnauthenticated, csrfUrl })` | Ante un **419** pide otra cookie y repite la petición una vez. Ante un **401** llama a `onUnauthenticated`, salvo que la petición lleve `skipAuthRedirect: true`. |
| `installInterceptors(http, options)` | Registra el manejador. |
| `unauthenticatedHandler({ clearSession, navigate, currentPath })` | Limpia la sesión y navega al login, salvo que ya esté en `/auth/…`. |

A diferencia de Vue, no hay `apiUrl`: los estados llaman a `route(name, params)` de `innoboxrr-route-resolver` directamente.

## Formularios

Los formularios usan `TextInputComponent` de `innoboxrr-react-form-elements` (`value` y `onChange(value)`, `validators`, `autoComplete`, `showPasswordLabel` y `hidePasswordLabel`) con dos helpers:

- `forms/useValidator.js` devuelve `{ form, showServerErrors, clear }`. `form` es la ref del `<form>`; el hook crea `new JSValidator(form, { messages }).init()` y lo destruye al desmontar. `showServerErrors(error)` coloca los errores de un 422 junto a cada campo y devuelve `true`, o `false` si no era un 422.
- `forms/errors.js` → `errorMessage(error, fallback)`: sin respuesta, error de conexión; 429; 403; el primer error de validación; `data.message`; o uno genérico.

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

## El sitio

- `SitePage({ page })` lee `theme.<page>`, pone el título y, si la página no existe, enseña «This page has no content yet». Importa `styles/site.css`.
- `ThemeManager({ sections, registry })` filtra con `visibleSections` y separa cabecera y pie con `splitLandmarks`. Envuelve cada sección en un `SectionBoundary`: una que falla no se lleva la página.
- **Cada sección recibe una sola prop, `props`**, con el objeto del JSON: `<HeroOne props={…} />`.
- `sections/shared.jsx` exporta `asArray`, `asText`, `asObject`, `isOn`, `isInternal`, `safeHref`, `SmartLink`, `OptionalImage`, `Brand`, `SOCIAL_NETWORKS`, `SocialLinks`, `SectionHeader`, `Checklist` y `HeroCopy`.

Los detalles de cada sección están en [El sitio y su editor](/app-base/sitio).

## Dónde se cambia cada cosa

| Qué | Dónde |
|---|---|
| Rutas del módulo sólo para administradores | `config.js` → `adminOnly` (ids) |
| Páginas del sitio | `config.js` → `sitePages` |
| Herramientas del grupo «Administración» | `config.js` → `adminTools`; «Sitio» está en `router/menu.js` |
| Intervalo de notificaciones | `config.js` → `notificationsInterval` |
| Update del usuario | `config.js` → `userUpdateRoute`; la ruta de subida `lu.upload.file` está en `stores/auth.js` |
| Prefijo del administrador | `config.js` → `adminBase`, más `path: 'admin'` en `router/index.jsx` y los `/admin` de guardas y pantallas |
| A dónde va quien entra | `auth/LoginView.jsx` (`safeRedirect`, por omisión `/admin`) |
| Aviso de ruta denegada | `router/index.jsx` → `announceDenied` |
| Secciones del sitio | `site/sections/index.js` |
| Textos | `lang/es.json` |
| Estilos | `styles/app.css`, `styles/site.css` |

Las recetas completas están en [Personalizar y ampliar](/app-base/personalizar).

## Tests

Viven en el paquete `innoboxrr/laravel-setup`, en `tests/Frontend/react`, y prueban `stubs/app/react/resources/react/app`. **No se copian a tu aplicación.**

| Archivo | Qué prueba |
|---|---|
| `auth.test.js` | El estado de la sesión y el perfil |
| `guards.test.jsx` | `requirementsFor`, `checkAccess`, `withGuards`, `safeRedirect` |
| `menu.test.js` | `buildMenu` y `adminOnly` |
| `notifications.test.jsx` | Campana y estado de notificaciones |
| `options.test.js` | Decodificar, `readPath`, `save` |
| `screens.test.jsx` | Pantallas de acceso y administrador |
| `sections.test.jsx` | Las secciones y sus props |
| `site-editor.test.jsx` | El editor del sitio |
| `theme-manager.test.jsx` | `visibleSections` y `splitLandmarks` |

```bash
cd tests/Frontend/react
npm install
npx vitest run
```

- Vitest 3, jsdom y Testing Library.
- `@app` apunta a los stubs, y `resolve.dedupe` resuelve sus imports desde esta carpeta.
- Los paquetes `innoboxrr-*` se compilan en línea porque publican JSX sin compilar.

::: tip Por qué el arnés usa Vite 7
La aplicación pide `vite ^8` y `@vitejs/plugin-react ^6`, pero el arnés de tests se queda en `vite ^7.1` y `@vitejs/plugin-react ^5`. Vitest 4 con Vite 8.3 rompe `npm install` en npm 10.
:::
