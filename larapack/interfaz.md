# La interfaz generada

Con `--vue`, `--react` o los dos, cada modelo recibe su módulo de administración. Se usa como una aplicación de escritorio: la tabla se queda montada, el alta y la edición se abren en drawers, las acciones de un registro son un menú y Ctrl+K abre una paleta de comandos. No depende de ningún framework CSS: el aspecto sale de `innoboxrr-form-core`.

```bash
php vendor/bin/builder larapack:import --vue
php vendor/bin/builder larapack:import --react
php vendor/bin/builder larapack:import --vue --react
```

Los dos módulos salen del mismo `laraimport.json` y tienen exactamente la misma estructura. Qué archivo sale y cuándo está en [Qué se genera](/larapack/que-se-genera#el-modulo-de-interfaz); cómo se monta en una aplicación, en [Montar un paquete en una aplicación](/larapack/montar-en-aplicacion).

## Vue y React

**`src/models/<kebab>/index.js` es el mismo archivo en los dos.** Son funciones puras y llamadas HTTP, sin nada de un framework de UI. Si cada framework tuviera su contrato, no habría un contrato. Lo que cambia es sólo la presentación:

| | Vue | React |
|---|---|---|
| Componentes | `<script setup>`, `.vue` | Funciones, `.jsx` |
| Enlace de datos | `v-model` | `value` y `onChange(valor)` |
| Store | Pinia 3 | Zustand 5, con la misma superficie |
| Router | vue-router 4 | React Router 7 |
| Formularios y piezas | `innoboxrr-form-elements` | `innoboxrr-react-form-elements` |
| Tabla | `innoboxrr-vue-datatable` | `innoboxrr-react-datatable` |
| Qué pide sesión | `meta.auth` | `handle.auth` |
| Avisar al guardar | evento `updateData` | `onUpdateData` |

Los dos paquetes de formularios exportan los mismos 37 nombres, y un test en cada uno falla si uno se adelanta al otro.

## Cómo se usa

- **El índice deja la tabla montada.** El alta se abre en un drawer encima; al guardar, la tabla se recarga en su sitio con `refresh()`, sin perder página, orden ni filtros.
- **El detalle** enseña la forma del registro mientras llega y abre la edición en otro drawer sobre la ficha.
- **Las rutas conservan sus nombres**: un enlace a `AdminCreatePost` o `AdminEditPost` abre el drawer que toca.
- **Crear, guardar y borrar lo confirman con un aviso**; borrar y exportar preguntan antes con la confirmación del tema.
- **Las acciones de un registro son un menú desplegable**, que se abre con el teclado y se cierra con Escape.
- **Ctrl+K o Cmd+K** abre, desde el índice, la paleta de comandos: crear, exportar y recargar.
- **La tabla** resuelve los permisos de cada fila antes de abrir su menú, pinta esqueletos mientras carga y explica un 403 en lugar de enseñar una tabla vacía.
- **Seleccionar filas** abre la barra de [acciones masivas](/larapack/acciones#acciones-masivas).
- **Una columna de texto** que el formulario edita [se edita en su celda](/larapack/acciones#edicion-en-la-celda).
- **Exportar avisa** al pedirse: el archivo llega después, por notificación.

## Las rutas

Para `Post`, montadas por la aplicación bajo `/admin`:

| Nombre (Vue) o id (React) | Ruta | Vista | Necesita |
|---|---|---|---|
| `AdminPosts` | `/admin/post` | `AdminView` | `index` y `policies` |
| `AdminCreatePost` | `/admin/post/create` | `CreateView`, en el drawer del índice | además `create` |
| `AdminShowPost` | `/admin/post/:id` | `ShowView` | además `show` |
| `AdminEditPost` | `/admin/post/:id/edit` | `EditView`, en el drawer de la ficha | además `show` y `update` |

La ruta del modelo es su nombre en kebab-case y en singular: `OrderLine` va a `order-line`.

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

- **`auth: true` declara que la ruta pide sesión, y decide el router de la aplicación.** El módulo no importa ningún middleware del anfitrión: si lo hiciera, sólo compilaría dentro de la aplicación que lo define.
- **`title` es un getter**: se traduce cada vez que el router lo lee, con el idioma que haya elegido la aplicación, así que da igual si el módulo se importa antes de `setLocale()`.
- **Los componentes se cargan bajo demanda.** En React, con `lazy`, para que el archivo de rutas siga siendo JavaScript sin JSX.
- `src/routes/index.js` del módulo reúne las rutas de todos los modelos con `import.meta.glob('../models/*/routes/index.js', { eager: true })`: un modelo nuevo aparece solo.

## Las vistas

**`AdminView`** es el índice. Pinta las migas, la tabla y la paleta de comandos, y el drawer de alta cuando la ruta es `AdminCreatePost`. Cuando la ruta es la ficha o su edición, pinta la ficha en su lugar. Al crear, avisa «Record created», cierra el drawer y llama a `refresh()` de la tabla. Exportar desde la paleta pide lo mismo que la barra de la tabla.

**`ShowView`** es la ficha. Carga el registro con el store al montarse y cada vez que cambia el id, y mientras llega el de la ruta enseña esqueletos, nunca el registro anterior. Pinta `ModelCard` y `ModelProfile`, pone la [columna que nombra al registro](/larapack/acciones#display) en las migas y en `document.title`, y abre la edición en un drawer. Al guardar, avisa «Changes saved», cierra el drawer y recarga.

**`CreateView` y `EditView`** viven dentro de su drawer: no pintan migas ni título, y no deciden adónde ir. Consultan `getPolicy('create')` o `getPolicy('update', id)` al montarse, con la redirección comentada para que la decidas tú; la API rechaza igualmente lo que la política no permite. Cuando el formulario guarda, avisan: con el evento `updateData` en Vue, con `onUpdateData` del contexto del `Outlet` en React. La vista que abrió el drawer decide qué pasa.

**`ModelCard`** muestra el nombre del registro y su menú de acciones: «Show», «Edit» (con `update`) y «Delete» (con `delete`). Borrar pregunta, avisa «Record deleted» y vuelve al índice; cancelar la confirmación no cuenta como error.

**`ModelProfile`** muestra el id y la fecha de creación, formateada con el idioma de la página. Es el sitio para añadir más campos.

::: warning Un formulario no navega al guardar
Si un formulario editado navega por su cuenta, el drawer se queda abierto sobre otra página. Avisa y deja que decida la vista.
:::

## Formularios {#formularios}

`CreateForm` y `EditForm` salen de las propiedades del contrato:

- **`form: true` pinta el campo; `form_submit: true` lo manda.** Un campo con `form` y sin `form_submit` se ve y no viaja. Una propiedad con `form_submit` y sin `form` no se pinta: se convierte en prop del formulario, que tiene que llegar desde fuera.
- **Cada campo lleva `validators="required"`.** La validación del navegador es de `innoboxrr-js-validator`. Si un campo es opcional, quítale el atributo en los dos formularios.
- **Las metas editables** tienen su campo de texto, sin `required`. Ver [Metas y payload](/larapack/metas#los-formularios).
- **Al enviar**, se valida en el navegador, se llama a `create` o `update` del store con los campos que viajan, y un 422 pinta los errores de la API sobre el mismo formulario con `appendExternalErrors`. Después se emite `submit` con el registro (en React, `onSubmit`).
- **`EditForm`** carga el registro por su id y rellena sólo los campos que declara, desde la columna o desde `payload`, para que un campo nuevo de la API no se cuele en la actualización.
- El componente de cada campo sale de `form_component`; cómo se escribe cada uno está en [Componentes de formulario](/larapack/laraimport#componentes-de-formulario).

`FilterForm` tiene un campo `id` más uno por cada propiedad con `form`: un select si tiene `enum`, un campo de texto si no. Al buscar manda el objeto de filtros completo, también los vacíos, para que un campo vaciado limpie su filtro; «Reset» vuelve al estado inicial y busca.

## La tabla

`widgets/DataTable` envuelve la tabla del ecosistema con lo que ya sabe del modelo:

| Prop | Por defecto | Qué es |
|---|---|---|
| `showTopbar` | `true` | La barra superior. |
| `hasActions` | `true` | La columna de acciones. |
| `hasFilter` | `true` | El panel de filtros, con `FilterForm`. |
| `externalFilters` | `{}` | Filtros fijos que pone quien monta la tabla. |
| `extraParams` | `{}` | Parámetros extra de la petición. |
| `hideColumns` | `[]` | Columnas que no se pintan. |
| `cardWrapper` | `true` | La tarjeta alrededor. |

- Pide `index` y `policies` por `GET`, a las rutas del modelo.
- Pasa `labels={tableLabels()}`, para que los textos de la tabla sigan el idioma de la aplicación.
- Activa `selectable` sólo si `bulkActions()` tiene alguna acción.
- Añade `ClickToEdit` en `dataTableComponents` para la [edición en la celda](/larapack/acciones#edicion-en-la-celda).
- Expone `refresh()`: con `defineExpose` en Vue y a través de `ref` en React.

Las acciones de cada fila las manda la API en el array `actions` del recurso. Una acción con `route: true` navega a `params.to.name`; una con `route: false` llama a `model[callback](params)`, así que `callback` tiene que ser un export real del contrato. Si la acción trae `success`, la tabla lo avisa al terminar. La tabla por dentro está en [Tablas](/interfaz/datatables).

## El store

`store/index.js` guarda el estado del modelo con la misma superficie en los dos frameworks:

| Miembro | Qué es |
|---|---|
| `items`, `meta`, `links` | La última página del índice, tal como la manda Laravel. |
| `current` | El último registro cargado, creado o actualizado. |
| `policies` | Las habilidades de la última consulta. |
| `loading`, `error` | El estado de la última operación. |
| `isEmpty` | Sin carga en curso y sin elementos. En Vue es un `computed`; en React se lee con el selector `selectIsEmpty`. |
| `can(habilidad)` | Si `policies[habilidad]` es `true`. |
| `fetchIndex(params)` | Carga el índice. Con `index`. |
| `fetchOne(id, relaciones, conteos)` | Carga un registro en `current`. Con `show`. |
| `fetchPolicies(id)` | Carga las habilidades. Con `policies`. |
| `create(data)` | Crea y lo pone al principio de `items`. Con `create`. |
| `update(id, data)` | Actualiza y sustituye en `items`. Con `update`. |
| `remove(id)` | Borra, con confirmación, y lo quita de `items`. Con `delete`. |
| `reset()` | Vacía el estado. |

El id del store lleva el namespace (`acme.catalogo.post`), para que dos módulos con un modelo del mismo nombre no compartan estado.

## El contrato del modelo {#contrato}

`src/models/<kebab>/index.js`:

| Export | Qué es | Existe con |
|---|---|---|
| `API_ROUTE_PREFIX` | `api.<namespace>.<snake>.`, el mismo prefijo que registra el `RouteServiceProvider`. `larapack:verify` lo comprueba. | siempre |
| `csrfToken()` | Lee `<meta name="csrf-token">` en el momento de usarse. | siempre |
| `setFilters()`, `getFilters()`, `resetFilters()` | Los filtros, como estado del módulo, que la tabla lee por su cuenta. | siempre |
| `crudActions()` | La barra de la tabla: «Create», que navega a `AdminCreate<Model>`, y «Export», que llama a `exportModel`. | cada una, su acción |
| `bulkActions()` | Las acciones de la selección. | siempre; vacío sin masivas |
| `dataTableHead()` | Las columnas: `id` y cada propiedad con `datatable`, con su etiqueta traducida, la etiqueta de su `enum` o su edición en la celda. | siempre |
| `dataTableSort()` | Orden por defecto: la primera columna con `datatable`, ascendente, o `id`. | siempre |
| `getPolicies(id)` | `GET policies`. | `policies` |
| `getPolicy(policy, id)` | `GET policy`. | `policy` |
| `indexModel(params)` | `GET index`. | `index` |
| `showModel(id, relaciones, conteos, data)` | `GET show`. | `show` |
| `createModel(data)` | `POST create`. | `create` |
| `updateModel(id, data)` | `PUT update`. | `update` |
| `deleteModel({ id })` | Pregunta y hace `DELETE delete`. | `delete` |
| `restoreModel({ id })` | `POST restore`. | `restore` |
| `forceDeleteModel({ id })` | Pregunta y hace `DELETE force-delete`. | `forceDelete` |
| `exportModel(data)` | Pregunta y hace `POST export`. | `export` |
| `bulkUpdateModels(ids, filas, data)` | `PUT bulk-update`. | `bulkUpdate` |
| `updateField(id, campo, valor)` | Guarda un campo desde su celda. | `bulkUpdate` |
| `bulkDeleteModels(ids)` | Pregunta y hace `DELETE bulk-delete`. | `bulkDelete` |

Las peticiones van con `innoboxrr-http-request` a la URL que resuelve `route()` de `innoboxrr-route-resolver`, así que nada en el módulo escribe una URL.

- **Las lecturas no mandan `_token`.** `innoboxrr-http-request` pone los datos de un `GET` o un `HEAD` en la query, y el token acabaría en la URL, en el historial y en los logs del servidor. `getPolicies`, `getPolicy`, `indexModel` y `showModel` no lo mandan; Laravel no lo pide para leer.
- **Las escrituras sí**: crear, actualizar, borrar, restaurar, borrar para siempre, exportar y las masivas mandan `_token: csrfToken()`.
- **Las lecturas se reintentan** hasta 3 veces, cada 1,5 segundos; las escrituras, nunca.
- **Lo que no se deshace pregunta antes**, con `confirmAction` de `innoboxrr-form-core`. Cancelar rechaza con `RequestCancelledError`, que la tabla y las vistas reconocen: nadie avisa de lo que el usuario decidió no hacer.

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

Los datatables `innoboxrr-vue-datatable` e `innoboxrr-react-datatable` hacen lo mismo con sus propias peticiones desde la 3.1.1: no mandan `_token` por `GET`.

## Avisos y confirmaciones

Las vistas avisan con `notifySuccess` y `notifyError`, y las funciones del contrato preguntan con `confirmAction`, todo de `innoboxrr-form-core`. Se pintan donde la aplicación monta, una sola vez, `ToastRegionComponent` y `ConfirmHostComponent`: sin ellos los avisos no se ven y la confirmación cae en `window.confirm`.

| Cuándo | Texto |
|---|---|
| Crear | `Record created` |
| Guardar la edición | `Changes saved` |
| Borrar desde la ficha o la fila | `Record deleted` |
| Cambiar la selección | `Records updated` |
| Borrar la selección | `Records deleted` |
| Pedir la exportación | `The export is being prepared. You will be notified when it is ready.` |
| Fallar una exportación | El mensaje de la API, o `The export could not be generated.` |
| Fallar un borrado | El mensaje de la API, o `The item could not be deleted` |

## Los textos {#textos}

Todo texto visible es **una clave en inglés** que se traduce al pintarse, con `t()` de `innoboxrr-i18n`: rutas, migas, paleta, drawers, tabla, menús, confirmaciones y avisos. Los nombres del modelo no se concatenan en la clave: `t('Create :name', { name: t('Post') })`, así la clave se traduce una vez para todos los modelos.

- **LaraPack mantiene `src/locales/en.json` y `es.json`.** Cada vez que genera recorre `src/` y suma las claves de `t('…')` que falten. En `en.json` la traducción es la propia clave. En `es.json`, la que LaraPack conoce; las del dominio (el nombre del modelo, sus campos, las etiquetas de un `enum`) quedan con `""`, y mientras lo estén se ve la clave en inglés.
- **Nunca pisa una traducción escrita.** Sólo rellena las vacías que conoce. Un JSON inválido se deja como está.
- **El módulo exporta `translations`** (`{ en, es }`), y la aplicación las carga antes que las suyas para poder corregirlas. Ver [Traducciones](/larapack/montar-en-aplicacion#traducciones).
- **`tableLabels()`** traduce los textos de la tabla, que los datatables traen en español fijo: `actions`, `rowActions`, `refresh`, `filters`, `selectAll`, `selectRow`, `selection`, `selected`, `clearSelection`, `empty`, `retry`, `of`, `page`, `previous`, `next`, `forbidden`, `offline`, `failed`, `policiesFailed`, `notAllowed` y `actionFailed`.
- **En Laravel**, las acciones de fila del recurso y el correo de exportación usan `__()`. LaraPack escribe en `lang/es.json` las claves que sabe traducir; la aplicación puede corregirlas en su propio `lang/es.json`.
- **Lo que escribas a mano** en el módulo lo recoge `npm run locale` (`innoboxrr-locale-generator`), en un paquete.

## El aspecto {#tema}

El módulo no necesita UIkit, Tailwind ni Font Awesome. `src/theme.js` importa la hoja de estilos una vez y deja a mano los dos ajustes:

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

- **Colores, formas y densidad** son variables CSS; se redefinen en el CSS de la aplicación:

```css
:root {
    --fe-primary: #7c3aed;
    --fe-radius: 10px;
    --fe-density: 0.875;          /* interfaz más compacta */
    --fe-table-max-height: 70vh;  /* cabecera de la tabla fija al bajar */
}
```

- **El modo oscuro** responde a la preferencia del sistema y a `data-theme="dark"` en la raíz.
- **`setTheme`** apunta un token a las clases de otro sistema visual, si la aplicación ya tiene el suyo. Un formulario generado no lleva ninguna clase, y no hay que ponerle `customClass`.
- **Los iconos se piden por nombre semántico** (`plus`, `edit`, `delete`, `show`, `download`, `actions`…) y el mapa de `setIcons` decide de qué colección salen. Un recurso de Laravel emite también el nombre semántico: `'icon' => 'show'`, no `'fa-eye'`.
- **`package.json` declara `src/theme.js` en `sideEffects`** (en Vue, junto a `*.css` y `*.vue`; en React, junto a `*.css`). Sin eso, Vite descarta el import del tema y el administrador sale sin estilos.

Los tokens y las variables están en [form-core: tema y estilos](/interfaz/form-core).

## Navegar desde React: `buildPath` {#navegar-desde-react-buildpath}

React Router no resuelve rutas por nombre. El agregador del módulo recorre el árbol de rutas y registra cada id con su ruta completa en `innoboxrr-react-datatable`, con el prefijo donde la aplicación monta el módulo:

```js
import { registerModuleRoutes } from 'acme-catalogo-react'

registerModuleRoutes('/admin')   // { AdminPosts: '/admin/post', AdminShowPost: '/admin/post/:id', … }
```

Desde una vista, navega siempre por nombre:

```jsx
import { buildPath } from 'innoboxrr-react-datatable'

navigate(buildPath('AdminShowPost', { id: post.id }))
```

Nunca escribas la ruta a mano: `buildPath` resuelve contra donde el anfitrión montó el módulo de verdad. `routeNamesOf(árbol, base)` devuelve el mismo mapa sin registrarlo.

## Las dependencias del módulo {#las-dependencias-del-modulo}

El `package.json` generado en un paquete declara:

| Paquete | Vue | React |
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

Esas restricciones admiten las versiones actuales de los satélites: los datatables 3.1.1, que no mandan `_token` por `GET`, e `innoboxrr-form-elements` 6.8.0 e `innoboxrr-react-form-elements` 3.8.0, que cargan los lenguajes de `CodeMirrorComponent` bajo demanda en lugar de meterlos todos en el bundle.

En una aplicación el módulo no tiene `package.json`: esas dependencias las declara el de la aplicación.
