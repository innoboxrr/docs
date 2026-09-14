# Tables

`innoboxrr-vue-datatable` and `innoboxrr-react-datatable` (3.1.1) are the admin listing used by everything LaraPack generates. They provide:

- an actions and filters bar;
- server-side sorting and pagination;
- row selection with bulk actions;
- permissions resolved before each menu opens;
- skeletons while loading, and errors you can see.

Both take the same props, read the same model contract and behave the same way. The shared logic is in `src/table.js`, which is the same file in both packages: if it changes in one, it changes in the other.

Underneath, [TanStack Table](https://tanstack.com/table) v9 holds the table state: visible columns, sorting and selection. The menu, icons and skeletons are the ones from the [components](/en/ui/form-elements), styled by the [form-core](/en/ui/form-core) theme.

## Install

::: code-group

```bash [Vue]
npm i innoboxrr-vue-datatable innoboxrr-form-core innoboxrr-form-elements vue-router
```

```bash [React]
npm i innoboxrr-react-datatable innoboxrr-form-core innoboxrr-react-form-elements react-router-dom
```

:::

| | Vue | React |
|---|---|---|
| Dependencies | `@tanstack/vue-table` ^9.2.4, `axios` ^1.7.0 | `@tanstack/react-table` ^9.2.4, `axios` ^1.7.0 |
| Peer dependencies | `innoboxrr-form-core` ^2.6.0, `innoboxrr-form-elements` ^6.4.0, `vue` ^3.5.0, `vue-router` ^4.5.0 | `innoboxrr-form-core` ^2.6.0, `innoboxrr-react-form-elements` ^3.4.0, `react` ^19.0.0, `react-dom` ^19.0.0, `react-router-dom` ^7.0.0 |
| Exports | `DataTable` (default), `useDataTable`, `DataTableComponent`, `SelectPaginationComponent`, `DEFAULT_LABELS` | The same, plus `registerRoutes`, `buildPath`, `hasRoute` and `resetRoutes` |

The table notifies with `notify()` and confirms with `confirmAction()`. To see them, mount `ToastRegionComponent` and `ConfirmHostComponent` **once** in the application.

## Usage

::: code-group

```vue [Vue]
<template>
    <DataTable
        ref="table"
        :data-url="route('api.acme.shop.product.index')"
        data-method="get"
        :policy-url="route('api.acme.shop.product.policies')"
        policy-method="get"
        :model="model"
        :form-filters="filters"
        selectable>
        <template #filterForm>
            <FilterForm @submit="filters = $event" />
        </template>
    </DataTable>
</template>

<script setup>
    import { ref } from 'vue'
    import DataTable from 'innoboxrr-vue-datatable'
    import route from 'innoboxrr-route-resolver'
    import * as model from './models/product'
    import FilterForm from './FilterForm.vue'

    const table = ref(null)
    const filters = ref({})

    // After creating or editing in a drawer: table.value.refresh()
</script>
```

```jsx [React]
import { useRef, useState } from 'react'
import DataTable, { registerRoutes } from 'innoboxrr-react-datatable'
import route from 'innoboxrr-route-resolver'
import * as productModel from './models/product'
import FilterForm from './FilterForm.jsx'

registerRoutes({
    AdminCreateProduct: '/admin/products/create',
    AdminEditProduct: '/admin/products/:id/edit',
})

export default function Products() {
    const table = useRef(null)
    const [filters, setFilters] = useState({})

    // After creating or editing in a drawer: table.current.refresh()

    return (
        <DataTable
            ref={table}
            dataUrl={route('api.acme.shop.product.index')}
            dataMethod="get"
            policyUrl={route('api.acme.shop.product.policies')}
            policyMethod="get"
            model={productModel}
            formFilters={filters}
            selectable
            filterForm={<FilterForm onSubmit={setFilters} />} />
    )
}
```

:::

## Props

| Prop | Default | What it does |
|---|---|---|
| `dataUrl` | required | Where rows come from. |
| `policyUrl` | required | Where permissions are asked. |
| `dataMethod`, `policyMethod` | `'post'` | `'get'` sends the payload in the query string, without `_token`. `'post'` sends it in the body, with `_token`. Write them in lowercase. |
| `model` | required | The model contract (below). |
| `formFilters` | `{}` | The filter form's values. A change goes back to page 1 and clears the selection. |
| `externalFilters` | `{}` | Filters set by whoever mounts the table. A change reloads without changing page and clears the selection. |
| `extraParams` | `{}` | Merged into route actions' `params`. |
| `extraQuery` | `{}` | Merged into route actions' `query`. |
| `hideColumns` | `[]` | Column ids to hide, as `'name'` or `{ id: 'name' }`. Both forms were in use, so both are accepted. |
| `selectable` | `false` | Row checkboxes and the bulk actions bar. |
| `showTopbar` | `true` | The top bar: actions menu, refresh and filters. |
| `hasActions` | `true` | The top bar menu and each row's actions column. |
| `hasFilter` | `true` | The filters button and panel (requires `showTopbar`). |
| `showTableHeader` | `true` | The header row. |
| `cardWrapper` | `true` | Wraps the table in the theme's surface. |
| `labels` | `{}` in Vue, `null` in React | Text; merged over `DEFAULT_LABELS`. |
| `filterForm` slot | — | Vue: the filters panel form. |
| `filterForm` | `null` | React: the same, as a prop. |

::: warning Only `get` and `post` carry a payload
The table puts the payload in `params` when the method is exactly `'get'`, and in `data` when it is exactly `'post'`. With `'GET'` in uppercase, or any other verb, the request goes out with no filters, no sorting and no page.
:::

## What the `ref` exposes

| Vue (`table.value`) | React (`table.current`) | What it is |
|---|---|---|
| `refresh()` | `refresh()` | Reloads, keeping the page, sorting and filters. |
| `clearSelection()` | `clearSelection()` | Clears the selection. |
| `selectedIds` | `selectedIds` | The selected ids, as strings. |
| `table` | `table` | The TanStack Table instance. |
| `crudActions` | — | The top bar actions with their resolved permission. |
| `dataTable` | — | `{ head, body }`, for compatibility with the previous version. |
| `pagination` | — | `{ meta, links }`, for compatibility. |

In React, `ref` arrives as a prop, as React 19 allows.

## The model contract

It is **the same file** for Vue and React: pure functions and HTTP calls, with nothing from a UI framework. LaraPack generates it in `src/models/<model>/index.js`. This is a trimmed version of what it writes:

```js
import makeHttpRequest, { RequestCancelledError } from 'innoboxrr-http-request'
import { confirmAction } from 'innoboxrr-form-core'
import route from 'innoboxrr-route-resolver'
import t from 'innoboxrr-i18n'

export const API_ROUTE_PREFIX = 'api.acme.shop.product.'

const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''

// FILTERS: module state the table fills before every request
let filters = {}

export const setFilters = (newFilters = {}) => {
    filters = { ...filters, ...newFilters }

    return filters
}

export const getFilters = () => filters

// THE TOP BAR
export const crudActions = () => [
    {
        id: 'create',
        name: t('Create'),
        icon: 'plus',
        route: true,
        policy: false,
        params: { to: { name: 'AdminCreateProduct', params: {} } },
    },
    {
        id: 'export',
        name: t('Export'),
        icon: 'download',
        route: false,
        policy: false,
        callback: 'exportModel',
        params: {},
        success: t('The export is being prepared. You will be notified when it is ready.'),
    },
]

// THE SELECTION BAR
export const bulkActions = () => [
    {
        id: 'status-published',
        name: t('Status') + ': ' + t('Published'),
        icon: 'edit',
        callback: 'bulkUpdateModels',
        params: { status: 'published' },
        success: t('Records updated'),
    },
    {
        id: 'bulkDelete',
        name: t('Delete'),
        icon: 'delete',
        danger: true,
        callback: 'bulkDeleteModels',
        params: {},
        success: t('Records deleted'),
    },
]

// THE COLUMNS
export const dataTableHead = () => [
    { id: 'id', value: t('ID'), sortable: true, html: false },
    {
        id: 'name',
        value: t('Name'),
        sortable: true,
        html: false,
        component: 'ClickToEdit',
        parser: (value, row) => ({ value, label: t('Name'), save: (next) => updateField(row.id, 'name', next) }),
    },
    {
        id: 'status',
        value: t('Status'),
        sortable: true,
        html: false,
        parser: (value) => ({ draft: t('Draft'), published: t('Published') })[value] ?? value,
    },
]

export const dataTableSort = () => ({ id: 'asc' })

// THE CALLBACKS
const confirmOrCancel = async (options) => {
    if (! await confirmAction(options)) {
        throw new RequestCancelledError()
    }
}

export const exportModel = async (data = {}) => {
    await confirmOrCancel({ message: t('Are you sure you want to export this item?') })

    return makeHttpRequest('post', route(API_ROUTE_PREFIX + 'export'), { _token: csrfToken(), ...data })
}

export const bulkUpdateModels = (ids, rows = [], data = {}) => {
    return makeHttpRequest('put', route(API_ROUTE_PREFIX + 'bulk.update'), { _token: csrfToken(), ids, data })
}

export const updateField = async (modelId, field, value) => {
    try {
        return await bulkUpdateModels([modelId], [], { [field]: value })
    } catch (error) {
        const response = error?.response?.data ?? {}

        throw new Error(response.errors?.[`data.${field}`]?.[0] ?? response.message ?? t('Could not save'))
    }
}

export const bulkDeleteModels = async (ids) => {
    await confirmOrCancel({ message: t('Are you sure you want to delete the selected items?'), variant: 'danger' })

    return makeHttpRequest('delete', route(API_ROUTE_PREFIX + 'bulk.delete'), { _token: csrfToken(), ids })
}
```

### `crudActions()` and row actions

`crudActions()` provides the top bar's actions. Row actions come from the server, in each record's `actions` array, with the same shape: the model's Resource declares them, see [Routes, immutables, secrets and users](/en/larapack/actions).

| Key | What it does |
|---|---|
| `id` | Identifies the action; it's the key looked up in the permissions response. |
| `name` | The menu text. |
| `icon` | A semantic icon name. |
| `route` | `true` navigates; `false` calls a model callback. |
| `link` | With `route: true`, opens `params.link` with `window.open` in `params.target` (`_self` by default). |
| `params` | For a route, `params.to` is `{ name, params, query }`. For a callback, it's what the callback receives. |
| `callback` | The name of a model export. |
| `policy` | `true` keeps it always enabled; otherwise the permissions response enables it. |
| `success` | A success toast when the callback finishes. |
| `danger` | Paints it red. Without it, `delete` and `forceDelete` are red anyway. |

How each kind runs:

- **Route** (`route: true`). It navigates to `params.to.name`:
  - with `params.to.params` plus `extraParams`;
  - with `params.to.query` plus `extraQuery`.

  Vue uses `router.push`; React uses `buildPath()` and `useNavigate`. With no router, or if navigation fails, the table shows `actionFailed` and logs the details to the console.
- **Link** (`route: true, link: true`). It opens `params.link`.
- **Callback** (`route: false`). It calls `model[callback](params)`:
  - If the export doesn't exist, the table shows `actionFailed`.
  - When the callback finishes, the table shows `success` (if set) and reloads.
  - If it rejects with `RequestCancelledError` or `CanceledError`, the table neither notifies nor reloads: the user said no.
  - If it rejects with any other error, the table shows the server's `message`, or `actionFailed`.

### `dataTableHead()`

| Key | What it does |
|---|---|
| `id` | The value's key in the row, and the column name used for sorting. |
| `value` | The header text. |
| `sortable` | Only `true` makes it sortable: a button in the header, with `aria-sort`. |
| `numeric` | Aligns the column as a number (`fe-numeric`). |
| `html` | Renders the parser result as HTML. |
| `parser(value, row)` | Transforms the value. It receives a **copy** of the row: mutating it doesn't change the table's data. |
| `component` | The name of a component from `dataTableComponents()`. |
| `callback(payload, row)` | Called when the cell component emits `callback` (Vue) or calls `onCallback` (React). |

::: warning `html: true` renders as is
The cell uses `v-html` in Vue and `dangerouslySetInnerHTML` in React. If the parser includes user-written data, escape it first; otherwise anyone who edits that field injects markup into an administrator's table.
:::

### `dataTableSort()`

Returns a `{ column: 'asc' | 'desc' }` object with each column's starting direction.

- **The first load** requests `orderBy: 'id'`, with `orderMode` set to whatever `dataTableSort()` gives for `id`.
- **Clicking a sortable header** sorts by that column and toggles the direction. If `dataTableSort()` already gave it `'asc'`, the first click makes it `'desc'`; if it isn't mentioned, `'asc'`.

### `setFilters(filters)`

The table calls `setFilters()` with the full payload **before every request**. The generated contract stores it as module state and returns it from `getFilters()`, so other model functions can reuse the current filters. Since 3.1.1 it no longer receives `_token`.

### `dataTableComponents()`: optional

Returns `{ Name: Component }`. A column with `component: 'Name'` renders that component in every cell:

- **Its props** are the object the `parser` returns. If the parser returns anything else, the component receives `{ value }`.
- **To notify the column,** the component emits `callback` (Vue) or calls `onCallback(payload)` (React), and the table calls the column's `callback(payload, row)`.

The contract doesn't import components, because it's the same file for both frameworks: each widget adds them. This is how the generated code does it:

::: code-group

```js [Vue]
import { ClickToEditComponent } from 'innoboxrr-form-elements'
import * as model from '../index'

const tableModel = {
    ...model,
    dataTableComponents: () => ({ ClickToEdit: ClickToEditComponent }),
}
```

```jsx [React]
import { ClickToEditComponent } from 'innoboxrr-react-form-elements'
import * as model from '../index'

// The cell passes `save`, the shared contract's name; the React prop is `onSave`
const ClickToEdit = ({ save, ...props }) => <ClickToEditComponent {...props} onSave={save} />

const tableModel = {
    ...model,
    dataTableComponents: () => ({ ClickToEdit }),
}
```

:::

### `bulkActions()`: optional

| Key | What it does |
|---|---|
| `id` | Identifies the action. |
| `name`, `icon` | The button in the selection bar. |
| `callback` | The model export called with `(ids, rows, params)`. |
| `params` | The third argument. With it, one function serves several actions: publishing and moving to draft are the same call with a different value. |
| `danger` | A red button. |
| `success` | A toast when it finishes. |

## What the table asks the server for

Before each load, the table builds this payload and passes it to `setFilters()`:

```js
// Before the user clicks a header
{ managed: true, except_view_any: true, ...formFilters, orderBy, orderMode, ...externalFilters, page }

// After: the user's sorting wins over whatever the filters carry
{ managed: true, except_view_any: true, ...formFilters, ...externalFilters, orderBy, orderMode, page }
```

`managed`, `except_view_any`, `orderBy`, `orderMode` and `page` are the parameters the generated index requests understand, on top of search-surge.

The response is read at the root:

- `data`: the rows;
- `meta`: `current_page`, `last_page`, `from`, `to` and `total`;
- `links`.

::: tip If the table is empty and the server did respond
The Laravel resource has to respond unwrapped: the base application calls `JsonResource::withoutWrapping()`. More cases in [Troubleshooting](/en/help/).
:::

- **One request per change.** Several changes in the same tick are merged into a single request; for example, a new filter that also goes back to page 1.
- **Only the latest response counts.** A late response doesn't overwrite a later request's response.

## The CSRF token

Since 3.1.1:

| Method | Where the payload goes | `_token` |
|---|---|---|
| `get`, `head` | In the query string | **No**; it is stripped even if a filter carries it |
| `post` | In the body | Yes: `globalThis.csrf_token` or, if that doesn't exist, the `content` of `<meta name="csrf-token">` |

The same applies to the permissions request.

::: tip Why
In the base application pilot, the table requested `GET /api/app/product/index?_token=…`. The token ended up in access logs, proxies and browser history. It wasn't needed:

- Laravel doesn't check CSRF on GET.
- axios already sends the `X-XSRF-TOKEN` header from the cookie.
:::

## Selection and bulk actions

With `selectable`, every row gets a checkbox. The header checkbox selects the rows on the current page, and Shift + click selects a range.

- **Ids.** Selection is keyed by `row.id`, so it survives page changes. A filter change discards it: it belonged to a different listing.
- **The bar.** With at least one row selected, the top bar is replaced by the selection bar, in the same place so the table doesn't jump. It shows the count, one button per bulk action and «Clear selection».
- **What each action receives.** `model[callback](ids, rows, params)`:
  - `ids`: every selected id, **including those on other pages**;
  - `rows`: the loaded rows among them;
  - `params`: the action's params.
- **On success,** the selection is cleared, `success` is shown and the table reloads.
- **On failure,** the selection is kept. A cancellation isn't reported.

In generated code, checkboxes only appear if `bulkActions()` returns something. There are two sources of actions:

- **`bulkDelete`** generates the delete action.
- **`bulkUpdate`** generates one action per value of each updatable `enum`. For example, «Status: Published» calls `bulkUpdateModels(ids, rows, { status: 'published' })`.

## Inline editing

LaraPack makes a column editable in its cell when all of this holds:

- the model declares `bulkUpdate`;
- it's single-line text: `string` or `char`;
- it's in the form (`form`), is `updatable` and uses `TextInputComponent`;
- it isn't `secret`.

The generated column:

```js
{
    id: 'name',
    value: t('Name'),
    sortable: true,
    html: false,
    component: 'ClickToEdit',
    parser: (value, row) => ({ value, label: t('Name'), save: (next) => updateField(row.id, 'name', next) }),
}
```

This is how it works:

1. **Saving.** `updateField(id, field, value)` saves **only that field** through `bulk.update`.
2. **A 422.** If the API rejects it, `updateField` throws an `Error` with the rule's message (`errors['data.<field>'][0]`).
3. **The cell.** `ClickToEditComponent` shows that message and stays open: closing it would show a value that wasn't saved.
4. **On success,** the cell shows the new value without reloading the table.

The LaraPack side is covered in [The generated UI](/en/larapack/ui).

## Permissions

Before opening a menu, the table asks `policyUrl` and **waits** for the answer:

- **What it sends.** `{ id }` with the row id, or `{ id: null }` for the top bar.
- **What it expects.** An object like `{ create: true, export: false }`. Each `true` enables the action with that `id`.
- **Anything not allowed** shows as disabled and explains why (`notAllowed`) instead of disappearing.
- **Caching.** The answer is kept until the next load, so opening the same menu twice doesn't ask twice.
- **If the request fails,** the table shows `policiesFailed` and the menu opens with everything disabled, except actions with `policy: true`. That's better than a button that does nothing.

Waiting has a reason. The menu used to open instantly with everything disabled and enable items when the answer arrived, so users watched what they couldn't do flicker.

## Loading and errors

- **The first load** renders five skeleton rows with `SkeletonComponent`. Later loads keep the current rows and mark the table with `aria-busy`.
- **With no rows, the reason goes inside the table:**
  - **403.** `forbidden`, with no retry button: it won't fix itself.
  - **No response (network down).** `offline` and «Retry».
  - **Any other error.** The server's `message`, or `failed`, and «Retry».
- **With rows on screen, the error goes into a toast** and the rows stay. A 403 does clear them.
- **No silent retries.** A failure used to be retried three times without a word, and a 403 left the table empty with «No results found», as if there were no records.

The footer (`SelectPaginationComponent`) shows «from–to of total» and the page buttons. It's hidden when there's an error and no rows, so it doesn't contradict the reason the table already gives.

| Piece | Vue | React |
|---|---|---|
| `SelectPaginationComponent` | props `meta`, `links`, `labels`; `updatePage` event | props `meta`, `labels`, `onPageChange` |
| `DataTableComponent` | receives the TanStack Table instance in `table`; `sortColumn` and `retry` events | the same, with `onSortColumn` and `onRetry` |

## Labels and languages

The default labels are in Spanish. Pass your own with `labels`: they're merged over `DEFAULT_LABELS`, so only the ones that change are needed.

| Key | Default | Key the generated module translates it with |
|---|---|---|
| `actions` | Acciones | `Actions` |
| `rowActions` | Acciones del registro | `Record actions` |
| `refresh` | Actualizar | `Refresh` |
| `filters` | Filtros | `Filters` |
| `selectAll` | Seleccionar todos los de esta página | `Select all on this page` |
| `selectRow` | Seleccionar el registro | `Select record` |
| `selection` | Selección | `Selection` |
| `selected` | seleccionados | `selected` |
| `clearSelection` | Quitar selección | `Clear selection` |
| `empty` | No hay resultados | `No results` |
| `retry` | Reintentar | `Retry` |
| `of` | de | `of` |
| `page` | Página | `Page` |
| `previous` | Página anterior | `Previous page` |
| `next` | Página siguiente | `Next page` |
| `forbidden` | No tienes permiso para ver estos registros. | `You are not allowed to see these records.` |
| `offline` | No se pudo conectar con el servidor. | `Could not connect to the server.` |
| `failed` | No se pudieron cargar los registros. | `The records could not be loaded.` |
| `policiesFailed` | No se pudieron comprobar los permisos. | `The permissions could not be checked.` |
| `notAllowed` | No tienes permiso para esta acción. | `You are not allowed to do this.` |
| `actionFailed` | No se pudo completar la acción. | `The action could not be completed.` |

The generated module exports `tableLabels()` from `src/i18n.js`: it returns every key passed through `t()`, and its widget passes it as `:labels="tableLabels()"`. That way the table follows the application's language, like the rest of the screen.

## React: named routes

The contract points at routes **by name** (`params.to.name`), the same in Vue and React. vue-router resolves names out of the box; React Router 7 doesn't. `registerRoutes()` tells it which pattern each name maps to:

```js
import { buildPath, hasRoute, registerRoutes, resetRoutes } from 'innoboxrr-react-datatable'

registerRoutes({
    AdminEditProduct: '/admin/products/:id/edit',
    AdminProducts: '/admin/products/:tab?',
})

buildPath('AdminEditProduct', { id: 7 })                 // '/admin/products/7/edit'
buildPath('AdminEditProduct', { id: 7, from: 'list' })   // '/admin/products/7/edit?from=list'
buildPath('AdminProducts', {}, { page: 2 })              // '/admin/products?page=2'
hasRoute('AdminEditProduct')                             // true
resetRoutes()                                            // empties the registry (for tests)
```

`buildPath(name, params, query)` follows these rules:

- **An unregistered name.** It **throws**; returning `'#'` would hide the mistake until the first click. From the table, an action pointing at an unregistered route shows `actionFailed` and logs the details to the console.
- **A missing required parameter** (`:id`). It **throws**.
- **An optional parameter with no value** (`:tab?`). It's removed from the path.
- **Values** are encoded with `encodeURIComponent`.
- **Anything that doesn't fit the pattern** goes to the query string, as in vue-router, together with `query`.
- **Double slashes** are collapsed and **a trailing slash** is removed.

## `useDataTable`

The table's logic without the view, for rendering it differently or testing it:

::: code-group

```js [Vue]
import { useDataTable } from 'innoboxrr-vue-datatable'

// props: reactive, with the same names as DataTable's props
const {
    table, head, visibleHead, rows, clones, meta, links, loading, error,
    sort, orderBy, page, crudActions, bulkActions, rowActions, selectedIds,
    refresh, clearSelection, sortColumn, updatePage, preparePolicies, run, runBulk,
} = useDataTable(props, { navigate: (target) => router.push(target), labels })
```

```jsx [React]
import { useDataTable } from 'innoboxrr-react-datatable'

const {
    table, visibleHead, rows, clones, meta, loading, error,
    sort, orderBy, crudActions, bulkActions, rowActions, selectedIds,
    refresh, clearSelection, sortColumn, updatePage, preparePolicies, run, runBulk,
} = useDataTable({ ...props, navigate, labels })
```

:::

`navigate` receives `{ name, params, query }`. Without `navigate`, a route action shows `actionFailed`. In Vue the first load happens on mount.

## Upgrading

### From 3.1.0 to 3.1.1

- **GET and HEAD no longer carry `_token`,** neither in the data request nor in the permissions request. POST still sends it.
- **`setFilters()` no longer receives `_token`.** If your model reused those filters for a POST (an export, for example), add the token yourself, as the generated `exportModel` does with `_token: csrfToken()`.

### From 3.0 to 3.1

- Bulk actions receive `params` as the third argument: `model[callback](ids, rows, params)`.

### From 2.x to 3.0

- **Removed components.** The menu is `MenuComponent` from the form components.
  - Vue no longer has `NavDropdownComponent`, `IconRouteComponent`, `IconLinkComponent`, `DisabledLinkComponent` or `PaginationComponent`.
  - React no longer has `ActionListComponent`, `DatatableIcon`, `NavDropdownComponent`, `IconRouteComponent`, `IconLinkComponent` or `DisabledLinkComponent`.
- **Navigation.** Route actions navigate from the menu: `router.push` in Vue, `useNavigate` in React. In Vue it's no longer a `<router-link>`.
- **Pieces.** `DataTableComponent` receives the TanStack Table instance in `table`. `SelectPaginationComponent` still receives `meta`.
- **Labels.** They're in Spanish and changed through `labels`.
- **Retries.** A failure is no longer retried silently: it shows, and you retry by hand.
- **Dependencies.** The form components become a peer dependency, and `innoboxrr-form-core` moves to `^2.6`, which brings the listing classes.

LaraPack's guide covers moving a generated module to this version: [Upgrade guide](/en/larapack/upgrade).
