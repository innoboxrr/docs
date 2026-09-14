# Customize and extend

`resources/<ui>/app/` is yours once installed: laravel-setup never touches it again. `resources/<ui>/index.js` and `resources/<ui>/src/` belong to LaraPack and are regenerated. Everything on this page happens in your part or in `laraimport.json`.

## Add a model

Declare it in `laraimport.json`, next to the user, and generate it as in any LaraPack project:

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

- **Menu.** Its list shows up in the admin menu on its own at build time. The interface loads the module with a glob and builds the menu from its routes.
- **`route:json`.** Required: without it, `routes.json` lacks the new endpoints. Vue reports it as "Unknown backend route".
- **Labels.** The model and field names show in English until you translate them in `lang/es.json` (see "Change the strings" below).

The full contract is in [The contract: laraimport.json](/en/larapack/laraimport), and what is generated and where your code goes, in [What is generated](/en/larapack/generated-code). Step by step: [Your first model](/en/getting-started/first-model).

## Decide who sees it

There are two layers, and they are best decided together:

| Layer | Where | What it does |
|---|---|---|
| Backend | The model's policy and its `ManagedFilter` | **Protects the data.** The policy LaraPack generates is closed by default: only an admin passes. |
| Interface | `adminOnly` in `config.js` | **Decides what is shown**: the menu group and the route guard. |

**Admins only.** Leave the policy as generated and add the route to `adminOnly`, so non-admins do not see an entry that would answer them 403:

::: code-group

```js [Vue]
// resources/vue/app/config.js — route names
export const adminOnly = [
    'AdminUsers',
    'AdminProducts',
]
```

```js [React]
// resources/react/app/config.js — route ids
export const adminOnly = ['AdminUsers', 'AdminProducts']
```

:::

**Any signed-in user.** Leave it out of `adminOnly` and open its policy in `app/Policies/<Model>Policy.php`. If each user should only see their own records, decide that in `ManagedFilter::canView`. See [Routes, immutables, secrets and users](/en/larapack/actions).

**A menu icon.** LaraPack generates no icon (the menu uses `box`). Add `icon` to `meta` (Vue) or `handle` (React) on the first-level route in `resources/<ui>/src/models/<model>/routes/index.js`. That is a LaraPack file: `--force` keeps it because its hash no longer matches, but `larapack:verify` will report it as `customised`.

## Add a site page

::: code-group

```js [Vue]
// 1. resources/vue/app/router/index.js — creates the /about route, named site.about
export const SITE_PAGES = ['home', 'privacy', 'terms', 'contact', 'join', 'about']

// 2. resources/vue/app/admin/site-editor.js — its tab in the editor
export const DEFAULT_PAGES = ['home', 'privacy', 'terms', 'contact', 'join', 'about']
```

```js [React]
// resources/react/app/config.js — route, name and editor tab at once
export const sitePages = [
    { key: 'home', path: '/', name: 'site.home', label: 'Home' },
    { key: 'privacy', path: '/privacy', name: 'site.privacy', label: 'Privacy' },
    { key: 'terms', path: '/terms', name: 'site.terms', label: 'Terms' },
    { key: 'contact', path: '/contact', name: 'site.contact', label: 'Contact' },
    { key: 'join', path: '/join', name: 'site.join', label: 'Join' },
    { key: 'about', path: '/about', name: 'site.about', label: 'About' },
]
// and "About": "Nosotros" in resources/react/app/lang/es.json
```

:::

Then build, open `/admin/site`, open the new tab, add sections, give it a title and save. Also add the link to `HeaderOne`'s `nav` and to `FooterOne`'s columns.

- In Vue, a page's path is `/<key>` (except `home`, which is `/`).
- The editor keeps pages the `theme` option already had even if they are not in the list, but **without a route they cannot be visited**.
- Adding the page to `SiteOptionsSeeder` only helps a database with no `theme`: the seeder never touches an existing option.

## Add a section

A section is a component registered under `<theme>/<group>/<name>`. Registering it also makes it available in the editor's select.

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

    // Props come from hand-written JSON: declare them by name and normalize them.
    // `display` and any extra key must not end up as HTML attributes.
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

// In React every section receives a single prop, `props`, with the JSON object.
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

Then register it:

::: code-group

```js [Vue]
// resources/vue/app/site/sections/index.js
import StatsSection from './acme/section/StatsSection.vue'

const sections = {
    // …the usual 13
    'acme/section/StatsSection': StatsSection,
}
```

```js [React]
// resources/react/app/site/sections/index.js
import StatsSection from './acme/section/StatsSection.jsx'

export const sections = {
    // …the usual 13
    'acme/section/StatsSection': StatsSection,
}
```

:::

In the site JSON it looks like this:

```json
{ "theme": "acme", "group": "section", "name": "StatsSection", "props": { "display": true, "title": "In numbers", "items": [{ "value": "120", "label": "customers" }] } }
```

- **Positioned groups.** `header` goes before `<main>` when it is at the start of the page; `footer` and `cookie-consent` go after it when they are at the end. Any other group is content.
- **Helpers.** Vue has `props.js` (`asArray`, `asObject`, `asText`, `filled`, `isTruthy`, `imageUrl`, `imageList`, `textList`, `initials`), `SiteLink.vue` and `social.js`. React has `shared.jsx` (`SmartLink`, `OptionalImage`, `Brand`, `SocialLinks`, `SectionHeader`, `Checklist`, `HeroCopy`…). Use them for links and images: they filter `javascript:` and leave no broken gaps.
- **Styles.** The `site-*` classes are in `styles/site.css`.
- **Tests.** If you change a section, the package's interface tests do not cover your copy.

## Change the look

Everything is painted with [form-core](/en/ui/form-core)'s `--fe-*` variables: the admin panel, the authentication screens, the site and the tables. To retheme, redefine them **at the end** of `resources/<ui>/app/styles/app.css`, which loads after form-core's styles. Do it for the **three** states form-core uses: if you only change `:root`, dark mode keeps form-core's colors.

```css
/* Light */
:root {
    --fe-primary: #0f766e;
    --fe-primary-hover: #115e59;
    --fe-primary-soft: #ccfbf1;
    --fe-primary-text: #ffffff;
    --fe-focus: #0f766e;
    --fe-radius: 10px;
    --fe-font: 'Inter', system-ui, sans-serif;
}

/* Dark from the system, unless light was chosen */
@media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
        --fe-primary: #5eead4;
        --fe-primary-hover: #99f6e4;
        --fe-primary-soft: #134e4a;
        --fe-primary-text: #042f2e;
        --fe-focus: #5eead4;
    }
}

/* Dark chosen with the button */
:root[data-theme='dark'] {
    --fe-primary: #5eead4;
    --fe-primary-hover: #99f6e4;
    --fe-primary-soft: #134e4a;
    --fe-primary-text: #042f2e;
    --fe-focus: #5eead4;
}
```

| Group | Variables |
|---|---|
| Backgrounds and borders | `--fe-bg`, `--fe-surface`, `--fe-surface-hover`, `--fe-surface-raised`, `--fe-surface-sunk`, `--fe-border`, `--fe-border-strong` |
| Text | `--fe-text`, `--fe-text-muted`, `--fe-text-subtle`, `--fe-text-inverse`, `--fe-text-xs` … `--fe-text-xl` |
| Color | `--fe-primary`, `--fe-primary-hover`, `--fe-primary-soft`, `--fe-primary-text`, `--fe-danger`, `--fe-danger-hover`, `--fe-danger-soft`, `--fe-danger-text`, `--fe-success`, `--fe-success-soft`, `--fe-warning`, `--fe-warning-soft`, `--fe-info`, `--fe-info-soft`, `--fe-focus` |
| Shape | `--fe-font`, `--fe-font-mono`, `--fe-radius`, `--fe-radius-sm`, `--fe-radius-lg`, `--fe-radius-full`, `--fe-shadow`, `--fe-shadow-sm`, `--fe-shadow-lg`, `--fe-space-1` … `--fe-space-6` |
| Sizes | `--fe-density`, `--fe-control-height`, `--fe-control-padding-x`, `--fe-sidebar-width`, `--fe-dialog-width`, `--fe-drawer-width`, `--fe-command-width`, `--fe-table-max-height` |

**Icons.** Components ask for icons by name (`home`, `box`, `edit`…) or by Iconify name (`mdi:web`). Change the map with `setIcons`, which merges into the current map, before mounting the application, for example in `main.js` or `main.jsx`:

```js
import { setIcons } from 'innoboxrr-form-core'

setIcons({ box: 'mdi:package-variant-closed' })
```

The LaraPack module can ship its own `src/theme.js`, which the interface imports if it exists.

## Change the strings

- Strings are written in English with `t('English key')` and translated in `resources/<ui>/app/lang/es.json`. Change the value, not the key.
- Placeholders use a colon: `"Hello, :name": "Hola, :name"`.
- Generated model and field names are translated in that same file: the application's translations load after the module's and win.
- The language is `APP_LOCALE`'s. For another language, add `lang/<locale>.json`.
- Messages from the backend (validation, laravel-auth) come from Laravel and its packages, not from these files.

## Other settings

| What | Vue | React |
|---|---|---|
| Admin-only routes | `config.js` → `adminOnly` (names) | `config.js` → `adminOnly` (ids) |
| Site pages | `router/index.js` → `SITE_PAGES` and `admin/site-editor.js` → `DEFAULT_PAGES` | `config.js` → `sitePages` |
| "Administration" group tools | `router/menu.js` → `buildMenu` | `config.js` → `adminTools` |
| Notifications interval | `stores/notifications.js` → `POLL_INTERVAL` | `config.js` → `notificationsInterval` |
| User update | `admin/ProfileView.vue` → `USER_UPDATE` | `config.js` → `userUpdateRoute` |
| Admin prefix | `router/index.js` | `config.js` → `adminBase`, plus the tree and the hard-coded `/admin` |
| Where a login lands | `auth/LoginView.vue` | `auth/LoginView.jsx` |
| Who administers | `isAdmin()` in `app/Models/User.php` | The same |
| Registration open or closed | `allow-registration` in `config/laravel-auth.php` | The same |

## Vue and React differences

Both interfaces honor the same [contract](/en/app-base/contract), but they are not identical. If you maintain both, or move from one to the other, this is what differs in laravel-setup 7.0.1's code:

| Topic | Vue | React |
|---|---|---|
| Settings | `config.js` only exports `adminOnly`; the rest lives in its own file | `config.js` exports six settings |
| `adminOnly` | Route names | Route ids |
| `buildMenu` | Returns a list of groups | Returns `{ main, admin }` |
| Guards | One `beforeEach` | A `loader` on every route |
| A screen that fails to load | No error screen | `ErrorView` (`errorElement`) |
| A request that must not redirect on 401 | `skipAuthHandling: true` | `skipAuthRedirect: true` |
| A route missing from `routes.json` | `apiUrl` throws "Unknown backend route" | `route()` directly, without that check |
| Boot | `Promise.allSettled`; interceptors after loading the session | `Promise.all` (each store catches); interceptors before |
| CSS | form-core, `app.css` and `site.css` from `main.js` | form-core, `form-elements.css` and `app.css` from `main.jsx`; `site.css` from `SitePage` |
| Option update | `{ option_id, value }` | `{ option_id, name, key, value }` |
| Profile | The calls are in `ProfileView.vue` | In the store: `updateProfile`, `updateAvatar`, `removeAvatar` |
| Fields | Its own `FormField.vue` | `TextInputComponent`, with a show-password button |
| Authentication titles | "Sign in", "Create account", "Sign out" | "Log in", "Create an account", "Log out" |
| Login without a kept session | Message on the screen | Goes to `/admin` and the guard sends back to login |
| Login link to register | Keeps `?redirect=` | Does not keep it |
| Forgot / reset password | No CSRF cookie request first | Requests the CSRF cookie first |
| Email when resetting | Read-only | Editable |
| Log out | Goes to `/auth/login` | Goes to `/` and clears notifications |
| Returning from impersonation | Goes to `/admin` or login depending on the session | Goes to `/admin` |
| Resending an already confirmed verification | Toast and session reload | Session reload without a toast |
| Admin home | First name; with no entries, a profile card | Full name; with no entries, a message |
| Bell: load error | Message inside the panel | Toast |
| Bell: "Mark all" | Only when there are unread | Disabled when the count is 0 |
| Toast region label | "Notifications" | "Alerts" |
| Site header | No dark-mode button | With a dark-mode button |
| FAQ | Accordion (`<details>`) | All open (`<dl>`) |
| Partner logos with external links | New tab | Same tab |
| Social links | Filters `javascript:` and similar | Does not filter them |
| Editor: removing a section | Immediate | Asks for confirmation |
| Editor: tab name | Page title or key | `sitePages` label or key |
| Empty `HtmlContent` | Empty section | Nothing |
| Plans without frequencies | The object's first price | Only a price written as text |
| A section's props | Component props (`defineProps`) | A single `props` prop |
| Vite `resolve.dedupe` | Includes the `innoboxrr-*` packages | `react`, `react-dom`, `react-router-dom`, `zustand`, `axios` |
