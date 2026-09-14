# Personalizar y ampliar

`resources/<ui>/app/` es tuyo desde que se instala: laravel-setup no lo vuelve a tocar. `resources/<ui>/index.js` y `resources/<ui>/src/` son de LaraPack y se regeneran. Todo lo de esta página se hace en tu parte o en `laraimport.json`.

## Añadir un modelo

Se declara en `laraimport.json`, junto al usuario, y se genera como en cualquier proyecto con LaraPack:

::: code-group

```bash [Vue]
php artisan larapack:validate laraimport.json --vue
php artisan larapack:import laraimport.json --vue
php artisan migrate
php artisan route:json
npm run build
```

```bash [React]
php artisan larapack:validate laraimport.json --react
php artisan larapack:import laraimport.json --react
php artisan migrate
php artisan route:json
npm run build
```

:::

- **Menú.** Su listado aparece solo en el menú del administrador al compilar. La interfaz carga el módulo con un glob y construye el menú desde sus rutas.
- **`route:json`.** Es obligatorio: sin él, `routes.json` no tiene los endpoints nuevos. Vue lo dice con «Unknown backend route».
- **Textos.** Los nombres del modelo y de sus campos salen en inglés hasta que los traduzcas en `lang/es.json` (ver «Cambiar los textos», abajo).

El contrato completo está en [El contrato: laraimport.json](/larapack/laraimport), y lo que se genera y dónde va tu código, en [Qué se genera](/larapack/que-se-genera). Paso a paso, en [Tu primer modelo](/empezar/primer-modelo).

## Decidir quién lo ve

Hay dos capas, y conviene decidirlas juntas:

| Capa | Dónde | Qué hace |
|---|---|---|
| Backend | La política del modelo y su `ManagedFilter` | **Protege los datos.** La política que genera LaraPack nace cerrada: sólo pasa un administrador. |
| Interfaz | `adminOnly` en `config.js` | **Decide qué se enseña**: el grupo del menú y la guarda de la ruta. |

**Sólo para administradores.** Deja la política como nace y añade la ruta a `adminOnly`, para que quien no administra no vea una entrada que le respondería 403:

::: code-group

```js [Vue]
// resources/vue/app/config.js — nombres de ruta
export const adminOnly = [
    'AdminUsers',
    'AdminProducts',
]
```

```js [React]
// resources/react/app/config.js — ids de ruta
export const adminOnly = ['AdminUsers', 'AdminProducts']
```

:::

**Para cualquier usuario con sesión.** No lo añadas a `adminOnly` y abre su política en `app/Policies/<Modelo>Policy.php`. Si cada uno sólo debe ver lo suyo, decídelo en `ManagedFilter::canView`. Ver [Rutas, inmutables, secretos y usuarios](/larapack/acciones).

**Un icono en el menú.** LaraPack no genera icono (el menú usa `box`). Añade `icon` a `meta` (Vue) o a `handle` (React) de la ruta de primer nivel, en `resources/<ui>/src/models/<modelo>/routes/index.js`. Es un archivo de LaraPack: con `--force` lo conserva porque su hash ya no coincide, pero `larapack:verify` lo informará como `customised`.

## Añadir una página al sitio

::: code-group

```js [Vue]
// 1. resources/vue/app/router/index.js — crea la ruta /about, nombre site.about
export const SITE_PAGES = ['home', 'privacy', 'terms', 'contact', 'join', 'about']

// 2. resources/vue/app/admin/site-editor.js — su pestaña en el editor
export const DEFAULT_PAGES = ['home', 'privacy', 'terms', 'contact', 'join', 'about']
```

```js [React]
// resources/react/app/config.js — ruta, nombre y pestaña del editor a la vez
export const sitePages = [
    { key: 'home', path: '/', name: 'site.home', label: 'Home' },
    { key: 'privacy', path: '/privacy', name: 'site.privacy', label: 'Privacy' },
    { key: 'terms', path: '/terms', name: 'site.terms', label: 'Terms' },
    { key: 'contact', path: '/contact', name: 'site.contact', label: 'Contact' },
    { key: 'join', path: '/join', name: 'site.join', label: 'Join' },
    { key: 'about', path: '/about', name: 'site.about', label: 'About' },
]
// y "About": "Nosotros" en resources/react/app/lang/es.json
```

:::

Después compila, entra en `/admin/site`, abre la pestaña nueva, añade secciones, dale título y guarda. Añade también el enlace en el `nav` de `HeaderOne` y en las columnas de `FooterOne`.

- En Vue, la ruta de una página es `/<key>` (salvo `home`, que es `/`).
- El editor conserva las páginas que la opción `theme` ya tuviera aunque no estén en la lista, pero **sin ruta no se pueden visitar**.
- Añadir la página a `SiteOptionsSeeder` sólo sirve para una base de datos sin `theme`: el seeder no toca una opción que ya existe.

## Añadir una sección

Una sección es un componente registrado bajo `<theme>/<group>/<name>`. Al registrarla aparece también en el selector del editor.

::: code-group

```vue [Vue]
<!-- resources/vue/app/site/sections/acme/section/StatsSection.vue -->
<template>
    <section class="site-section">
        <div class="site-container">
            <h2 v-if="filled(title)" class="site-title">{{ title }}</h2>
            <ul v-if="entries.length">
                <li v-for="(entry, index) in entries" :key="index">
                    <strong>{{ entry.value }}</strong> {{ entry.label }}
                </li>
            </ul>
        </div>
    </section>
</template>

<script setup>
    import { computed } from 'vue'
    import { asArray, asObject, asText, filled } from '../../props.js'

    // Las props llegan de un JSON escrito a mano: se declaran por nombre y se
    // normalizan. `display` y cualquier clave de más no deben acabar como
    // atributos del HTML.
    defineOptions({ inheritAttrs: false })

    const props = defineProps(['title', 'items'])

    const entries = computed(() => asArray(props.items)
        .map(asObject)
        .map((item) => ({ value: asText(item.value), label: asText(item.label) }))
        .filter((item) => item.value !== ''))
</script>
```

```jsx [React]
// resources/react/app/site/sections/acme/section/StatsSection.jsx
import { asArray, asObject, asText, SectionHeader } from '../../shared.jsx'

// En React cada sección recibe una sola prop, `props`, con el objeto del JSON.
export default function StatsSection({ props = {} }) {
    const entries = asArray(props.items)
        .map(asObject)
        .filter((item) => asText(item.value) !== '')

    return (
        <section className="site-section">
            <div className="site-container">
                <SectionHeader title={props.title} />

                {entries.length > 0 ? (
                    <ul>
                        {entries.map((entry, index) => (
                            <li key={index}>
                                <strong>{asText(entry.value)}</strong> {asText(entry.label)}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </section>
    )
}
```

:::

Y se registra:

::: code-group

```js [Vue]
// resources/vue/app/site/sections/index.js
import StatsSection from './acme/section/StatsSection.vue'

const sections = {
    // …las 13 de siempre
    'acme/section/StatsSection': StatsSection,
}
```

```js [React]
// resources/react/app/site/sections/index.js
import StatsSection from './acme/section/StatsSection.jsx'

export const sections = {
    // …las 13 de siempre
    'acme/section/StatsSection': StatsSection,
}
```

:::

En el JSON del sitio queda así:

```json
{ "theme": "acme", "group": "section", "name": "StatsSection", "props": { "display": true, "title": "En cifras", "items": [{ "value": "120", "label": "clientes" }] } }
```

- **Grupos con posición.** `header` va antes de `<main>` si está al principio de la página; `footer` y `cookie-consent` van después si están al final. Cualquier otro grupo es contenido.
- **Helpers.** Vue tiene `props.js` (`asArray`, `asObject`, `asText`, `filled`, `isTruthy`, `imageUrl`, `imageList`, `textList`, `initials`), `SiteLink.vue` y `social.js`. React tiene `shared.jsx` (`SmartLink`, `OptionalImage`, `Brand`, `SocialLinks`, `SectionHeader`, `Checklist`, `HeroCopy`…). Úsalos para enlaces e imágenes: filtran `javascript:` y no dejan huecos rotos.
- **Estilos.** Las clases `site-*` están en `styles/site.css`.
- **Tests.** Si cambias una sección, los tests de la interfaz del paquete no cubren tu copia.

## Cambiar el aspecto

Todo se pinta con las variables `--fe-*` de [form-core](/interfaz/form-core): el administrador, el acceso, el sitio y las tablas. Para cambiar el tema, redefínelas **al final** de `resources/<ui>/app/styles/app.css`, que se carga después de los estilos de form-core. Hazlo en los **tres** estados que usa form-core: si sólo cambias `:root`, el modo oscuro seguirá con los colores de form-core.

```css
/* Claro */
:root {
    --fe-primary: #0f766e;
    --fe-primary-hover: #115e59;
    --fe-primary-soft: #ccfbf1;
    --fe-primary-text: #ffffff;
    --fe-focus: #0f766e;
    --fe-radius: 10px;
    --fe-font: 'Inter', system-ui, sans-serif;
}

/* Oscuro por el sistema, salvo que se haya elegido claro */
@media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
        --fe-primary: #5eead4;
        --fe-primary-hover: #99f6e4;
        --fe-primary-soft: #134e4a;
        --fe-primary-text: #042f2e;
        --fe-focus: #5eead4;
    }
}

/* Oscuro elegido con el botón */
:root[data-theme='dark'] {
    --fe-primary: #5eead4;
    --fe-primary-hover: #99f6e4;
    --fe-primary-soft: #134e4a;
    --fe-primary-text: #042f2e;
    --fe-focus: #5eead4;
}
```

| Grupo | Variables |
|---|---|
| Fondos y bordes | `--fe-bg`, `--fe-surface`, `--fe-surface-hover`, `--fe-surface-raised`, `--fe-surface-sunk`, `--fe-border`, `--fe-border-strong` |
| Texto | `--fe-text`, `--fe-text-muted`, `--fe-text-subtle`, `--fe-text-inverse`, `--fe-text-xs` … `--fe-text-xl` |
| Color | `--fe-primary`, `--fe-primary-hover`, `--fe-primary-soft`, `--fe-primary-text`, `--fe-danger`, `--fe-danger-hover`, `--fe-danger-soft`, `--fe-danger-text`, `--fe-success`, `--fe-success-soft`, `--fe-warning`, `--fe-warning-soft`, `--fe-info`, `--fe-info-soft`, `--fe-focus` |
| Forma | `--fe-font`, `--fe-font-mono`, `--fe-radius`, `--fe-radius-sm`, `--fe-radius-lg`, `--fe-radius-full`, `--fe-shadow`, `--fe-shadow-sm`, `--fe-shadow-lg`, `--fe-space-1` … `--fe-space-6` |
| Tamaños | `--fe-density`, `--fe-control-height`, `--fe-control-padding-x`, `--fe-sidebar-width`, `--fe-dialog-width`, `--fe-drawer-width`, `--fe-command-width`, `--fe-table-max-height` |

**Iconos.** Los componentes piden iconos por nombre (`home`, `box`, `edit`…) o por nombre de Iconify (`mdi:web`). Cambia el mapa con `setIcons`, que se mezcla con el actual, antes de montar la aplicación, por ejemplo en `main.js` o `main.jsx`:

```js
import { setIcons } from 'innoboxrr-form-core'

setIcons({ box: 'mdi:package-variant-closed' })
```

El módulo de LaraPack puede traer su propio `src/theme.js`, que la interfaz importa si existe.

## Cambiar los textos

- Los textos se escriben en inglés con `t('English key')` y se traducen en `resources/<ui>/app/lang/es.json`. Cambia el valor, no la clave.
- Los marcadores van con dos puntos: `"Hello, :name": "Hola, :name"`.
- Los nombres de modelos y campos generados se traducen en ese mismo archivo: las traducciones de la aplicación se cargan después de las del módulo y ganan.
- El idioma es el de `APP_LOCALE`. Para otro idioma, añade `lang/<locale>.json`.
- Los mensajes que vienen del backend (validación, laravel-auth) son de Laravel y sus paquetes, no de estos archivos.

## Otros ajustes

| Qué | Vue | React |
|---|---|---|
| Rutas sólo para administradores | `config.js` → `adminOnly` (nombres) | `config.js` → `adminOnly` (ids) |
| Páginas del sitio | `router/index.js` → `SITE_PAGES` y `admin/site-editor.js` → `DEFAULT_PAGES` | `config.js` → `sitePages` |
| Herramientas del grupo «Administración» | `router/menu.js` → `buildMenu` | `config.js` → `adminTools` |
| Intervalo de notificaciones | `stores/notifications.js` → `POLL_INTERVAL` | `config.js` → `notificationsInterval` |
| Update del usuario | `admin/ProfileView.vue` → `USER_UPDATE` | `config.js` → `userUpdateRoute` |
| Prefijo del administrador | `router/index.js` | `config.js` → `adminBase`, más el árbol y los `/admin` escritos a mano |
| Adónde lleva el login | `auth/LoginView.vue` | `auth/LoginView.jsx` |
| Quién administra | `isAdmin()` en `app/Models/User.php` | Igual |
| Registro abierto o cerrado | `allow-registration` en `config/laravel-auth.php` | Igual |

## Diferencias entre Vue y React

Las dos interfaces cumplen el mismo [contrato](/app-base/contrato), pero no son idénticas. Si mantienes las dos, o cambias de una a otra, esto es lo que difiere en el código de laravel-setup 7.0.1:

| Tema | Vue | React |
|---|---|---|
| Ajustes | `config.js` sólo exporta `adminOnly`; lo demás está en su archivo | `config.js` exporta seis ajustes |
| `adminOnly` | Nombres de ruta | Ids de ruta |
| `buildMenu` | Devuelve una lista de grupos | Devuelve `{ main, admin }` |
| Guardas | Un `beforeEach` | Un `loader` en cada ruta |
| Pantalla que falla al cargar | Sin pantalla de error | `ErrorView` (`errorElement`) |
| Petición que no debe redirigir en un 401 | `skipAuthHandling: true` | `skipAuthRedirect: true` |
| Ruta que no está en `routes.json` | `apiUrl` lanza «Unknown backend route» | `route()` directo, sin esa comprobación |
| Arranque | `Promise.allSettled`; interceptores después de cargar la sesión | `Promise.all` (cada estado captura); interceptores antes |
| CSS | form-core, `app.css` y `site.css` desde `main.js` | form-core, `form-elements.css` y `app.css` desde `main.jsx`; `site.css` desde `SitePage` |
| Update de una opción | `{ option_id, value }` | `{ option_id, name, key, value }` |
| Perfil | Las llamadas están en `ProfileView.vue` | En el estado: `updateProfile`, `updateAvatar`, `removeAvatar` |
| Campos | `FormField.vue` propio | `TextInputComponent`, con botón de mostrar contraseña |
| Títulos de acceso | «Sign in», «Create account», «Sign out» | «Log in», «Create an account», «Log out» |
| Login sin sesión conservada | Mensaje en la pantalla | Va a `/admin` y la guarda devuelve al login |
| Enlace de login a registro | Conserva `?redirect=` | No lo conserva |
| Olvidé / restablecer contraseña | Sin pedir la cookie CSRF antes | Pide la cookie CSRF antes |
| Correo al restablecer | Sólo lectura | Editable |
| Cerrar sesión | Va a `/auth/login` | Va a `/` y vacía las notificaciones |
| Volver de una suplantación | Va a `/admin` o al login según la sesión | Va a `/admin` |
| Reenviar verificación ya confirmada | Aviso y recarga de sesión | Recarga de sesión sin aviso |
| Inicio del administrador | Primer nombre; sin entradas, tarjeta de perfil | Nombre completo; sin entradas, un mensaje |
| Campana: error al cargar | Mensaje dentro del panel | Toast |
| Campana: «Marcar todas» | Sólo si hay no leídas | Desactivado con el contador a 0 |
| Etiqueta de la región de avisos | «Notifications» | «Alerts» |
| Cabecera del sitio | Sin botón de modo oscuro | Con botón de modo oscuro |
| FAQ | Acordeón (`<details>`) | Todas abiertas (`<dl>`) |
| Logos de socios con enlace externo | Otra pestaña | Misma pestaña |
| Enlaces de redes sociales | Filtra `javascript:` y similares | No los filtra |
| Editor: quitar sección | Inmediato | Pide confirmación |
| Editor: nombre de pestaña | Título de la página o clave | Etiqueta de `sitePages` o clave |
| `HtmlContent` vacío | Sección vacía | Nada |
| Planes sin frecuencias | Primer precio del objeto | Sólo un precio escrito como texto |
| Props de una sección | Props del componente (`defineProps`) | Una sola prop `props` |
| `resolve.dedupe` de Vite | Incluye los paquetes `innoboxrr-*` | `react`, `react-dom`, `react-router-dom`, `zustand`, `axios` |
