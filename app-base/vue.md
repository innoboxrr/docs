# La aplicación base con Vue

`php artisan app:setup` sin `--react` monta la interfaz con Vue 3, vue-router 4 y Pinia 3. Esta página es el mapa del código: dónde está cada cosa, cómo arranca y dónde se cambia. Lo que debe cumplir está en [El contrato de las interfaces](/app-base/contrato).

## Los archivos

```text
package.json
vite.config.js
resources/views/app.blade.php
resources/vue/
├── routes.json                 lo reescribe php artisan route:json
├── index.js                    el módulo de LaraPack (generado)
├── src/                        sus modelos (generados)
└── app/                        la aplicación base: tuya
    ├── main.js                 arranque
    ├── App.vue                 RouterView, ToastRegion y ConfirmHost
    ├── module.js               carga el módulo de LaraPack con un glob
    ├── config.js               adminOnly
    ├── http.js                 axios, apiUrl, interceptores y mensajes de error
    ├── i18n.js                 setupI18n
    ├── lang/es.json            traducciones de la aplicación
    ├── router/
    │   ├── index.js            rutas, SITE_PAGES y títulos
    │   ├── guards.js           guardas
    │   └── menu.js             buildMenu y menuShortcuts
    ├── stores/
    │   ├── auth.js             sesión (laravel-auth)
    │   ├── options.js          opciones (laravel-options)
    │   ├── notifications.js    campana (laravel-notifications)
    │   └── ui.js               modo oscuro y barra lateral
    ├── auth/                   AuthLayout, LoginView, RegisterView,
    │                           ForgotPasswordView, ResetPasswordView
    ├── admin/
    │   ├── AdminLayout.vue
    │   ├── DashboardView.vue
    │   ├── ProfileView.vue
    │   ├── SiteEditorView.vue
    │   ├── site-editor.js      lógica del editor, sin Vue
    │   ├── user.js             avatarOf, initialsOf, firstNameOf
    │   └── components/         AdminBanners, AdminSidebar, NotificationsBell,
    │                           ThemeToggle, UserMenu
    ├── components/
    │   ├── FormField.vue       campo con etiqueta enlazada
    │   └── useValidatedForm.js validación con js-validator
    ├── errors/NotFoundView.vue
    ├── site/
    │   ├── SitePage.vue        página del sitio desde la opción theme
    │   ├── ThemeManager.vue    pinta las secciones
    │   ├── render.js           qué secciones se pintan
    │   ├── links.js            isInternalLink, safeHref
    │   ├── SiteLink.vue        enlace interno o externo
    │   ├── cookies.js          cookie de consentimiento
    │   └── sections/
    │       ├── index.js        el registro de secciones
    │       ├── props.js        normalizar props
    │       ├── social.js       redes sociales
    │       └── legacy/         header, hero, section, footer, cookie-consent
    └── styles/
        ├── app.css             administrador y acceso
        └── site.css            sitio público
```

## Dependencias y compilación

`package.json` trae `axios`, `vue`, `vue-router`, `pinia`, `innoboxrr-form-core`, `innoboxrr-form-elements`, `innoboxrr-vue-datatable`, `innoboxrr-http-request`, `innoboxrr-i18n`, `innoboxrr-js-validator` e `innoboxrr-route-resolver`. En desarrollo trae `vite` 8, `@vitejs/plugin-vue` 6, `laravel-vite-plugin` 3 y `concurrently`. Los scripts son `dev` (`vite`) y `build` (`vite build`).

`vite.config.js`:

- Entrada `resources/vue/app/main.js`.
- Alias `@app` → `resources/vue/app`.
- `transformAssetUrls` desactivado: las imágenes del sitio llegan de las opciones, y Vite no debe tratar un `src` como un import.
- `resolve.dedupe` de `axios`, `pinia`, `vue`, `vue-router` y los paquetes `innoboxrr-*`. El módulo de LaraPack y la aplicación tienen que compartir una sola copia: form-core guarda avisos y tema en su módulo, y dos copias de axios no comparten interceptores ni la cabecera XSRF.
- `storage/framework/views` fuera del watcher.

`resources/views/app.blade.php` pone `lang` desde `app()->getLocale()` y el `csrf-token`. También lleva un script en línea que aplica el modo oscuro guardado **antes** de pintar, para que la página no parpadee en claro:

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

## El arranque

`main.js` importa `innoboxrr-form-core/styles`, `styles/app.css` y `styles/site.css`, y carga `../src/theme.js` con `import.meta.glob` si existe. Después, en `boot()`:

1. `configureAxios(axios)`: `withCredentials`, `withXSRFToken`, `Accept: application/json` y `X-Requested-With: XMLHttpRequest`.
2. `setRoutes(routes)` con `resources/vue/routes.json`.
3. `setupI18n(moduleTranslations)`: primero las traducciones del módulo, luego `app/lang/*.json` (ganan las de la aplicación) y `setLocale(document.documentElement.lang || 'en')`.
4. `createPinia()`, `createApp(App)`, `app.use(pinia)` y, si el módulo exporta un plugin con `install`, `app.use(modulePlugin)`.
5. `useUiStore(pinia).init()`: aplica el tema guardado y escucha el del sistema.
6. `await Promise.allSettled([auth.load(), options.load()])`. Las guardas y la primera página necesitan saber quién es y qué sitio pintar. Que falle una de las dos no impide arrancar.
7. `createAppRouter({ moduleRoutes })`.
8. `installGuards(router, { getSession, adminOnly, onDenied })`. `onDenied` enseña el aviso «Only an administrator can open that page.».
9. `router.afterEach`: `document.title = documentTitle(to, options.option)`.
10. `installInterceptors({ onUnauthorized })`: ante un 401 limpia la sesión y, si la ruta actual no es de invitado, va a `auth.login` con `redirect`.
11. `app.use(router)` y `app.mount('#app')`.

`module.js` carga el módulo de LaraPack con un glob, así que la aplicación compila aunque todavía no se haya generado ningún modelo:

```js
const found = Object.values(import.meta.glob('../index.js', { eager: true }))[0] ?? {}

export const moduleRoutes = Array.isArray(found.routes) ? found.routes : []
export const moduleTranslations = found.translations ?? {}
export const modulePlugin = found.default ?? null
```

`App.vue` monta `RouterView`, `ToastRegionComponent` y `ConfirmHostComponent` una sola vez. Ahí pintan sus avisos y confirmaciones tanto las pantallas propias como las generadas.

## El router

`router/index.js` exporta `SITE_PAGES`, `buildRoutes(moduleRoutes)`, `createAppRouter({ moduleRoutes, history })`, `formatTitle` y `documentTitle`.

| Ruta | Nombre | `meta` | Componente |
|---|---|---|---|
| `/`, `/privacy`, `/terms`, `/contact`, `/join` | `site.home`, `site.privacy`, … | `{ page }` | `SitePage.vue` (carga inmediata) |
| `/auth` | — | `{ guest: true }` | `AuthLayout.vue`; `''` redirige a `auth.login` |
| `/auth/login` | `auth.login` | `title: 'Sign in'` | `LoginView.vue` |
| `/auth/register` | `auth.register` | `title: 'Create account'` | `RegisterView.vue` |
| `/auth/forgot-password` | `auth.forgot-password` | `title: 'Forgot your password?'` | `ForgotPasswordView.vue` |
| `/auth/reset-password/:token/:email` | `auth.reset-password` | `title: 'Choose a new password'` | `ResetPasswordView.vue` |
| `/admin` | — | `{ auth: true }` | `AdminLayout.vue` |
| `/admin` (hija `''`) | `admin.dashboard` | `title: 'Home'` | `DashboardView.vue` |
| `/admin/profile` | `admin.profile` | `title: 'Profile'` | `ProfileView.vue` |
| `/admin/site` | `admin.site` | `{ admin: true, title: 'Site' }` | `SiteEditorView.vue` |
| hijas de `/admin` | las del módulo | las del módulo (`auth: true`, `title`) | las del módulo |
| `/:pathMatch(.*)*` | `not-found` | `title: 'Page not found'` | `NotFoundView.vue` |

- Los títulos son **getters** (`get title() { return t('Home') }`): se traducen al leerse, no al importar el archivo, que se carga antes de `setLocale()`.
- Salvo `SitePage`, todas las vistas se cargan con `import()` al entrar.
- `scrollBehavior` respeta la posición guardada, baja a `#hash` si lo hay y, si no, sube arriba.
- `documentTitle(to, option)` devuelve `<título> · <site_name>`. En una página del sitio el título sale de `theme.<page>.title`; en el resto, de la ruta más profunda que tenga `meta.title`. Si las dos partes son iguales, se escribe una sola.

## Las guardas

`router/guards.js` son funciones puras. Reciben la ruta de destino y la sesión, y miran **toda la cadena** `to.matched`: una hija hereda `auth` de `/admin`, y el detalle de un usuario hereda que su listado esté en `adminOnly`.

| Función | Devuelve |
|---|---|
| `requiresGuest(to)` | Alguna ruta de la cadena tiene `meta.guest === true`. |
| `requiresAuth(to)` | Alguna tiene `meta.auth === true`. |
| `requiresAdmin(to, adminOnly)` | Alguna tiene `meta.admin === true` o su `name` está en `adminOnly`. |
| `safeRedirect(value)` | El valor si empieza por `/` y no por `//` ni `/\`; si no, `null`. |
| `resolveNavigation(to, { authenticated, isAdmin, adminOnly })` | `{ redirect, reason }` según la tabla de abajo. |
| `installGuards(router, { getSession, adminOnly, onDenied })` | Registra el `beforeEach`. Llama a `onDenied` sólo con motivo `admin`. |

`resolveNavigation` decide en este orden:

| Caso | Redirige a | `reason` |
|---|---|---|
| Ruta de invitado y hay sesión | `{ name: 'admin.dashboard' }` | `guest` |
| Pide sesión o administrador y no hay sesión | `{ name: 'auth.login', query: { redirect: to.fullPath } }` | `auth` |
| Pide administrador y no lo es | `{ name: 'admin.dashboard' }` | `admin` |
| Cualquier otro | — | `null` |

::: warning Las guardas no son seguridad
Deciden qué pantallas se enseñan. Lo que protege los datos es el backend: políticas, `ManagedFilter` y el middleware `admin`.
:::

## El menú

`router/menu.js`:

- `readTitle(record)` lee `meta.title`, sea texto o función.
- `isMenuRoute(record)` acepta una ruta con `name`, `path` sin `:` y título.
- `buildMenu(moduleRoutes, { isAdmin, adminOnly, t })` devuelve **grupos**:

```js
[
    { id: 'main', label: null, items: [
        { id: 'admin.dashboard', label: 'Inicio', icon: 'home', to: { name: 'admin.dashboard' } },
        // rutas del módulo que no están en adminOnly
    ] },
    // sólo si isAdmin:
    { id: 'administration', label: 'Administración', items: [
        // rutas del módulo que están en adminOnly
        { id: 'admin.site', label: 'Sitio', icon: 'mdi:web', to: { name: 'admin.site' } },
        { id: 'log-viewer', label: 'Registros', icon: 'mdi:text-box-search-outline', href: '/log-viewer', external: true },
        { id: 'env-editor', label: 'Entorno', icon: 'mdi:tune-variant', href: '/env-editor', external: true },
    ] },
]
```

- Una entrada del módulo es `{ id: name, label, icon: meta.icon ?? 'box', to: { name } }`.
- `menuShortcuts(groups)` junta todas las entradas menos el inicio: son las tarjetas del dashboard.

## Los estados (Pinia)

### `stores/auth.js` (`app.auth`)

Estado: `session` (`{ user, authenticated, is_admin, verified, impersonating }`) y `loaded`. Computados: `user`, `authenticated`, `isAdmin`, `verified`, `impersonating`.

| Acción | Petición | Después |
|---|---|---|
| `load()` | GET `auth.get.auth` con `skipAuthHandling` | `normalizeSession(data)`; si falla, `clear()` |
| `login({ email, password, remember })` | GET cookie CSRF, POST `auth.login` | `load()` |
| `register(data)` | GET cookie CSRF, POST `auth.register` | `load()` |
| `logout()` | POST `auth.logout` con `skipAuthHandling` | `clear()` siempre |
| `forgotPassword({ email })` | POST `auth.forgot.password` | devuelve `data` |
| `resetPassword({ token, email, password, password_confirmation })` | POST `auth.reset.password` | devuelve `data` |
| `updatePassword({ old_password, password, password_confirmation })` | POST `auth.update.password` | devuelve `data` |
| `resendVerification()` | POST `auth.email.verification.notification` | devuelve `data` |
| `revertImpersonation()` | POST `auth.revert.impersonate` | `load()` |
| `setUser(next)` | — | mezcla `next` en el usuario de la sesión |
| `clear()` | — | sesión vacía |

`normalizeSession` sólo da la sesión por abierta si `user` es un objeto y `authenticated` no es `false`. Los nombres de ruta están en `AUTH_ROUTES`. El perfil (nombre, correo y foto) no está en este estado: lo hace `admin/ProfileView.vue`.

### `stores/options.js` (`app.options`)

Estado: `values` (clave → valor decodificado), `records` (clave → `{ id, name }`) y `loaded`.

| Función | Qué hace |
|---|---|
| `load()` | GET `api.laravel-options.option.index` con `paginate: 0`. No captura el error: lo absorbe `Promise.allSettled` en el arranque. |
| `option(path, fallback)` | `option('site_name')`, `option('theme.home.title')`. Primero busca la clave entera y, si no existe, entra en el JSON por puntos. |
| `save(key, value)` | Con `id`, PUT `api.laravel-options.option.update` con `{ option_id, value }`. Sin él, POST `api.laravel-options.option.create` con `{ key, name, value }`. Actualiza `records` y `values`. |

Sólo se decodifica un objeto o un arreglo JSON (`decodeValue`): un `site_name` `"2024"` sigue siendo texto. Un valor que no es texto se guarda serializado a JSON (`serializeValue`). También se exportan `decodeOptions`, `readOption` y `buildSaveRequest`.

### `stores/notifications.js` (`app.notifications`)

Estado: `unread`, `items` y `loading`. Constantes: `LATEST_LIMIT = 10` y `POLL_INTERVAL = 60_000`.

| Función | Petición |
|---|---|
| `fetchUnreadCount()` | GET `innoboxrr.notifications.index.unread.count` |
| `fetchLatest(limit = 10)` | GET `innoboxrr.notifications.index` con `limit` |
| `markAsRead(notification)` | POST `innoboxrr.notifications.mark.as.read` con `notificationId`. Devuelve la acción. |
| `markAllAsRead()` | POST `innoboxrr.notifications.mark.all.as.read` |
| `reset()` | — |

`startUnreadPolling(store, { interval, doc })` pide el contador al llamarse, cada `interval` y al volver a la pestaña. Devuelve la función que lo detiene. `resolveAction(action)` devuelve `{ type: 'router', to }` para una ruta interna, `{ type: 'location', href }` para `http(s)://…` y `null` para cualquier otra cosa. `notificationMessage` lee `data.message` o `data.title`.

### `stores/ui.js` (`app.ui`)

Estado: `themeChoice` (`'dark'`, `'light'` o `null`), `theme`, `isDark` y `sidebarOpen`. Acciones: `init()`, `toggleTheme()`, `openSidebar()`, `closeSidebar()` y `toggleSidebar()`. La elección se guarda en `localStorage.theme`. Sin elección no se escribe `data-theme`, y form-core sigue al sistema.

## Peticiones: `http.js`

| Export | Qué hace |
|---|---|
| `http` | La única copia de axios. El módulo de LaraPack llega a ella a través de `innoboxrr-http-request`, así que los interceptores cubren también sus peticiones. |
| `configureAxios(instance)` | Los valores por omisión del arranque. |
| `apiUrl(name, params)` | `route(name, params)`, pero **lanza** `Unknown backend route "x". Run php artisan route:json.` si la ruta no está en `routes.json`. Con `undefined`, axios pediría la página actual y el fallo sería silencioso. |
| `csrfCookieUrl()`, `requestCsrfCookie()` | `route('sanctum.csrf-cookie')` si existe; si no, `/sanctum/csrf-cookie`. |
| `createErrorHandler({ instance, onUnauthorized })` | Ante un **419** pide otra cookie CSRF y repite la petición una vez (`csrfRetried`). Ante un **401** llama a `onUnauthorized`, salvo que la petición lleve `skipAuthHandling: true`. |
| `installInterceptors({ instance, onUnauthorized })` | Registra el manejador. |
| `errorMessage(error, t)` | El texto para el usuario: sin respuesta, «Could not connect to the server.»; 429; 403 con el mensaje del backend salvo el genérico de Laravel; si no, `data.message` o uno genérico. |
| `validationErrors(error)` | Los errores `{ campo: [mensajes] }` de un 422, o `null`. |

```js
import { apiUrl, http } from '@app/http.js'

await http.post(apiUrl('api.app.user.update'), { user_id: 1, name: 'Ana' })

// Una petición que ya espera no tener sesión:
await http.get(apiUrl('auth.get.auth'), { skipAuthHandling: true })
```

## Formularios

`components/FormField.vue` es un campo con su etiqueta enlazada por `for` e `id`. Existe porque el `TextInputComponent` de form-elements no da `id` al control y su etiqueta no lo nombra para un lector de pantalla. Admite `v-model`, `label`, `name`, `type`, `autocomplete`, `validators` y `hint`; el resto de atributos va al `<input>`.

`components/useValidatedForm.js` valida con js-validator antes de enviar y coloca los errores de un 422 bajo cada campo:

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
        // tu petición; un 422 se pinta junto a cada campo
    }, {
        statusMessages: { 403: t('You are not allowed to do this.') },
    })
</script>
```

`useValidatedForm(submit, { statusMessages })` devuelve `{ form, busy, error, handleSubmit, resetErrors }`. `submit` recibe `{ setError }`. Ante un error que no es un 422, `error` toma `statusMessages[status]` o `errorMessage(error, t)`. Los mensajes del validador (`required`, `email`, `password_mismatch`, `password_missing`) pasan por `t()`.

## Dónde se cambia cada cosa

En Vue, estos ajustes están escritos en su archivo. En React viven en `config.js` ([Con React](/app-base/react)).

| Qué | Dónde |
|---|---|
| Rutas del módulo sólo para administradores | `config.js` → `adminOnly` (nombres de ruta) |
| Páginas del sitio | `router/index.js` → `SITE_PAGES`, y `admin/site-editor.js` → `DEFAULT_PAGES` |
| Entradas fijas del grupo «Administración» (Sitio, Registros, Entorno) | `router/menu.js` → `buildMenu` |
| Cada cuánto se consulta el contador de notificaciones | `stores/notifications.js` → `POLL_INTERVAL`; cuántas se listan, `LATEST_LIMIT` |
| Ruta del update del usuario y de la subida de la foto | `admin/ProfileView.vue` → `USER_UPDATE` y `UPLOAD` |
| Prefijo del administrador | `router/index.js` (`path: '/admin'`). El menú usa nombres de ruta. |
| A dónde va quien entra | `auth/LoginView.vue` |
| Aviso de ruta denegada | `main.js` → `onDenied` |
| Secciones del sitio | `site/sections/index.js` |
| Textos | `lang/es.json` |
| Estilos | `styles/app.css`, `styles/site.css` |

Las recetas completas están en [Personalizar y ampliar](/app-base/personalizar).

## Tests

Los tests de esta interfaz viven en el paquete `innoboxrr/laravel-setup`, en `tests/Frontend/vue`, y prueban directamente `stubs/app/vue/resources/vue/app`. **No se copian a tu aplicación.**

| Archivo | Qué prueba |
|---|---|
| `tests/auth-store.test.js` | Sesión, login, logout, volver de una suplantación |
| `tests/guards.test.js` | `resolveNavigation`, `safeRedirect` |
| `tests/menu.test.js` | `buildMenu`, `adminOnly`, `menuShortcuts` |
| `tests/notifications-bell.test.js` | Campana, contador, acciones |
| `tests/options-store.test.js` | Decodificar, leer por puntos, guardar |
| `tests/sections.test.js` | Las secciones y sus props |
| `tests/site-editor.test.js` | Borrador, JSON inválido, guardar |
| `tests/theme-manager.test.js` | Qué secciones se pintan y dónde |

```bash
cd tests/Frontend/vue
npm install
npx vitest run
```

- Vitest 3 con jsdom.
- `@app/` apunta a los stubs, y `resolve.dedupe` resuelve sus imports desde esta carpeta.
- `innoboxrr-form-elements` se sustituye por `support/form-elements.js`: el paquete entero arrastra TinyMCE, CodeMirror y vue-tel-input, que no arrancan en jsdom.

La CI del paquete corre esta suite y la de React en Node 22 antes de publicar.
