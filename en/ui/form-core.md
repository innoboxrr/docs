# form-core: theme and styles

`innoboxrr-form-core` (2.8.0) is what the Vue components, the React components and both datatables share. It depends on no framework and no library. It contains:

- the stylesheets and their variables;
- the theme class map;
- the icons;
- toasts and confirmations;
- file descriptions;
- the time zone list.

It used to be copied into each package, which is exactly how two copies start to drift.

```bash
npm i innoboxrr-form-core
```

## What it exports

| Entry point | Contents |
|---|---|
| `innoboxrr-form-core` | All the JavaScript: theme, icons, feedback, files and `timezones` |
| `innoboxrr-form-core/theme` | `setTheme`, `getTheme`, `classFor`, `resetTheme`, `onThemeChange`, `defaultTheme` |
| `innoboxrr-form-core/icons` | `setIcons`, `iconFor`, `getIcon`, `onIconChange`, `resetIcons`, `defaultIcons` |
| `innoboxrr-form-core/feedback` | `notify`, `notifySuccess`, `notifyError`, `dismiss`, `getToasts`, `onToastsChange`, `resetToasts`, `confirmAction`, `resolveConfirmation`, `getConfirmation`, `onConfirmationChange`, `resetConfirmation` |
| `innoboxrr-form-core/files` | `describeFiles`, `validateFiles`, `errorsFor`, `previewFor`, `isImage`, `isVideo`, `sizeParser`, `FILE_ICON` |
| `innoboxrr-form-core/timezone` | The time zone list (default export) |
| `innoboxrr-form-core/styles` | The three sheets: `tokens.css`, `layout.css` and `components.css` |
| `innoboxrr-form-core/tokens.css`, `/layout.css`, `/components.css` | Each sheet on its own |

`sideEffects` only lists `*.css`, so the JavaScript can be tree-shaken safely.

## Styles

```js
import 'innoboxrr-form-core/styles'
```

One line at boot and everything is styled: the Vue and React components, the tables and what LaraPack generates. Nothing needs UIkit, Tailwind or Font Awesome.

- **`tokens.css`** defines the variables.
- **`layout.css`** adds layout utilities such as `fe-grid`, `fe-flex`, `fe-card`, `fe-container` and `fe-text-muted`.
- **`components.css`** draws the components.

If your application already has its own design system, you can skip the sheets and point the tokens at your classes with `setTheme()`.

## Theme

The theme maps **tokens** to CSS classes. Every token points at one of the ecosystem's own classes (`fe-*`), so normally you don't touch it. It's there for the other case: making a token use the classes of a design system the application already has. Set it **once**, at boot.

```js
import { setTheme } from 'innoboxrr-form-core'

setTheme({
    input: 'form-control',
    button: 'btn btn-primary',
})
```

| Function | What it does |
|---|---|
| `setTheme(tokens)` | Merges the tokens into the current theme and notifies subscribers. You can change one without repeating the rest. |
| `getTheme()` / `getTheme('input')` | The whole theme, or one token's class (`''` if it doesn't exist). |
| `classFor(token, customClass)` | The token's class, unless `customClass` is given. This is what the components call. |
| `resetTheme()` | Restores the defaults. Mostly for tests: the theme is module state and would leak from one test into the next. |
| `onThemeChange(fn)` | Subscribes to changes and returns the unsubscribe function. |
| `defaultTheme` | The default map. |

Components subscribe, so **a live `setTheme()` repaints whatever is already mounted**.

::: warning `customClass` replaces, it doesn't add
`classFor` returns `customClass ?? token`. If you pass `customClass`, that control loses the theme class. An empty string counts too: it leaves the control with no class.
:::

### The tokens

Almost all follow the rule `camelCaseName` → `fe-kebab-case-name`, for example `buttonSecondary` → `fe-button-secondary`. The exceptions:

- `tableNumeric` → `fe-numeric`
- `actionMenuItem` → `fe-action-item`
- `actionMenuDanger` → `fe-action-danger`
- `dialogSmall` → `fe-dialog-sm`
- `dialogLarge` → `fe-dialog-lg`

| Group | Tokens |
|---|---|
| Wrappers | `field`, `fieldInner`, `label`, `help`, `helpIcon`, `error` |
| Controls | `input`, `select`, `textarea`, `checkbox`, `radio`, `file` |
| Composite fields | `fileDrop`, `fileDropHint`, `avatarPreview`, `codeInput`, `codeCell`, `group`, `groupTitle`, `dragHandle`, `phone`, `phoneInvalid` |
| Buttons | `button`, `buttonSecondary`, `buttonDanger`, `buttonLink`, `iconButton`, `iconButtonDanger` |
| Navigation | `breadcrumb`, `breadcrumbLink`, `breadcrumbCurrent`, `breadcrumbSeparator`, `actionMenu`, `actionMenuItem`, `actionMenuDanger`, `kbd` |
| Surfaces | `surface`, `surfaceRaised`, `toolbar`, `badge`, `badgePrimary`, `badgeSuccess`, `badgeDanger`, `badgeWarning` |
| Skeletons | `skeleton`, `skeletonText`, `skeletonCircle`, `skeletonBlock` |
| Dialogs and drawers | `overlay`, `dialog`, `dialogSmall`, `dialogLarge`, `dialogHeader`, `dialogTitle`, `dialogBody`, `dialogFooter`, `drawer`, `drawerStart`, `drawerHeader`, `drawerTitle`, `drawerBody`, `drawerFooter` |
| Menus | `menu`, `menuList`, `menuItem`, `menuItemDanger`, `menuSeparator`, `menuLabel` |
| Command palette | `command`, `commandInput`, `commandList`, `commandGroup`, `commandItem`, `commandEmpty` |
| Toasts | `toast`, `toastSuccess`, `toastDanger`, `toastWarning`, `toastTitle`, `toastClose`, `toastRegion` |
| Table | `table`, `tableNumeric`, `tableSticky`, `tableSelect`, `tableResizer`, `tableEmpty`, `bulkBar`, `bulkCount`, `tableSort`, `tableContainer`, `tableFooter`, `tablePager` |
| Listing | `datatable`, `datatableFilters`, `toolbarSpacer` |
| Inline editing | `editable` |
| Application shell | `shell`, `shellHeader`, `shellSidebar`, `shellMain` |

## Icons

Components ask for an icon by **semantic name** (`plus`, `delete`) and a map decides which drawing that is. Values are [Iconify](https://icon-sets.iconify.design/) names of the form `collection:icon`.

Drawing an icon used to take three dependencies: UIkit, Font Awesome and a bridge between them. If one was missing, the icon disappeared. Now changing the icon set of the whole project means changing the map:

```js
import { setIcons, iconFor } from 'innoboxrr-form-core'

setIcons({ plus: 'lucide:plus', delete: 'lucide:trash-2' })

iconFor('plus')      // 'lucide:plus'
iconFor('mdi:home')  // 'mdi:home': an Iconify name passes through
iconFor('fa-plus')   // 'fa-plus': anything unknown comes back as is, so the mistake is visible
iconFor(null)        // ''
```

| Function | What it does |
|---|---|
| `setIcons(map)` | Merges into the current map and notifies subscribers. |
| `iconFor(name)` | The mapped icon; if it isn't mapped, the name itself. |
| `getIcon()` / `getIcon('plus')` | The whole map, or one name's value (`''` if it doesn't exist). |
| `onIconChange(fn)` | Subscribes and returns the unsubscribe function. `IconComponent` uses it to repaint live. |
| `resetIcons()` | Restores the default map. |
| `defaultIcons` | The default map. |

::: details Default icons
| Group | Name → icon |
|---|---|
| Actions | `plus` → `fa6-solid:plus`, `download` → `fa6-solid:download`, `upload` → `fa6-solid:upload`, `edit` → `fa6-solid:pen`, `delete` → `fa6-solid:trash`, `show` → `fa6-solid:eye`, `hide` → `fa6-solid:eye-slash`, `actions` → `fa6-solid:gears`, `refresh` → `fa6-solid:rotate`, `restore` → `fa6-solid:rotate-left`, `search` → `fa6-solid:magnifying-glass`, `filter` → `fa6-solid:filter`, `more` → `fa6-solid:ellipsis`, `external` → `fa6-solid:arrow-up-right-from-square`, `logout` → `fa6-solid:right-from-bracket` |
| Status | `help` → `fa6-solid:circle-question`, `warning` → `fa6-solid:triangle-exclamation`, `error` → `fa6-solid:circle-exclamation`, `success` → `fa6-solid:circle-check`, `info` → `fa6-solid:circle-info`, `locked` → `fa6-solid:lock` |
| Navigation | `previous` → `fa6-solid:chevron-left`, `next` → `fa6-solid:chevron-right`, `up` → `fa6-solid:chevron-up`, `down` → `fa6-solid:chevron-down`, `close` → `fa6-solid:xmark`, `home` → `fa6-solid:house`, `menu` → `fa6-solid:bars`, `sidebar` → `fa6-solid:table-columns`, `command` → `fa6-solid:terminal`, `settings` → `fa6-solid:gear` |
| Selection and sorting | `check` → `fa6-solid:check`, `minus` → `fa6-solid:minus`, `sort` → `fa6-solid:sort`, `sortUp` → `fa6-solid:sort-up`, `sortDown` → `fa6-solid:sort-down` |
| Objects | `box` → `fa6-solid:box`, `users` → `fa6-solid:users`, `gift` → `fa6-solid:gift`, `file` → `fa6-solid:file`, `media` → `fa6-solid:photo-film` |
| Editing | `save` → `fa6-solid:floppy-disk`, `copy` → `fa6-solid:clone`, `drag` → `fa6-solid:grip-vertical` |
| Recording | `record` → `fa6-solid:microphone`, `pause` → `fa6-solid:pause`, `play` → `fa6-solid:play` |
:::

## Toasts

Toasts are application-wide state that lives outside the framework. Whoever notifies doesn't need to know whether Vue or React is behind it: a store, a model contract or the table. They are rendered by the `ToastRegionComponent` the application mounts once.

```js
import { notify, notifySuccess, notifyError, dismiss } from 'innoboxrr-form-core'

notifySuccess('Product created')
notifyError('Could not save', { title: 'Product' })

const id = notify({ message: 'Export in progress', variant: 'info', duration: 8000 })
dismiss(id)
```

| Function | What it does |
|---|---|
| `notify(options)` | Shows a toast and returns its id. Accepts a string or `{ message, title, variant, duration }`. |
| `notifySuccess(message, { title, duration })` | `notify` with `variant: 'success'`. |
| `notifyError(message, { title, duration })` | `notify` with `variant: 'danger'`. |
| `dismiss(id)` | Closes a toast. |
| `getToasts()` / `onToastsChange(fn)` | The current queue and its subscription, for rendering it elsewhere. |
| `resetToasts()` | Empties the queue and cancels the timers. For tests. |

The rules, and why:

- **Variants.** `variant` is `info`, `success`, `warning` or `danger`. Any other value is treated as `info`.
- **Duration.** A toast closes after **5 seconds**, except **a danger toast, which stays** until closed by hand: someone who didn't read it in time wouldn't know what failed. `duration: 0` pins any toast.
- **Limit.** There are **never more than five** at once; when a sixth arrives, the oldest goes. More toasts cover the screen and don't get read.
- **Message.** `message` is converted to a string and rendered as text.
- **The queue is replaced, not mutated.** React compares the snapshot by reference and wouldn't re-render the same array.

## Confirmations

```js
import { confirmAction } from 'innoboxrr-form-core'

if (await confirmAction({
    title: 'Delete product',
    message: 'Are you sure you want to delete it?',
    confirmLabel: 'Yes, delete',
    cancelLabel: 'Cancel',
    variant: 'danger',
})) {
    // …
}
```

| Option | Default |
|---|---|
| `message` | `''` (a string is also accepted instead of the object) |
| `title` | `'¿Confirmas?'` |
| `confirmLabel` | `'Confirmar'` |
| `cancelLabel` | `'Cancelar'` |
| `variant` | `'primary'`; `'danger'` paints the confirm button red |

- **The answer.** `confirmAction` resolves `true` or `false`. It is rendered by the `ConfirmHostComponent` the application mounts once.
- **With no host mounted,** it uses `window.confirm`; with no `window`, it resolves `false`. A promise that never resolved would leave the waiting action hanging.
- **A new question while another is pending** cancels the previous one (`false`): two confirmations at once have no clear answer.
- **To render it elsewhere,** use `getConfirmation()`, `onConfirmationChange(fn)` and `resolveConfirmation(value)`. `resetConfirmation()` cancels whatever is pending, for tests.

::: tip The pattern in generated code
The model contracts LaraPack generates confirm with `confirmAction` and, when the answer is `false`, throw `RequestCancelledError` from `innoboxrr-http-request`. The table and the views recognize that error and don't report an operation the user chose not to run.

The default labels are in Spanish; generated code passes its own through `t()`.
:::

## Files

```js
import { describeFiles, sizeParser } from 'innoboxrr-form-core'

const entries = describeFiles(input.files, {
    maxSize: 2 * 1024 * 1024,                // bytes; 0 or missing: no limit
    validMimes: ['image/png', 'image/jpeg'], // missing: anything
})

// [{ file, name, size, type, preview, uploaded, validation, errors, path, id }]

const form = new FormData()
entries.filter((entry) => entry.validation).forEach((entry) => form.append('files[]', entry.file))

sizeParser(1536) // '2 KB'
```

`describeFiles` **doesn't touch the `File` objects**. The previous version wrote properties onto them with `Object.assign`, which had two problems: a `File` belongs to the browser and is no place for invented fields, and the same file couldn't be described twice with different rules. The original is still in `.file`, which is what goes into the `FormData`.

| Function | What it does |
|---|---|
| `describeFiles(files, rules)` | One descriptor per file. `validation` is `true` when `errors` is empty. `uploaded` starts as `false` and `path` and `id` as `undefined`, for the uploader to fill in. |
| `validateFiles(files, rules)` | The same, wrapped in a promise. It exists for compatibility: nothing here is asynchronous. |
| `errorsFor(file, rules)` | The error codes: `'failMimeValidation'` and `'failMaxSizeValidation'`. |
| `previewFor(file)` | For gif, jpeg, jpg, png, webp and avif, a `URL.createObjectURL` URL; for anything else, `FILE_ICON`. Outside the browser (Node, jsdom, SSR) it also returns `FILE_ICON` instead of throwing. |
| `isImage(file)`, `isVideo(file)` | Check the MIME type prefix. |
| `sizeParser(bytes)` | Readable sizes: `'0 Byte'`, `'512 Bytes'`, `'2 MB'`. |
| `FILE_ICON` | An SVG data URI. It used to be a third-party URL requested for every file. |

::: tip Release the previews
form-core creates previews with `URL.createObjectURL` and doesn't release them. If you describe many files on the same page, call `URL.revokeObjectURL(entry.preview)` once you stop showing them.
:::

## Time zones

```js
import { timezones } from 'innoboxrr-form-core'

// [{ label: 'Africa/Abidjan', value: 'Africa/Abidjan' }, …, { label: 'UTC', value: 'UTC' }]
```

These are the IANA names grouped by region: Africa, America, Antarctica, Arctic, Asia, Atlantic, Australia, Europe, Indian and Pacific. The list ends with `UTC`.

## CSS variables

Every visual decision lives once, in `tokens.css`. There are two kinds of variables:

- **Colors, the overlay and the shadows** change in dark mode.
- **Everything else** is the same in both modes.

### Surfaces and borders

| Variable | Light | Dark |
|---|---|---|
| `--fe-bg` | `#f7f8fa` | `#101116` |
| `--fe-surface` | `#ffffff` | `#181a21` |
| `--fe-surface-raised` | `#ffffff` | `#1f222b` |
| `--fe-surface-sunk` | `#f1f2f6` | `#14161c` |
| `--fe-surface-hover` | `#f1f2f6` | `#22252f` |
| `--fe-border` | `#e3e5eb` | `#2b2e39` |
| `--fe-border-strong` | `#c8cbd4` | `#3d4150` |

### Text

| Variable | Light | Dark |
|---|---|---|
| `--fe-text` | `#1b1c22` | `#e8e9ef` |
| `--fe-text-muted` | `#5c5f6b` | `#a7aab8` |
| `--fe-text-subtle` | `#8b8e9a` | `#767a89` |
| `--fe-text-inverse` | `#ffffff` | `#101116` |

### Primary and danger

| Variable | Light | Dark |
|---|---|---|
| `--fe-primary` | `#4b5bd7` | `#8b95f0` |
| `--fe-primary-hover` | `#3f4dc0` | `#a0a8f5` |
| `--fe-primary-text` | `#ffffff` | `#101116` |
| `--fe-primary-soft` | `#eceefb` | `#21243a` |
| `--fe-danger` | `#c0392f` | `#e08b83` |
| `--fe-danger-hover` | `#a32e26` | `#eda29a` |
| `--fe-danger-text` | `#ffffff` | `#101116` |
| `--fe-danger-soft` | `#fbeceb` | `#2c1d1c` |

### States, focus and overlay

| Variable | Light | Dark |
|---|---|---|
| `--fe-success` | `#17714d` | `#5ec79c` |
| `--fe-success-soft` | `#e6f2ec` | `#142b23` |
| `--fe-warning` | `#8a6212` | `#d9ac53` |
| `--fe-warning-soft` | `#f8f0dd` | `#2a2417` |
| `--fe-info` | `#1f6fb2` | `#7cb3e6` |
| `--fe-info-soft` | `#e5f0f9` | `#16222e` |
| `--fe-focus` | `#4b5bd7` | `#8b95f0` |
| `--fe-overlay` | `rgba(16, 18, 27, 0.45)` | `rgba(0, 0, 0, 0.6)` |

`--fe-overlay` is what sits behind an open dialog or drawer.

### Elevation

| Variable | Light | Dark |
|---|---|---|
| `--fe-shadow-sm` | `0 1px 2px rgba(16, 18, 27, 0.06)` | `0 1px 2px rgba(0, 0, 0, 0.4)` |
| `--fe-shadow` | `0 4px 12px rgba(16, 18, 27, 0.08)` | `0 4px 12px rgba(0, 0, 0, 0.45)` |
| `--fe-shadow-lg` | `0 16px 40px rgba(16, 18, 27, 0.16)` | `0 16px 40px rgba(0, 0, 0, 0.55)` |

### Shape and spacing

| Variable | Value |
|---|---|
| `--fe-radius-sm` | `4px` |
| `--fe-radius` | `6px` |
| `--fe-radius-lg` | `10px` |
| `--fe-radius-full` | `9999px` |
| `--fe-space-1` | `0.25rem` |
| `--fe-space-2` | `0.5rem` |
| `--fe-space-3` | `0.75rem` |
| `--fe-space-4` | `1rem` |
| `--fe-space-5` | `1.5rem` |
| `--fe-space-6` | `2rem` |

### Typography

| Variable | Value |
|---|---|
| `--fe-font` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `--fe-font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| `--fe-text-xs` | `0.75rem` |
| `--fe-text-sm` | `0.8125rem` |
| `--fe-text-base` | `0.875rem` |
| `--fe-text-lg` | `1rem` |
| `--fe-text-xl` | `1.25rem` |

### Density

| Variable | Value |
|---|---|
| `--fe-density` | `1` |
| `--fe-control-height` | `calc(2.25rem * var(--fe-density))` |
| `--fe-control-padding-x` | `calc(0.75rem * var(--fe-density))` |

Density is a variable, not a set of classes. `0.875` compacts a table while its cells stay easy to click. The `fe-dense` class sets it to `0.875` on a container, and everything inside shrinks without any component knowing.

### Motion

| Variable | Value |
|---|---|
| `--fe-transition` | `120ms ease` |
| `--fe-duration-fast` | `120ms` |
| `--fe-duration` | `200ms` |
| `--fe-ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

### Layers

| Variable | Value |
|---|---|
| `--fe-z-sticky` | `10` |
| `--fe-z-dropdown` | `40` |
| `--fe-z-overlay` | `50` |
| `--fe-z-tooltip` | `60` |
| `--fe-z-toast` | `70` |

Anything opened with `showModal()` or the `popover` attribute already lives in the browser's top layer and needs no `z-index`. This scale is for everything else: a table's sticky header, a hand-drawn overlay, tooltips. Never a loose number.

### Application sizes

| Variable | Value |
|---|---|
| `--fe-dialog-width` | `32rem`; `fe-dialog-sm` changes it to `24rem` and `fe-dialog-lg` to `48rem` |
| `--fe-drawer-width` | `32rem` |
| `--fe-command-width` | `40rem`; the command palette uses it as its dialog width |
| `--fe-sidebar-width` | `15rem` |
| `--fe-table-max-height` | `none`; with a limit, the table's sticky header also works while scrolling |

## Dark mode

A visitor has three states, and `tokens.css` defines all three:

| State | Selector | What they see |
|---|---|---|
| No choice | `@media (prefers-color-scheme: dark)` on `:root:not([data-theme='light'])` | Whatever the operating system says |
| Chose dark | `:root[data-theme='dark']` | Dark, even if the system is light |
| Chose light | `:root[data-theme='light']` | Light, even if the system is dark |

The `:not()` is what makes an explicit choice win: without it, someone asking for light would still see dark on a dark system.

The attribute goes on `<html>`:

```js
document.documentElement.setAttribute('data-theme', 'dark')  // force dark
document.documentElement.setAttribute('data-theme', 'light') // force light
document.documentElement.removeAttribute('data-theme')       // follow the system
```

The Vue code editor (`CodeMirrorComponent` with `theme="auto"`) applies the same rule from JavaScript and switches live. The base application stores the choice in `localStorage.theme` and applies it before painting, to avoid a light flash: [Customize and extend](/en/app-base/customize).

## Retheming

### The primary color, in both modes

```css
/* After importing innoboxrr-form-core/styles */
:root {
    --fe-primary: #7c3aed;
    --fe-primary-hover: #6d28d9;
    --fe-primary-soft: #f1eafe;
    --fe-focus: #7c3aed;
}

@media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
        --fe-primary: #a78bfa;
        --fe-primary-hover: #c4b5fd;
        --fe-primary-soft: #2a2140;
        --fe-focus: #a78bfa;
    }
}

:root[data-theme='dark'] {
    --fe-primary: #a78bfa;
    --fe-primary-hover: #c4b5fd;
    --fe-primary-soft: #2a2140;
    --fe-focus: #a78bfa;
}
```

::: warning Redefine the color for dark mode too
- **In dark mode,** the selectors in `tokens.css` (`:root[data-theme='dark']` and `:root:not([data-theme='light'])`) are more specific than a plain `:root`. A color redefined only on `:root` shows in light mode and disappears in dark mode.
- **In light mode,** your `:root` and the one in `tokens.css` have the same weight, so whichever loads last wins. Import your CSS after form-core's styles.
:::

### Shapes and density

```css
:root {
    --fe-radius: 10px;
    --fe-radius-lg: 14px;
}

/* A compact listing, without touching any component */
.dense-listing {
    --fe-density: 0.875;
}
```

```html
<section class="fe-dense">
    <!-- everything inside shrinks -->
</section>
```

### Sizes for one area

```css
/* Wider drawers only in the orders section */
.orders {
    --fe-drawer-width: 48rem;
}

/* Sticky header while scrolling inside the listing */
.fe-datatable {
    --fe-table-max-height: 70vh;
}
```

### Another design system's classes

```js
import { setTheme, setIcons } from 'innoboxrr-form-core'

setTheme({
    input: 'form-control',
    select: 'form-select',
    button: 'btn btn-primary',
    buttonSecondary: 'btn btn-secondary',
    buttonDanger: 'btn btn-danger',
})

setIcons({
    plus: 'lucide:plus',
    delete: 'lucide:trash-2',
    edit: 'lucide:pencil',
})
```

### In a generated module

LaraPack leaves a `src/theme.js` in every module. It imports `innoboxrr-form-core/styles` and calls empty `setTheme({})` and `setIcons({})`, so it is the place for all of the above. The module lists it in `sideEffects`: without that, the bundler could drop the import and the admin panel would lose its styles.

```js
// resources/vue/src/theme.js (or resources/react/src/theme.js)
import 'innoboxrr-form-core/styles'

import { setIcons, setTheme } from 'innoboxrr-form-core'

setTheme({
    // input: 'form-control',
})

setIcons({
    plus: 'lucide:plus',
    delete: 'lucide:trash-2',
})

export { getIcon, getTheme, iconFor, setIcons, setTheme } from 'innoboxrr-form-core'
```

## Markup of the desktop pieces

Dialogs, drawers, menus and toasts rely on what the browser already does, with no UI library. The sheets only draw them, and the Vue and React components wrap exactly this markup:

- **`<dialog>` with `showModal()`** provides the top layer, the inert background, trapped focus, Escape to close and focus return.
- **The `popover` attribute** provides light dismiss.

```html
<dialog class="fe-drawer">
    <header class="fe-drawer-header">
        <h2 class="fe-drawer-title">New product</h2>
        <button class="fe-icon-button" aria-label="Close">…</button>
    </header>
    <div class="fe-drawer-body">…</div>
    <footer class="fe-drawer-footer">…</footer>
</dialog>
```

- **Dialog.** `fe-dialog`, with `fe-dialog-sm` or `fe-dialog-lg` for the width.
- **Drawer.** `fe-drawer` opens on the right; `fe-drawer-start` puts it on the left.
- **Command palette.** `<dialog class="fe-dialog fe-command">` with `fe-command-input` and a `fe-command-list` of `fe-command-item`. The active item has `aria-selected="true"`.
- **Toasts.** A `fe-toast-region` with `popover="manual"`, so it stays above a drawer opened with `showModal()`.
- **Menus.** `fe-menu` with `popover`, positioned with Floating UI.
- **Table.**
  - `fe-table-select` is the checkbox column.
  - A selected row carries `data-selected`.
  - `fe-bulk-bar` groups what you can do with the selection.
  - `fe-table-resizer` resizes a column.
  - A sortable column has `aria-sort` on the `<th>` and a `<button class="fe-table-sort">` inside, so it can also be sorted with the keyboard.
- **Listing.** `fe-datatable` groups:
  - the `fe-toolbar`, with a `fe-toolbar-spacer` that pushes whatever follows to the right;
  - the `fe-datatable-filters` panel;
  - the table, inside a `fe-table-container`;
  - the `fe-table-footer`, with the summary and the `fe-table-pager`.

::: tip Why no rule sets `display` outside `[open]`
A closed `<dialog>` is hidden because the browser gives it `display: none`. A rule that set `display` without checking `[open]` would leave it visible while closed.
:::
