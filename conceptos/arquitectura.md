# La arquitectura de un modelo

Un modelo declarado en `laraimport.json` produce unos 58 archivos. Parecen muchos, pero siguen un solo patrón: **cada pieza hace una cosa, y la lógica que escribes tiene un sitio fijo**. Esta página es el mapa; el detalle de cada archivo está en [Qué se genera y dónde va tu código](/larapack/que-se-genera).

Los ejemplos usan un modelo `Product` dentro de una aplicación. En un paquete, `app/` es `src/` y `App\` es el namespace del paquete.

## Una petición de principio a fin

Editar un producto desde el administrador:

```
PUT /api/app/product/update            nombre: api.app.product.update
  │
  ├─ ProductController::update          auth:sanctum; no tiene lógica
  │
  ├─ UpdateRequest
  │    authorize()  findOrFail(product_id) y can('update', $product)  → ProductPolicy
  │    rules()      product_id y las reglas del JSON
  │    handle()     $product->updateModel($this)                      → ProductStorage
  │                   update() con sólo $updatable, y las metas si las hay
  │                 new ProductResource($product)                     → incluye actions
  │                 event(new UpdateEvent(...))                        → listeners
  │
  └─ JSON: el registro y sus actions, sin envoltorio data
```

- **El controlador sólo delega.** Cada método llama al `handle()` de su request.
- **Cada acción tiene su request.** Autoriza contra la política, valida y ejecuta.
- **El modelo es una fachada.** Los métodos que trabajan viven en sus traits.
- **El Resource decide la forma de la respuesta** y las acciones que la interfaz ofrece para esa fila.
- **Los efectos secundarios van en listeners**, colgados del evento de la acción.

## Las doce acciones

Sin la clave `routes`, un modelo tiene las doce. Cada una tiene su ruta, su método en el controlador, su request, su evento, su permiso en la política, su test y, si aplica, su pantalla. Quitar una con `routes` la quita en cascada de todos esos sitios.

| Acción | Método HTTP | URL (en una aplicación) | Nombre de ruta | Permiso de la política |
|---|---|---|---|---|
| `policies` | GET | `api/app/product/policies` | `api.app.product.policies` | Consulta todos |
| `policy` | GET | `api/app/product/policy` | `api.app.product.policy` | |
| `index` | GET | `api/app/product/index` | `api.app.product.index` | `index` |
| `show` | GET | `api/app/product/show` | `api.app.product.show` | `view` |
| `create` | POST | `api/app/product/create` | `api.app.product.create` | `create` |
| `update` | PUT | `api/app/product/update` | `api.app.product.update` | `update` |
| `delete` | DELETE | `api/app/product/delete` | `api.app.product.delete` | `delete` |
| `restore` | POST | `api/app/product/restore` | `api.app.product.restore` | `restore` |
| `forceDelete` | DELETE | `api/app/product/force-delete` | `api.app.product.force.delete` | `forceDelete` |
| `export` | POST | `api/app/product/export` | `api.app.product.export` | `export` |
| `bulkUpdate` | PUT | `api/app/product/bulk-update` | `api.app.product.bulk.update` | `update`, registro a registro |
| `bulkDelete` | DELETE | `api/app/product/bulk-delete` | `api.app.product.bulk.delete` | `delete`, registro a registro |

`policies` responde, para el usuario actual y un registro opcional, qué acciones puede hacer. Es lo que consulta la tabla antes de enseñar un botón.

Tres atajos cambian la forma del modelo sin tocar código:

- `routes` con `only` o `except` elige qué acciones existen. Sin `delete`, `restore` ni `forceDelete`, el modelo pierde también el borrado lógico.
- `immutable: true` quita la edición, el borrado y las masivas, y el modelo rechaza modificaciones hechas con Eloquent.
- `secret: true` en una columna la saca de las respuestas, de la exportación y de la tabla.

Ver [Rutas, inmutables, secretos y usuarios](/larapack/acciones).

## Las capas de un modelo

### Dominio

| Archivo | Qué es |
|---|---|
| `app/Models/Product.php` | La fachada. Sus listas (`$fillable`, `$creatable`, `$updatable`, `$export_cols`, `$loadable_relations`, `$loadable_counts`) y `casts()` salen del JSON. |
| `Traits/Relations/ProductRelations.php` | Las relaciones. **Hueco.** |
| `Traits/Operations/ProductOperations.php` | La lógica de negocio. **Hueco**, y el sitio por defecto. |
| `Traits/Storage/ProductStorage.php` | Crear, actualizar y borrar, y el guardado de metas. **Hueco** para archivos. |
| `Traits/Mutators/ProductMutators.php` | Accessors y mutators. **Hueco.** |
| `Traits/Assignments/ProductAssignment.php` | Se genera vacío. |
| `Filters/Product/ManagedFilter.php` | Quién ve qué registros del índice. **Hueco.** |
| `Filters/Product/{Id,Creation,Updated,EagerLoading}Filter.php` | Filtros del índice, sobre search-surge. |
| `app/Policies/ProductPolicy.php` | Autorización por acción. **Hueco.** Nace cerrada. |
| `app/Observers/ProductObserver.php` | Ciclo de vida del modelo. **Hueco.** |
| `app/Models/ProductMeta.php` | Sólo con `metas: true`. |

### HTTP

| Archivo | Qué es |
|---|---|
| `app/Http/Controllers/ProductController.php` | Delega en los requests. |
| `app/Http/Requests/Product/*Request.php` | Uno por acción. `rules()` es **hueco**, dentro del array. |
| `app/Http/Resources/Models/ProductResource.php` | La forma de la respuesta y el array `actions`. **Hueco.** |
| `app/Http/Events/Product/Events/*` | Un evento por acción. |
| `app/Http/Events/Product/Listeners/*/*` | Efectos secundarios. **Hueco.** |
| `routes/api/models/product.php` | Las rutas. El nombre del archivo va en snake_case: `order_line.php`. |

### Exportación, datos y tests

| Archivo | Qué es |
|---|---|
| `app/Exports/ProductsExports.php` | La exportación a Excel. |
| `app/Notifications/Product/ExportNotification.php` | El aviso con el enlace de descarga. |
| `database/migrations/*_create_products_table.php` | La tabla, y `*_alter_products_table.php` cuando cambian columnas. |
| `database/factories/ProductFactory.php` | Datos de prueba que ya insertan. **Hueco.** |
| `tests/Feature/Models/ProductEndpointsTest.php` | Recorre cada endpoint. **Hueco.** |

### Interfaz

Todo vive en `resources/<ui>/src/models/product/`, con la misma estructura en Vue y en React:

| Archivo | Qué es |
|---|---|
| `index.js` | **El contrato del modelo.** Funciones puras y llamadas HTTP: `API_ROUTE_PREFIX`, `crudActions()`, `bulkActions()`, `dataTableHead()`, `dataTableSort()`, las funciones CRUD. **Es el mismo archivo en Vue y en React.** |
| `store/index.js` | Pinia en Vue, Zustand en React, con la misma superficie. |
| `routes/index.js` | Las rutas `AdminProducts`, `AdminCreateProduct`, `AdminShowProduct`, `AdminEditProduct`. |
| `forms/` | `CreateForm`, `EditForm`, `FilterForm`. |
| `views/` | `AdminView` (la tabla), `CreateView`, `ShowView`, `EditView`. |
| `widgets/` | `DataTable`, `ModelCard`, `ModelProfile`. |

Y a nivel de módulo: `resources/<ui>/index.js` (la entrada), `src/routes.js`, `src/i18n.js`, `src/locales/{en,es}.json`, `src/theme.js` y `src/components/{ActionMenu,Breadcrumbs}`. En un paquete, además, `package.json` y `vite.config.js`.

## Dónde va tu código

| Hueco | Qué va ahí |
|---|---|
| `Traits/Operations` | La lógica de negocio. Con metas, también la forma de `payload` en `buildPayload()`. |
| `Traits/Relations` | Relaciones que el JSON no declara. |
| `Traits/Storage` | Subida y borrado de archivos. |
| `Traits/Mutators` | Accessors y mutators. |
| `ManagedFilter::canView` | **Quién ve qué.** Sin esto, el índice lo devuelve todo. |
| Política | Autorización por acción. Nace cerrada: sólo pasa quien administra, y ni él borra para siempre hasta que saques `forceDelete` de `$exceptAbilities`. |
| `Requests/*/rules()` | Reglas que no vienen del JSON, dentro del array. |
| Resource | La forma exacta de la respuesta y su array `actions`. |
| Listeners y observer | Efectos secundarios y ciclo de vida. |
| Factory | Datos de prueba realistas. |
| `tests/Feature` | El comportamiento. |

**El modelo es una fachada, no un almacén de lógica.** Un método público en `Operations` que orquesta, y el trabajo real en la clase que le corresponda.

Si una lógica no cabe en ninguno de estos sitios, falta algo en `laraimport.json`.

## Lo que no se toca

- El controlador y el archivo de rutas. Si falta un endpoint, falta en el JSON o en el generador.
- Las listas del modelo (`$fillable`, `$creatable`, `$updatable`, `$export_cols`, `$loadable_relations`, `$loadable_counts`, `$editable_metas`, `$protected_metas`) y `casts()`: salen del JSON.
- Lo que está fuera de los marcadores `//RULES//`, `//IMPORTS//` y `//EDIT//` en los archivos que los tienen.
- `models/<entidad>/index.js` en uno solo de los dos frameworks: los separaría.

Escribir en estos sitios es exactamente la deriva que `larapack:verify` señala.

## Regenerar sin destruir

`.larapack/manifest.json` registra cada archivo generado, la plantilla de la que salió y el hash de su contenido. Con eso:

- `larapack:import --force` regenera los archivos cuyo hash no cambió y **conserva los que editaste**, avisando.
- Un archivo que el manifiesto no conoce se respeta: el generador no toca lo que no escribió él.
- Los traits de Relations, Storage y Operations sólo se crean si faltan, y los tests generados nunca se sobrescriben, ni con `--force`.
- Una columna que cambia en una tabla existente produce una migración de alteración nueva, no una reescritura de la de creación.

`larapack:verify` lee el mismo manifiesto y marca lo que falta, lo editado, las rutas que no se declararon, las escrituras en un modelo inmutable y los secretos expuestos. Ver [Verificar y auditar](/larapack/verificar).

Siguiente: [El contrato front ↔ back](/conceptos/front-back).
