# Tablas

`innoboxrr-vue-datatable` e `innoboxrr-react-datatable` (3.1.1) son el listado de administración que usa todo lo que genera LaraPack. Traen:

- una barra de acciones y filtros;
- orden y paginación en el servidor;
- selección de filas con acciones masivas;
- permisos resueltos antes de abrir cada menú;
- esqueletos mientras carga y errores que se ven.

Los dos reciben los mismos props, leen el mismo contrato de modelo y se comportan igual. La lógica común está en `src/table.js`, que es el mismo archivo en los dos paquetes: si cambia en uno, cambia en el otro.

Por debajo, [TanStack Table](https://tanstack.com/table) v9 lleva el estado de la tabla: las columnas visibles, el orden y la selección. El menú, los iconos y los esqueletos son los de los [componentes](/interfaz/form-elements), con el tema de [form-core](/interfaz/form-core).

## Instalar

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
| Dependencias | `@tanstack/vue-table` ^9.2.4, `axios` ^1.7.0 | `@tanstack/react-table` ^9.2.4, `axios` ^1.7.0 |
| Dependencias par | `innoboxrr-form-core` ^2.6.0, `innoboxrr-form-elements` ^6.4.0, `vue` ^3.5.0, `vue-router` ^4.5.0 | `innoboxrr-form-core` ^2.6.0, `innoboxrr-react-form-elements` ^3.4.0, `react` ^19.0.0, `react-dom` ^19.0.0, `react-router-dom` ^7.0.0 |
| Exporta | `DataTable` (por defecto), `useDataTable`, `DataTableComponent`, `SelectPaginationComponent`, `DEFAULT_LABELS` | Lo mismo, más `registerRoutes`, `buildPath`, `hasRoute` y `resetRoutes` |

La tabla avisa con `notify()` y confirma con `confirmAction()`. Para verlos, monta **una vez** en la aplicación `ToastRegionComponent` y `ConfirmHostComponent`.

## Uso

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

    // Tras crear o editar en un drawer: table.value.refresh()
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

    // Tras crear o editar en un drawer: table.current.refresh()

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

| Prop | Por defecto | Qué hace |
|---|---|---|
| `dataUrl` | obligatoria | De dónde salen las filas. |
| `policyUrl` | obligatoria | A quién se preguntan los permisos. |
| `dataMethod`, `policyMethod` | `'post'` | `'get'` manda el payload en la query, sin `_token`. `'post'` lo manda en el cuerpo, con `_token`. Escríbelos en minúsculas. |
| `model` | obligatoria | El contrato del modelo (abajo). |
| `formFilters` | `{}` | Los filtros del formulario. Un cambio vuelve a la página 1 y quita la selección. |
| `externalFilters` | `{}` | Filtros que pone quien monta la tabla. Un cambio recarga sin cambiar de página y quita la selección. |
| `extraParams` | `{}` | Se suman a `params` de las acciones de ruta. |
| `extraQuery` | `{}` | Se suman a `query` de las acciones de ruta. |
| `hideColumns` | `[]` | Ids de columna a ocultar, como `'name'` o `{ id: 'name' }`. Circulaban las dos formas y se admiten las dos. |
| `selectable` | `false` | Casillas en cada fila y barra de acciones masivas. |
| `showTopbar` | `true` | La barra superior: menú de acciones, recargar y filtros. |
| `hasActions` | `true` | El menú de la barra y la columna de acciones de cada fila. |
| `hasFilter` | `true` | El botón y el panel de filtros (necesita `showTopbar`). |
| `showTableHeader` | `true` | La fila de cabeceras. |
| `cardWrapper` | `true` | Envuelve la tabla en la superficie del tema. |
| `labels` | `{}` en Vue, `null` en React | Textos; se mezclan con `DEFAULT_LABELS`. |
| slot `filterForm` | — | Vue: el formulario del panel de filtros. |
| `filterForm` | `null` | React: lo mismo, como prop. |

::: warning Solo `get` y `post` llevan payload
La tabla pone el payload en `params` si el método es exactamente `'get'`, y en `data` si es exactamente `'post'`. Con `'GET'` en mayúsculas o con otro verbo, la petición sale sin filtros, sin orden y sin página.
:::

## Lo que se expone por `ref`

| Vue (`table.value`) | React (`table.current`) | Qué es |
|---|---|---|
| `refresh()` | `refresh()` | Recarga conservando la página, el orden y los filtros. |
| `clearSelection()` | `clearSelection()` | Quita la selección. |
| `selectedIds` | `selectedIds` | Los ids seleccionados, como cadenas. |
| `table` | `table` | La instancia de TanStack Table. |
| `crudActions` | — | Las acciones de la barra con su permiso resuelto. |
| `dataTable` | — | `{ head, body }`, por compatibilidad con la versión anterior. |
| `pagination` | — | `{ meta, links }`, por compatibilidad. |

En React, `ref` llega como prop, como permite React 19.

## El contrato del modelo

Es **el mismo archivo** para Vue y para React: funciones puras y llamadas HTTP, sin nada de un framework de interfaz. LaraPack lo genera en `src/models/<modelo>/index.js`. Esto es una versión reducida de lo que escribe:

```js
import makeHttpRequest, { RequestCancelledError } from 'innoboxrr-http-request'
import { confirmAction } from 'innoboxrr-form-core'
import route from 'innoboxrr-route-resolver'
import t from 'innoboxrr-i18n'

export const API_ROUTE_PREFIX = 'api.acme.shop.product.'

const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''

// FILTROS: estado de módulo que la tabla rellena antes de cada petición
let filters = {}

export const setFilters = (newFilters = {}) => {
    filters = { ...filters, ...newFilters }

    return filters
}

export const getFilters = () => filters

// LA BARRA SUPERIOR
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

// LA BARRA DE LA SELECCIÓN
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

// LAS COLUMNAS
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

// LOS CALLBACKS
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

### `crudActions()` y las acciones de cada fila

`crudActions()` da las acciones de la barra superior. Las de cada fila llegan del servidor, en el array `actions` de cada registro, con la misma forma: las declara el Resource del modelo, ver [Rutas, inmutables, secretos y usuarios](/larapack/acciones).

| Clave | Qué hace |
|---|---|
| `id` | Identifica la acción y es la clave que se busca en la respuesta de permisos. |
| `name` | El texto del menú. |
| `icon` | Un nombre semántico de icono. |
| `route` | `true` navega; `false` llama a un callback del modelo. |
| `link` | Con `route: true`, abre `params.link` con `window.open` en `params.target` (por defecto `_self`). |
| `params` | En una ruta, `params.to` es `{ name, params, query }`. En un callback, es lo que recibe. |
| `callback` | El nombre de un export del modelo. |
| `policy` | `true` la deja habilitada siempre; si no, la habilita la respuesta de permisos. |
| `success` | Un aviso de éxito cuando el callback termina. |
| `danger` | La pinta en rojo. Sin él, `delete` y `forceDelete` salen en rojo igualmente. |

Cómo se ejecuta cada tipo:

- **Ruta** (`route: true`). Navega a `params.to.name`:
  - con `params.to.params` más `extraParams`;
  - con `params.to.query` más `extraQuery`.

  Vue usa `router.push`; React, `buildPath()` y `useNavigate`. Sin router, o si la navegación falla, se avisa con `actionFailed` y el detalle va a la consola.
- **Enlace** (`route: true, link: true`). Abre `params.link`.
- **Callback** (`route: false`). Llama a `model[callback](params)`:
  - Si el export no existe, avisa con `actionFailed`.
  - Si el callback termina, muestra `success` (si lo hay) y recarga.
  - Si rechaza con `RequestCancelledError` o `CanceledError`, la tabla no avisa ni recarga: el usuario dijo que no.
  - Si rechaza con otro error, avisa con el `message` que devolvió el servidor, o con `actionFailed`.

### `dataTableHead()`

| Clave | Qué hace |
|---|---|
| `id` | La clave del valor en la fila, y el nombre de columna con el que se ordena. |
| `value` | El texto de la cabecera. |
| `sortable` | Solo `true` la hace ordenable: un botón en la cabecera, con `aria-sort`. |
| `numeric` | Alinea la columna como número (`fe-numeric`). |
| `html` | Pinta el resultado del parser como HTML. |
| `parser(value, row)` | Transforma el valor. Recibe una **copia** de la fila: mutarla no cambia los datos de la tabla. |
| `component` | El nombre de un componente de `dataTableComponents()`. |
| `callback(payload, row)` | Se llama cuando el componente de la celda emite `callback` (Vue) o llama a `onCallback` (React). |

::: warning `html: true` pinta tal cual
La celda usa `v-html` en Vue y `dangerouslySetInnerHTML` en React. Si el parser mete datos que escribió un usuario, escápalos antes: si no, cualquiera que edite ese campo inyecta marcado en la tabla de un administrador.
:::

### `dataTableSort()`

Devuelve un objeto `{ columna: 'asc' | 'desc' }` con la dirección con la que empieza cada columna.

- **La primera carga** pide `orderBy: 'id'`, con `orderMode` igual a lo que diga `dataTableSort()` para `id`.
- **Pulsar una cabecera ordenable** ordena por esa columna y alterna la dirección. Si `dataTableSort()` ya le daba `'asc'`, la primera pulsación la deja en `'desc'`; si no la menciona, en `'asc'`.

### `setFilters(filters)`

La tabla llama a `setFilters()` con el payload completo **antes de cada petición**. El contrato generado lo guarda como estado de módulo y lo devuelve con `getFilters()`, para que otras funciones del modelo reutilicen los filtros vigentes. Desde 3.1.1 ya no recibe `_token`.

### `dataTableComponents()`: opcional

Devuelve `{ Nombre: Componente }`. Una columna con `component: 'Nombre'` pinta ese componente en cada celda:

- **Sus props** son el objeto que devuelve el `parser`. Si devuelve otra cosa, recibe `{ value }`.
- **Para avisar a la columna,** el componente emite `callback` (Vue) o llama a `onCallback(payload)` (React), y la tabla llama al `callback(payload, row)` de la columna.

El contrato no importa componentes, porque es el mismo archivo para los dos frameworks: los añade cada widget. Así lo hace el código generado:

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

// La celda da `save`, el nombre del contrato compartido; en React el prop es `onSave`
const ClickToEdit = ({ save, ...props }) => <ClickToEditComponent {...props} onSave={save} />

const tableModel = {
    ...model,
    dataTableComponents: () => ({ ClickToEdit }),
}
```

:::

### `bulkActions()`: opcional

| Clave | Qué hace |
|---|---|
| `id` | Identifica la acción. |
| `name`, `icon` | El botón en la barra de la selección. |
| `callback` | El export del modelo que se llama con `(ids, rows, params)`. |
| `params` | El tercer argumento. Con él, una misma función sirve para varias acciones: publicar y pasar a borrador son la misma llamada con otro valor. |
| `danger` | El botón en rojo. |
| `success` | Un aviso cuando termina. |

## Qué pide la tabla al servidor

Antes de cada carga, la tabla arma este payload y se lo pasa a `setFilters()`:

```js
// Antes de que el usuario pulse una cabecera
{ managed: true, except_view_any: true, ...formFilters, orderBy, orderMode, ...externalFilters, page }

// Después: el orden del usuario gana a lo que traigan los filtros
{ managed: true, except_view_any: true, ...formFilters, ...externalFilters, orderBy, orderMode, page }
```

`managed`, `except_view_any`, `orderBy`, `orderMode` y `page` son los parámetros que entienden las peticiones de índice generadas, sobre search-surge.

La respuesta se lee en la raíz:

- `data`: las filas;
- `meta`: `current_page`, `last_page`, `from`, `to` y `total`;
- `links`.

::: tip Si la tabla sale vacía y el servidor respondió
El recurso de Laravel tiene que responder sin envoltorio: la aplicación base llama a `JsonResource::withoutWrapping()`. Más casos en [Solución de problemas](/ayuda/).
:::

- **Una petición por cambio.** Varios cambios en el mismo tick se juntan en una sola petición; por ejemplo, un filtro nuevo que además vuelve a la página 1.
- **Solo cuenta la última respuesta.** Una respuesta que llega tarde no pisa a la de una petición posterior.

## El token CSRF

Desde 3.1.1:

| Método | Dónde va el payload | `_token` |
|---|---|---|
| `get`, `head` | En la query | **No**; se quita aunque un filtro lo traiga |
| `post` | En el cuerpo | Sí: `globalThis.csrf_token` o, si no existe, el `content` de `<meta name="csrf-token">` |

Lo mismo vale para la petición de permisos.

::: tip Por qué
En el piloto de la aplicación base la tabla pedía `GET /api/app/product/index?_token=…`. El token acababa en los registros de acceso, en los proxies y en el historial del navegador. No hacía falta:

- Laravel no comprueba CSRF en GET.
- axios ya manda la cabecera `X-XSRF-TOKEN` desde la cookie.
:::

## Selección y acciones masivas

Con `selectable`, cada fila tiene una casilla. La casilla de la cabecera selecciona las filas de la página actual, y Mayúsculas + clic selecciona un rango.

- **Ids.** La selección se identifica por `row.id`, así que sobrevive a los cambios de página. Un cambio de filtros la descarta: era de otro listado.
- **La barra.** Con al menos una fila seleccionada, la barra superior se sustituye por la de la selección, en el mismo sitio para que la tabla no salte. Muestra cuántas hay, un botón por acción masiva y «Quitar selección».
- **Qué recibe cada acción.** `model[callback](ids, rows, params)`:
  - `ids`: todos los seleccionados, **también los de otras páginas**;
  - `rows`: las filas cargadas que están entre ellos;
  - `params`: los de la acción.
- **Si termina bien,** se quita la selección, se muestra `success` y se recarga.
- **Si falla,** la selección se conserva. Si fue una cancelación, no se avisa.

En el código generado, las casillas solo aparecen si `bulkActions()` devuelve algo. Hay dos fuentes de acciones:

- **`bulkDelete`** genera la acción de borrar.
- **`bulkUpdate`** genera una acción por cada valor de cada `enum` actualizable. Por ejemplo, «Estado: Publicado» llama a `bulkUpdateModels(ids, rows, { status: 'published' })`.

## Edición en línea

LaraPack hace editable en su celda una columna que cumple todo esto:

- el modelo declara `bulkUpdate`;
- es texto de una línea: `string` o `char`;
- está en el formulario (`form`), es `updatable` y usa `TextInputComponent`;
- no es `secret`.

La columna generada:

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

Así funciona:

1. **Guardar.** `updateField(id, campo, valor)` guarda **solo ese campo** con `bulk.update`.
2. **Un 422.** Si la API lo rechaza, `updateField` lanza un `Error` con el mensaje de la regla (`errors['data.<campo>'][0]`).
3. **La celda.** `ClickToEditComponent` enseña ese mensaje y se queda abierto: cerrarlo mostraría un valor que no se guardó.
4. **Si todo va bien,** la celda muestra el valor nuevo sin recargar la tabla.

Los detalles del lado de LaraPack están en [La interfaz generada](/larapack/interfaz).

## Permisos

Antes de abrir un menú, la tabla pregunta a `policyUrl` y **espera** la respuesta:

- **Qué envía.** `{ id }` con el id de la fila, o `{ id: null }` para la barra superior.
- **Qué espera.** Un objeto como `{ create: true, export: false }`. Cada `true` habilita la acción con ese `id`.
- **Lo no permitido** se ve deshabilitado y explica por qué (`notAllowed`) en vez de desaparecer.
- **Caché.** La respuesta se guarda hasta la próxima carga, así que abrir dos veces el mismo menú no pregunta dos veces.
- **Si la petición falla,** se avisa con `policiesFailed` y el menú se abre con todo deshabilitado, salvo las acciones con `policy: true`. Es mejor que un botón que no hace nada.

Esperar tiene una razón. Antes el menú se abría al instante con todo deshabilitado y se habilitaba al llegar la respuesta, y el usuario veía parpadear lo que no podía hacer.

## Carga y errores

- **La primera carga** pinta la forma de cinco filas con `SkeletonComponent`. Las siguientes dejan las filas que hay y marcan la tabla con `aria-busy`.
- **Sin filas, el motivo va dentro de la tabla:**
  - **403.** `forbidden`, sin botón de reintento: no se va a arreglar solo.
  - **Sin respuesta (red caída).** `offline` y «Reintentar».
  - **Otro error.** El `message` del servidor, o `failed`, y «Reintentar».
- **Con filas en pantalla, el error sale en un aviso** y las filas se quedan. Un 403 sí las vacía.
- **Sin reintentos silenciosos.** Antes un fallo se reintentaba tres veces sin decir nada, y un 403 dejaba la tabla vacía con «No results found», como si no hubiera registros.

El pie (`SelectPaginationComponent`) muestra «desde–hasta de total» y los botones de página. Se oculta cuando hay un error y no hay filas, para no contradecir el motivo que ya da la tabla.

| Pieza | Vue | React |
|---|---|---|
| `SelectPaginationComponent` | props `meta`, `links`, `labels`; evento `updatePage` | props `meta`, `labels`, `onPageChange` |
| `DataTableComponent` | recibe la instancia de TanStack Table en `table`; eventos `sortColumn`, `retry` | lo mismo, con `onSortColumn`, `onRetry` |

## Textos e idiomas

Los textos de fábrica están en español. Pasa los tuyos con `labels`: se mezclan con `DEFAULT_LABELS`, así que basta con los que cambian.

| Clave | Por defecto | Clave con la que los traduce el módulo generado |
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

El módulo generado exporta `tableLabels()` desde `src/i18n.js`: devuelve todas las claves pasadas por `t()`, y su widget lo pasa como `:labels="tableLabels()"`. Así la tabla sigue el idioma de la aplicación, como el resto de la pantalla.

## React: rutas con nombre

El contrato apunta a las rutas **por nombre** (`params.to.name`), igual en Vue y en React. vue-router resuelve nombres de fábrica; React Router 7 no. `registerRoutes()` dice a qué patrón corresponde cada nombre:

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
resetRoutes()                                            // vacía el registro (para pruebas)
```

`buildPath(nombre, params, query)` sigue estas reglas:

- **Nombre sin registrar.** **Lanza**; devolver `'#'` escondería el fallo hasta el primer clic. Desde la tabla, una acción hacia una ruta sin registrar avisa con `actionFailed` y deja el detalle en la consola.
- **Parámetro obligatorio que falta** (`:id`). **Lanza**.
- **Parámetro opcional sin valor** (`:tab?`). Desaparece del camino.
- **Los valores** se codifican con `encodeURIComponent`.
- **Lo que no encaja en el patrón** va a la query, igual que en vue-router, junto con `query`.
- **Las barras dobles** se funden y **la final** se quita.

## `useDataTable`

La lógica de la tabla sin la vista, para pintarla de otra forma o probarla:

::: code-group

```js [Vue]
import { useDataTable } from 'innoboxrr-vue-datatable'

// props: reactivo, con los mismos nombres que los props de DataTable
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

`navigate` recibe `{ name, params, query }`. Sin `navigate`, una acción de ruta avisa con `actionFailed`. En Vue la primera carga ocurre al montar.

## Actualizar

### De 3.1.0 a 3.1.1

- **GET y HEAD ya no llevan `_token`,** ni en los datos ni en los permisos. POST lo sigue mandando.
- **`setFilters()` ya no recibe `_token`.** Si tu modelo reutilizaba esos filtros para un POST (una exportación, por ejemplo), añade el token tú, como hace el `exportModel` generado con `_token: csrfToken()`.

### De 3.0 a 3.1

- Las acciones masivas reciben `params` como tercer argumento: `model[callback](ids, rows, params)`.

### De 2.x a 3.0

- **Componentes retirados.** El menú es `MenuComponent` de los componentes de formulario.
  - En Vue ya no existen `NavDropdownComponent`, `IconRouteComponent`, `IconLinkComponent`, `DisabledLinkComponent` ni `PaginationComponent`.
  - En React ya no existen `ActionListComponent`, `DatatableIcon`, `NavDropdownComponent`, `IconRouteComponent`, `IconLinkComponent` ni `DisabledLinkComponent`.
- **Navegación.** Las acciones de ruta navegan desde el menú: `router.push` en Vue, `useNavigate` en React. En Vue ya no es un `<router-link>`.
- **Piezas.** `DataTableComponent` recibe la instancia de TanStack Table en `table`. `SelectPaginationComponent` sigue recibiendo `meta`.
- **Textos.** Están en español y se cambian con `labels`.
- **Reintentos.** Un fallo ya no se reintenta en silencio: se ve, y se reintenta a mano.
- **Dependencias.** Los componentes de formulario pasan a ser dependencia par, e `innoboxrr-form-core` sube a `^2.6`, que trae las clases del listado.

La guía de LaraPack explica cómo llevar un módulo generado a esta versión: [Guía de actualización](/larapack/actualizar).
