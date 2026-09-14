# The generated UI

With `--vue`, `--react` or both, every model gets its own admin module. It works like a desktop application: the table stays mounted, create and edit open in drawers, a record's actions are a menu, and Ctrl+K opens a command palette. It doesn't depend on any CSS framework: the look comes from `innoboxrr-form-core`.

```bash
php vendor/bin/builder larapack:import --vue
php vendor/bin/builder larapack:import --react
php vendor/bin/builder larapack:import --vue --react
```

Both modules come from the same `laraimport.json` and have exactly the same structure. Which file is generated and when is in [What is generated](/en/larapack/generated-code#the-interface-module); how to mount it in an application, in [Mounting a package in an application](/en/larapack/mount-in-app).

## Vue and React

**`src/models/<kebab>/index.js` is the same file in both.** It's pure functions and HTTP calls, with nothing from a UI framework. If each framework had its own contract, there would be no contract. Only the presentation changes:

| | Vue | React |
|---|---|---|
| Components | `<script setup>`, `.vue` | Functions, `.jsx` |
| Data binding | `v-model` | `value` and `onChange(valor)` |
| Store | Pinia 3 | Zustand 5, with the same surface |
| Router | vue-router 4 | React Router 7 |
| Forms and pieces | `innoboxrr-form-elements` | `innoboxrr-react-form-elements` |
| Table | `innoboxrr-vue-datatable` | `innoboxrr-react-datatable` |
| What requires a session | `meta.auth` | `handle.auth` |
| Notifying on save | `updateData` event | `onUpdateData` |

Both form packages export the same 37 names, and a test in each one fails if one gets ahead of the other.

## How it's used

- **The index keeps the table mounted.** Create opens in a drawer on top; on save, the table reloads in place with `refresh()`, without losing the page, sort or filters.
- **The detail page** shows the shape of the record while it loads and opens editing in another drawer over the detail page.
- **Routes keep their names**: a link to `AdminCreatePost` or `AdminEditPost` opens the matching drawer.
- **Create, save and delete confirm with a toast**; delete and export ask first with the theme's confirmation dialog.
- **A record's actions are a dropdown menu**, which opens with the keyboard and closes with Escape.
- **Ctrl+K or Cmd+K** opens the command palette from the index: create, export and reload.
- **The table** resolves each row's permissions before opening its menu, shows skeletons while loading, and explains a 403 instead of showing an empty table.
- **Selecting rows** opens the [bulk actions](/en/larapack/actions#bulk-actions) bar.
- **A text column** that the form edits [is edited in its cell](/en/larapack/actions#inline-editing).
- **Export shows a toast** when requested: the file arrives later, by notification.

## The routes

For `Post`, mounted by the application under `/admin`:

| Name (Vue) or id (React) | Path | View | Requires |
|---|---|---|---|
| `AdminPosts` | `/admin/post` | `AdminView` | `index` and `policies` |
| `AdminCreatePost` | `/admin/post/create` | `CreateView`, in the index drawer | also `create` |
| `AdminShowPost` | `/admin/post/:id` | `ShowView` | also `show` |
| `AdminEditPost` | `/admin/post/:id/edit` | `EditView`, in the detail page drawer | also `show` and `update` |

The model's path is its name in kebab-case, in singular: `OrderLine` goes to `order-line`.

::: code-group

```js [Vue: routes/index.js]
export default [
    {
        path: 'post',
        name: "AdminPosts",
        component: () => import ("./../views/AdminView.vue"),
        meta: {
            get title() { return t('Posts') },
            auth: true,
        },
        children: [
            {
                path: 'create',
                name: "AdminCreatePost",
                component: () => import ("./../views/CreateView.vue"),
                meta: {
                    get title() { return t('Create :name', { name: t('Post') }) },
                    auth: true,
                }
            },
            {
                path: ':id',
                name: "AdminShowPost",
                component: () => import ("./../views/ShowView.vue"),
                meta: {
                    get title() { return t('Post') },
                    auth: true,
                },
                children: [
                    {
                        path: 'edit',
                        name: "AdminEditPost",
                        component: () => import ("./../views/EditView.vue"),
                        meta: {
                            get title() { return t('Edit :name', { name: t('Post') }) },
                            auth: true,
                        }
                    },
                ]
            },
        ]
    },
]
```

```js [React: routes/index.js]
export default [
    {
        path: 'post',
        id: 'AdminPosts',
        handle: { get title() { return t('Posts') }, auth: true },
        lazy: async () => ({ Component: (await import('../views/AdminView.jsx')).default }),
        children: [
            {
                path: 'create',
                id: 'AdminCreatePost',
                handle: { get title() { return t('Create :name', { name: t('Post') }) }, auth: true },
                lazy: async () => ({ Component: (await import('../views/CreateView.jsx')).default }),
            },
            {
                path: ':id',
                id: 'AdminShowPost',
                handle: { get title() { return t('Post') }, auth: true },
                lazy: async () => ({ Component: (await import('../views/ShowView.jsx')).default }),
                children: [
                    {
                        path: 'edit',
                        id: 'AdminEditPost',
                        handle: { get title() { return t('Edit :name', { name: t('Post') }) }, auth: true },
                        lazy: async () => ({ Component: (await import('../views/EditView.jsx')).default }),
                    },
                ],
            },
        ],
    },
]
```

:::

- **`auth: true` declares that the route requires a session, and the application's router decides.** The module imports no middleware from the host: if it did, it would only compile inside the application that defines it.
- **`title` is a getter**: it's translated every time the router reads it, in whatever language the application has chosen, so it doesn't matter whether the module is imported before `setLocale()`.
- **Components are loaded on demand.** In React, with `lazy`, so the routes file stays plain JavaScript without JSX.
- The module's `src/routes/index.js` collects every model's routes with `import.meta.glob('../models/*/routes/index.js', { eager: true })`: a new model shows up on its own.

## The views

**`AdminView`** is the index. It renders the breadcrumbs, the table and the command palette, plus the create drawer when the route is `AdminCreatePost`. When the route is the detail page or its edit route, it renders the detail page instead. On create, it shows the "Record created" toast, closes the drawer and calls the table's `refresh()`. Exporting from the palette makes the same request as the table's toolbar.

**`ShowView`** is the detail page. It loads the record through the store on mount and every time the id changes, and while the route's record is loading it shows skeletons, never the previous record. It renders `ModelCard` and `ModelProfile`, puts the [column that names the record](/en/larapack/actions#display) in the breadcrumbs and in `document.title`, and opens editing in a drawer. On save, it shows "Changes saved", closes the drawer and reloads.

**`CreateView` and `EditView`** live inside their drawer: they render no breadcrumbs or title, and they don't decide where to go. They check `getPolicy('create')` or `getPolicy('update', id)` on mount, with the redirect commented out so you decide it; the API rejects whatever the policy doesn't allow anyway. When the form saves, they notify: with the `updateData` event in Vue, with `onUpdateData` from the `Outlet` context in React. The view that opened the drawer decides what happens.

**`ModelCard`** shows the record's name and its actions menu: "Show", "Edit" (with `update`) and "Delete" (with `delete`). Delete asks first, shows "Record deleted" and goes back to the index; cancelling the confirmation doesn't count as an error.

**`ModelProfile`** shows the id and the creation date, formatted in the page's language. It's the place to add more fields.

::: warning A form doesn't navigate on save
If an edited form navigates on its own, the drawer stays open over another page. Notify and let the view decide.
:::

## Forms {#forms}

`CreateForm` and `EditForm` come from the contract's properties:

- **`form: true` renders the field; `form_submit: true` sends it.** A field with `form` and without `form_submit` is shown but not sent. A property with `form_submit` and without `form` isn't rendered: it becomes a form prop, which has to come from outside.
- **Every field has `validators="required"`.** Browser validation comes from `innoboxrr-js-validator`. If a field is optional, remove the attribute in both forms.
- **Editable metas** get their own text field, without `required`. See [Metas and payload](/en/larapack/metas#the-forms).
- **On submit**, the form validates in the browser, calls the store's `create` or `update` with the fields that are sent, and a 422 renders the API errors on the same form with `appendExternalErrors`. Then it emits `submit` with the record (in React, `onSubmit`).
- **`EditForm`** loads the record by its id and fills only the fields it declares, from the column or from `payload`, so a new field from the API doesn't slip into the update.
- Each field's component comes from `form_component`; how each one is written is in [Form components](/en/larapack/laraimport#form-components).

`FilterForm` has an `id` field plus one per property with `form`: a select if it has `enum`, a text field otherwise. On search it sends the whole filter object, empty ones included, so a cleared field clears its filter; "Reset" goes back to the initial state and searches.

## The table

`widgets/DataTable` wraps the ecosystem's table with what it already knows about the model:

| Prop | Default | What it is |
|---|---|---|
| `showTopbar` | `true` | The top bar. |
| `hasActions` | `true` | The actions column. |
| `hasFilter` | `true` | The filter panel, with `FilterForm`. |
| `externalFilters` | `{}` | Fixed filters set by whoever mounts the table. |
| `extraParams` | `{}` | Extra request parameters. |
| `hideColumns` | `[]` | Columns that aren't rendered. |
| `cardWrapper` | `true` | The card around it. |

- It requests `index` and `policies` via `GET`, from the model's routes.
- It passes `labels={tableLabels()}`, so the table's texts follow the application's language.
- It enables `selectable` only if `bulkActions()` has at least one action.
- It adds `ClickToEdit` to `dataTableComponents` for [inline editing](/en/larapack/actions#inline-editing).
- It exposes `refresh()`: with `defineExpose` in Vue and through `ref` in React.

Each row's actions come from the API, in the resource's `actions` array. An action with `route: true` navigates to `params.to.name`; one with `route: false` calls `model[callback](params)`, so `callback` has to be a real export of the contract. If the action has `success`, the table shows it as a toast when it finishes. How the table works inside is in [Tables](/en/ui/datatables).

## The store

`store/index.js` holds the model's state, with the same surface in both frameworks:

| Member | What it is |
|---|---|
| `items`, `meta`, `links` | The last index page, as Laravel sends it. |
| `current` | The last record loaded, created or updated. |
| `policies` | The abilities from the last query. |
| `loading`, `error` | The state of the last operation. |
| `isEmpty` | Nothing loading and no items. In Vue it's a `computed`; in React it's read with the `selectIsEmpty` selector. |
| `can(habilidad)` | Whether `policies[habilidad]` is `true`. |
| `fetchIndex(params)` | Loads the index. With `index`. |
| `fetchOne(id, relaciones, conteos)` | Loads a record into `current`. With `show`. |
| `fetchPolicies(id)` | Loads the abilities. With `policies`. |
| `create(data)` | Creates and puts it at the start of `items`. With `create`. |
| `update(id, data)` | Updates and replaces it in `items`. With `update`. |
| `remove(id)` | Deletes, with confirmation, and removes it from `items`. With `delete`. |
| `reset()` | Clears the state. |

The store id includes the namespace (`acme.catalogo.post`), so two modules with a model of the same name don't share state.

## The model contract {#model-contract}

`src/models/<kebab>/index.js`:

| Export | What it is | Exists with |
|---|---|---|
| `API_ROUTE_PREFIX` | `api.<namespace>.<snake>.`, the same prefix the `RouteServiceProvider` registers. `larapack:verify` checks it. | always |
| `csrfToken()` | Reads `<meta name="csrf-token">` at the moment it's used. | always |
| `setFilters()`, `getFilters()`, `resetFilters()` | The filters, as module state, which the table reads on its own. | always |
| `crudActions()` | The table toolbar: "Create", which navigates to `AdminCreate<Model>`, and "Export", which calls `exportModel`. | each one, its action |
| `bulkActions()` | The selection actions. | always; empty without bulk actions |
| `dataTableHead()` | The columns: `id` and each property with `datatable`, with its translated label, its `enum` label or its inline editing. | always |
| `dataTableSort()` | Default sort: the first column with `datatable`, ascending, or `id`. | always |
| `getPolicies(id)` | `GET policies`. | `policies` |
| `getPolicy(policy, id)` | `GET policy`. | `policy` |
| `indexModel(params)` | `GET index`. | `index` |
| `showModel(id, relaciones, conteos, data)` | `GET show`. | `show` |
| `createModel(data)` | `POST create`. | `create` |
| `updateModel(id, data)` | `PUT update`. | `update` |
| `deleteModel({ id })` | Asks, then sends `DELETE delete`. | `delete` |
| `restoreModel({ id })` | `POST restore`. | `restore` |
| `forceDeleteModel({ id })` | Asks, then sends `DELETE force-delete`. | `forceDelete` |
| `exportModel(data)` | Asks, then sends `POST export`. | `export` |
| `bulkUpdateModels(ids, filas, data)` | `PUT bulk-update`. | `bulkUpdate` |
| `updateField(id, campo, valor)` | Saves one field from its cell. | `bulkUpdate` |
| `bulkDeleteModels(ids)` | Asks, then sends `DELETE bulk-delete`. | `bulkDelete` |

Requests go through `innoboxrr-http-request` to the URL resolved by `route()` from `innoboxrr-route-resolver`, so nothing in the module writes a URL.

- **Reads don't send `_token`.** `innoboxrr-http-request` puts the data of a `GET` or `HEAD` in the query string, and the token would end up in the URL, the browser history and the server logs. `getPolicies`, `getPolicy`, `indexModel` and `showModel` don't send it; Laravel doesn't require it for reads.
- **Writes do**: create, update, delete, restore, force delete, export and the bulk actions send `_token: csrfToken()`.
- **Reads are retried** up to 3 times, every 1.5 seconds; writes, never.
- **Anything that can't be undone asks first**, with `confirmAction` from `innoboxrr-form-core`. Cancelling rejects with `RequestCancelledError`, which the table and the views recognize: nobody shows a toast for something the user decided not to do.

```js
export const indexModel = (params = {}) => {
    return makeHttpRequest('get', route(API_ROUTE_PREFIX + 'index'), {
        ...params,
    }, {}, 3, 1500)
}

export const createModel = (data) => {
    return makeHttpRequest('post', route(API_ROUTE_PREFIX + 'create'), {
        _token: csrfToken(),
        ...data,
    }, {}, 0, 1500)
}
```

The `innoboxrr-vue-datatable` and `innoboxrr-react-datatable` datatables do the same with their own requests since 3.1.1: they don't send `_token` on `GET`.

## Toasts and confirmations

The views notify with `notifySuccess` and `notifyError`, and the contract functions ask with `confirmAction`, all from `innoboxrr-form-core`. They render wherever the application mounts `ToastRegionComponent` and `ConfirmHostComponent`, once: without them toasts aren't visible and the confirmation falls back to `window.confirm`.

| When | Text |
|---|---|
| Create | `Record created` |
| Save an edit | `Changes saved` |
| Delete from the detail page or the row | `Record deleted` |
| Update the selection | `Records updated` |
| Delete the selection | `Records deleted` |
| Request an export | `The export is being prepared. You will be notified when it is ready.` |
| An export fails | The API's message, or `The export could not be generated.` |
| A delete fails | The API's message, or `The item could not be deleted` |

## Texts {#texts}

Every visible text is **an English key** that's translated when rendered, with `t()` from `innoboxrr-i18n`: routes, breadcrumbs, palette, drawers, table, menus, confirmations and toasts. Model names aren't concatenated into the key: `t('Create :name', { name: t('Post') })`, so the key is translated once for every model.

- **LaraPack maintains `src/locales/en.json` and `es.json`.** Every time it generates, it scans `src/` and adds any missing `t('…')` keys. In `en.json` the translation is the key itself. In `es.json`, it's the one LaraPack knows; domain keys (the model name, its fields, an `enum`'s labels) are left as `""`, and while they are, the English key is shown.
- **It never overwrites a written translation.** It only fills in the empty ones it knows. An invalid JSON file is left as it is.
- **The module exports `translations`** (`{ en, es }`), and the application loads them before its own so it can override them. See [Translations](/en/larapack/mount-in-app#translations).
- **`tableLabels()`** translates the table's texts, which the datatables ship in hard-coded Spanish: `actions`, `rowActions`, `refresh`, `filters`, `selectAll`, `selectRow`, `selection`, `selected`, `clearSelection`, `empty`, `retry`, `of`, `page`, `previous`, `next`, `forbidden`, `offline`, `failed`, `policiesFailed`, `notAllowed` and `actionFailed`.
- **In Laravel**, the resource's row actions and the export email use `__()`. LaraPack writes the keys it knows how to translate to `lang/es.json`; the application can override them in its own `lang/es.json`.
- **Whatever you write by hand** in the module is picked up by `npm run locale` (`innoboxrr-locale-generator`), in a package.

## The look {#theme}

The module doesn't need UIkit, Tailwind or Font Awesome. `src/theme.js` imports the stylesheet once and leaves the two settings at hand:

```js
import 'innoboxrr-form-core/styles'

import { setIcons, setTheme } from 'innoboxrr-form-core'

setTheme({
    // input: 'form-control',
    // button: 'btn btn-primary',
})

setIcons({
    // plus: 'lucide:plus',
    // delete: 'lucide:trash-2',
})

export { getIcon, getTheme, iconFor, setIcons, setTheme } from 'innoboxrr-form-core'
```

- **Colors, shapes and density** are CSS variables; you redefine them in the application's CSS:

```css
:root {
    --fe-primary: #7c3aed;
    --fe-radius: 10px;
    --fe-density: 0.875;          /* more compact interface */
    --fe-table-max-height: 70vh;  /* table header stays fixed on scroll */
}
```

- **Dark mode** follows the system preference and `data-theme="dark"` on the root element.
- **`setTheme`** maps a token to the classes of another design system, if the application already has its own. A generated form carries no classes, and you don't need to give it `customClass`.
- **Icons are requested by semantic name** (`plus`, `edit`, `delete`, `show`, `download`, `actions`…) and the `setIcons` map decides which collection they come from. A Laravel resource also emits the semantic name: `'icon' => 'show'`, not `'fa-eye'`.
- **`package.json` declares `src/theme.js` in `sideEffects`** (in Vue, alongside `*.css` and `*.vue`; in React, alongside `*.css`). Without it, Vite drops the theme import and the admin panel renders unstyled.

Tokens and variables are in [form-core: theme and styles](/en/ui/form-core).

## Navigating from React: `buildPath` {#navigating-from-react-buildpath}

React Router doesn't resolve routes by name. The module's aggregator walks the route tree and registers each id with its full path in `innoboxrr-react-datatable`, using the prefix where the application mounts the module:

```js
import { registerModuleRoutes } from 'acme-catalogo-react'

registerModuleRoutes('/admin')   // { AdminPosts: '/admin/post', AdminShowPost: '/admin/post/:id', … }
```

From a view, always navigate by name:

```jsx
import { buildPath } from 'innoboxrr-react-datatable'

navigate(buildPath('AdminShowPost', { id: post.id }))
```

Never write the path by hand: `buildPath` resolves against where the host actually mounted the module. `routeNamesOf(árbol, base)` returns the same map without registering it.

## Module dependencies {#module-dependencies}

The `package.json` generated in a package declares:

| Package | Vue | React |
|---|---|---|
| `innoboxrr-form-core` | `^2.8.0` | `^2.8.0` |
| `innoboxrr-form-elements` / `innoboxrr-react-form-elements` | `^6.7.0` | `^3.7.0` |
| `innoboxrr-vue-datatable` / `innoboxrr-react-datatable` | `^3.1.0` | `^3.1.0` |
| `innoboxrr-http-request` | `^2.0.0` | `^2.0.0` |
| `innoboxrr-i18n` | `^1.2.0` | `^1.2.0` |
| `innoboxrr-js-validator` | `^2.0.0` | `^2.0.0` |
| `innoboxrr-route-resolver` | `^2.0.0` | `^2.0.0` |
| `peerDependencies` | `vue ^3.5.0`, `vue-router ^4.5.0`, `pinia ^3.0.0` | `react ^19.0.0`, `react-dom ^19.0.0`, `react-router-dom ^7.0.0`, `zustand ^5.0.0` |
| `devDependencies` | `vite ^8.0.0`, `@vitejs/plugin-vue ^6.0.0`, `innoboxrr-locale-generator ^2.0.0` | `vite ^8.0.0`, `@vitejs/plugin-react ^6.0.0`, `innoboxrr-locale-generator ^2.0.0` |

Those constraints accept the satellites' current versions: the 3.1.1 datatables, which don't send `_token` on `GET`, and `innoboxrr-form-elements` 6.8.0 and `innoboxrr-react-form-elements` 3.8.0, which load `CodeMirrorComponent`'s languages on demand instead of putting them all in the bundle.

In an application the module has no `package.json`: those dependencies are declared by the application's own.
