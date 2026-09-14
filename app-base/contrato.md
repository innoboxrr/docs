# El contrato de las interfaces

`app:setup` monta la interfaz en Vue o en React, y las dos son la misma aplicación: mismas rutas, mismas pantallas, mismo JSON del sitio y mismas llamadas al backend. Este contrato es lo que cumplen ambas. Si una cambia algo de aquí, la otra cambia igual.

La fuente es `docs/shell-contract.md` del paquete. Esta página lo cuenta entero y añade, al final, dónde el código se aparta de él.

## Dónde vive cada cosa

```text
stubs/app/common/              backend, igual para las dos
stubs/app/<ui>/                se copia sobre la raíz de la aplicación
  package.json
  vite.config.js
  resources/views/app.blade.php
  resources/<ui>/app/**        la aplicación base
  resources/<ui>/routes.json   provisional; php artisan route:json lo reescribe
resources/<ui>/index.js        el módulo de LaraPack (lo genera larapack:import)
resources/<ui>/src/**          sus modelos: usuarios y lo que se genere después
tests/Frontend/<ui>/           tests de la interfaz, fuera de lo que se copia
```

- **`resources/<ui>/app/**`** es de laravel-setup cuando se copia y tuyo después.
- **`resources/<ui>/index.js` y `resources/<ui>/src/**`** son de LaraPack. La aplicación base los importa y **nunca los edita**.

## Arranque

1. **axios.** `axios.defaults` con `withCredentials`, `withXSRFToken`, `Accept: application/json` y `X-Requested-With: XMLHttpRequest`. Una sola copia de axios.
2. **Rutas del backend.** `setRoutes(routes.json)` de `innoboxrr-route-resolver`. Ninguna URL del backend se escribe a mano: todas salen de `route(nombre)`.
3. **Textos.** `addTranslations` con las del módulo de LaraPack y las de `resources/<ui>/app/lang/*.json`, en ese orden, y `setLocale(document.documentElement.lang)`. Los textos de la aplicación base van con `t('English key')` y su traducción en `lang/es.json`.
4. **Estilos.** `innoboxrr-form-core/styles` y el `src/theme.js` del módulo, si existe.
5. **Sesión y opciones.** Se cargan (`auth` y `options`) antes de montar el router.
6. **Avisos.** `ToastRegion` y `ConfirmHost` se montan una vez, en la raíz.

## Rutas del front

| Ruta | Nombre | Acceso | Pantalla |
|---|---|---|---|
| `/` | `site.home` | Todos | Página `home` del sitio |
| `/privacy` | `site.privacy` | Todos | Página `privacy` |
| `/terms` | `site.terms` | Todos | Página `terms` |
| `/contact` | `site.contact` | Todos | Página `contact` |
| `/join` | `site.join` | Todos | Página `join` |
| `/auth/login` | `auth.login` | Invitado | Iniciar sesión; respeta `?redirect=` |
| `/auth/register` | `auth.register` | Invitado | Registro |
| `/auth/forgot-password` | `auth.forgot-password` | Invitado | Pedir el enlace |
| `/auth/reset-password/:token/:email` | `auth.reset-password` | Invitado | Contraseña nueva; es la URL del correo de laravel-auth |
| `/admin` | `admin.dashboard` | Sesión | Inicio del administrador |
| `/admin/profile` | `admin.profile` | Sesión | Perfil: nombre, correo, foto y contraseña |
| `/admin/site` | `admin.site` | Administrador | Editor del sitio |
| `/admin/<modelo>/…` | Las del módulo | Sesión, y administrador si está en `adminOnly` | Las rutas que exporta el módulo de LaraPack, hijas de `/admin` |
| Cualquier otra | `not-found` | Todos | 404 |

Los nombres de ruta del front no chocan con los del backend porque viven en otro registro: el router del front frente a `routes.json`.

### Guardas

| Marca | Vue | React | Efecto |
|---|---|---|---|
| Invitado | `meta.guest` | `handle.guest` | Quien ya tiene sesión va a `/admin`. |
| Sesión | `meta.auth` | `handle.auth` | Quien no la tiene va a `/auth/login?redirect=<ruta>`. Las rutas del módulo traen `auth: true`. |
| Administrador | `meta.admin`, o el nombre en `adminOnly` | `handle.admin`, o el id en `adminOnly` | Exige `is_admin`; sin él, a `/admin` con un aviso. |

- Las guardas miran toda la cadena de rutas: una hija hereda lo que exige su padre.
- `?redirect=` sólo acepta rutas internas: empiezan por `/` y no por `//` ni `/\`.

### `resources/<ui>/app/config.js`

Exporta `adminOnly`: los nombres (Vue) o ids (React) de las rutas del módulo que sólo ve un administrador. Por omisión, la de usuarios (`AdminUsers`).

## El menú del administrador

Se construye, no se escribe. Cada ruta de primer nivel del módulo con título (`meta.title` / `handle.title`) y sin parámetros es una entrada. Las de `adminOnly` sólo se muestran a un administrador. Además:

- **Inicio** (`admin.dashboard`), siempre primero.
- **Grupo «Administración»**, sólo para administradores: las rutas de `adminOnly`, «Sitio» (`admin.site`), «Registros» (`/log-viewer`, en otra pestaña) y «Entorno» (`/env-editor`, en otra pestaña).

Un modelo que se genere después aparece solo en el menú al compilar.

## Estado

### auth

- **`load()`.** GET `route('auth.get.auth')` → `{ user, authenticated, is_admin, verified, impersonating }`. `verified` es `true` para un usuario que no implementa `MustVerifyEmail` (laravel-auth 6.0.2): el aviso de verificación sólo sale cuando de verdad hay un correo que verificar.
- **`login({ email, password, remember })`.** Primero GET `/sanctum/csrf-cookie` (`route('sanctum.csrf-cookie')` si está en `routes.json`), luego el POST de `auth.login`, luego `load()`.
- **Las demás.** `register`, `logout`, `forgotPassword`, `resetPassword`, `updatePassword`, `resendVerification` y `revertImpersonation` usan las rutas de laravel-auth 6, con nombres con punto:

| Acción | Ruta |
|---|---|
| `register` | `auth.register` |
| `logout` | `auth.logout` |
| `forgotPassword` | `auth.forgot.password` |
| `resetPassword` | `auth.reset.password` |
| `updatePassword` | `auth.update.password` |
| `resendVerification` | `auth.email.verification.notification` |
| `revertImpersonation` | `auth.revert.impersonate` |

- **`revertImpersonation()`.** POST de `auth.revert.impersonate` y después `load()`. laravel-auth 6.1 ya no acepta GET, que otro sitio podía disparar con un `<img>`. Pasa por el token CSRF como cualquier otro POST.
- **`?redirect=`.** Sólo acepta rutas internas.
- **Errores.** Un 401 fuera de `load()` limpia la sesión y manda al login. Un 419 pide otra vez la cookie CSRF y repite la petición una vez.

### options

- **`load()`.** GET `route('api.laravel-options.option.index', { paginate: 0 })`, que es público. Guarda `key → value` y el `id` de cada opción. Un `value` que es un objeto o un arreglo JSON se guarda decodificado; cualquier otro texto se queda como texto (un `site_name` `"2024"` no se vuelve número), igual que `Option::value()` en el backend.
- **`option(path, default)`.** `option('site_name')` u `option('theme.home')`, que entra en el JSON por puntos.
- **`save(key, value)`.** Llama al update de laravel-options (sólo administrador) con `option_id`, `name`, `key` y el `value`, serializado a JSON si no es texto. Si la opción todavía no existe, llama a su create. Después actualiza el estado.

### notifications (laravel-notifications 2.1)

- **Contador.** Las no leídas, al montar el administrador, cada 60 s y al volver a la pestaña.
- **Lista.** Las últimas, al abrir la campana.
- **Marcar.** Marcar una como leída navega a `data.action`: una ruta interna con el router, una URL absoluta con `location`. También se pueden marcar todas.
- **Texto.** `data.message` se pinta como texto, nunca como HTML.

## El administrador

Layout con `fe-shell`: cabecera (nombre del sitio; botón del menú en móvil, con un fondo que lo cierra; campana; modo oscuro; menú de usuario) y barra lateral con el menú.

- **Aviso de suplantación**, cuando `impersonating`: «Estás viendo la cuenta de …» y «Volver a mi cuenta».
- **Aviso de verificación**, cuando `verified === false`: reenviar el correo.
- **Menú de usuario:** Perfil y Cerrar sesión.
- **Modo oscuro:** `data-theme` en `<html>`, recordado en `localStorage`. Sin elección, el del sistema.
- **Inicio:** saludo y una tarjeta por entrada del menú.
- **Perfil.**
  - Nombre y correo con el `update` del usuario generado: `api.app.user.update`, campos `user_id`, `name` y `email`.
  - Foto subida con laravel-uploads (`lu.upload.file`, campo `file`) y guardada como meta `avatar` con el mismo update, usando el `uri` relativo de la subida. Quitarla envía `avatar: ''`.
  - Contraseña con el `update-password` de laravel-auth.
- **Editor del sitio** (ver abajo).

Detalle en [El administrador](/app-base/administrador) y [Acceso y usuarios](/app-base/acceso).

## El sitio

Las páginas se pintan desde la opción `theme`, que siembra `SiteOptionsSeeder`. Es el formato del theme-manager de siempre, así que el contenido de una aplicación antigua se sigue viendo:

```json
{
    "home": {
        "title": "Inicio",
        "sections": [
            { "theme": "legacy", "group": "hero", "name": "HeroOne", "props": { "display": true, "title": "..." } }
        ]
    },
    "privacy": { "title": "...", "sections": [] },
    "terms": { "title": "...", "sections": [] },
    "contact": { "title": "...", "sections": [] },
    "join": { "title": "...", "sections": [] }
}
```

- **Registro.** Cada sección se busca por `<theme>/<group>/<name>`. Una que no existe no se pinta y avisa en consola.
- **`display`.** Una sección con `props.display` en `false` o `"false"` no se pinta; sin la clave, sí.
- **Título.** El de la pestaña es `<título de la página> · <site_name>`.
- **Imágenes.** Toda imagen es opcional: sin ella la sección se ve bien, sin huecos rotos.
- **Estilos.** Salen de las variables de form-core (`--fe-*`), así que el sitio tiene modo oscuro. Sin Tailwind, sin Headless UI, sin Heroicons: los iconos son el `Icon` de form-elements.
- **Enlaces.** Uno que empieza por `/` navega con el router; cualquier otro es un enlace normal.

### Las secciones y sus props

| Sección | Props |
|---|---|
| `legacy/header/HeaderOne` | `logo`, `nav: [{ label, link }]`, `facebook`, `twitter`, `instagram`, `youtube`, `whatsapp`, `linkedin`, `tiktok`. Muestra «Entrar» o «Administrador» según la sesión. |
| `legacy/hero/HeroOne` | `badge`, `badge_value`, `badge_link`, `title`, `message`, `primary_button_text`, `primary_button_link`, `secondary_button_text`, `secondary_button_link`, `videos: [url]` (uno al azar) |
| `legacy/hero/HeroTwo` | Las de HeroOne sin `videos`, más `badge_value_link`, `video`, `display_play_button`, `play_button_text`, `imgs_1`, `imgs_2`, `imgs_3: [url]` |
| `legacy/hero/HeroThree` | Las de HeroOne sin `videos` |
| `legacy/section/MissionSection` | `title`, `subtitle`, `message`, `button_text`, `button_link`, `images: [url]` (hasta 4) |
| `legacy/section/JoinSection` | `title`, `subtitle`, `image`, `features: [texto]`, `button_text`, `button_link` |
| `legacy/section/FaqSection` | `title`, `subtitle`, `items: [{ question, answer }]` |
| `legacy/section/PartnersSection` | `title`, `items: [{ name, logo, link }]` |
| `legacy/section/TestimonialsSection` | `title`, `subtitle`, `feature: { body, author: { name, handle, image } }`, `items: [{ body, author: { name, handle, image } }]` |
| `legacy/section/PlansSection` | `title`, `subtitle`, `frequencies: [{ value, label, price_suffix }]`, `tiers: [{ id, name, href, description, price: { <frecuencia>: texto }, features: [texto], most_popular }]` |
| `legacy/section/HtmlContent` | `content`: HTML que escribe el administrador |
| `legacy/footer/FooterOne` | `logo`, `description`, `cols: [{ title, items: [{ name, link }] }]`, `newsletter: { title, subtitle, button_text, button_link }`, `social_links: { facebook, instagram, twitter, github, youtube, linkedin, tiktok, whatsapp }` |
| `legacy/cookie-consent/CookieConsentOne` | `message`, `accept_text`, `reject_text`, `policy_link`. Guarda la decisión en la cookie `cookie_consent` (`accepted` o `rejected`) y no vuelve a salir. |

Cada prop, con su tipo y su comportamiento, en [El sitio y su editor](/app-base/sitio).

### El editor del sitio

`/admin/site`, sólo administrador:

- **General:** `site_name` y `site_description`.
- **Páginas:** una pestaña por página. En cada una, sus secciones en orden: activar o desactivar (`display`), subir, bajar, quitar y añadir una del registro.
- **Props:** las de cada sección, en un editor JSON (CodeMirror, `json`). Un JSON inválido se marca y no deja guardar.
- **«Ver página»** abre la página en otra pestaña.
- **Guardar** escribe la opción `theme` con `options.save` y avisa con un toast. Un 422 enseña el error.

## Dónde el código se aparta del contrato

En laravel-setup 7.0.1, el contrato no recoge estos puntos:

- **Update de opciones en Vue.** Vue envía sólo `{ option_id, value }` y React envía los cuatro campos. Funciona porque en laravel-options `key` es `sometimes` y `name` es `nullable`.
- **Ajustes.** El contrato sólo nombra `adminOnly`. React exporta además `adminBase`, `userUpdateRoute`, `adminTools`, `notificationsInterval` y `sitePages` desde `config.js`; Vue tiene esos valores escritos en `router/index.js`, `router/menu.js`, `admin/ProfileView.vue` y `stores/notifications.js`.
- **Diferencias de comportamiento.** Pantalla de error en React, claves de texto distintas («Sign in» / «Log in»), el nombre de la opción que evita la redirección en un 401 (`skipAuthHandling` / `skipAuthRedirect`) y otras. Están en [Personalizar y ampliar](/app-base/personalizar).
- **Lo que no está conectado.** Login social, empezar una suplantación, auditoría y gestor de archivos S3 no tienen interfaz. Ver [Qué trae](/app-base/).
