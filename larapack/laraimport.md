# El contrato: laraimport.json

`laraimport.json` no es un archivo de configuración: es el contrato del que sale toda la arquitectura. Lo describe un JSON Schema (draft 2020-12, `$id` `https://innoboxrr.com/schemas/laraimport/1.json`) que viaja con LaraPack en `schema/laraimport.schema.json`. El `composer.json` de LaraPack lo declara también en `extra.larapack.schema`, para que una herramienta lo encuentre sin conocer la estructura del paquete.

```bash
php vendor/bin/builder larapack:schema          # imprime el esquema
php vendor/bin/builder larapack:schema --path   # sólo la ruta del archivo
```

::: tip Lee el esquema, no un ejemplo
Los ejemplos envejecen. El esquema es lo que valida el importador, y de él salen los valores por defecto: el importador los lee del propio esquema, no de una copia en PHP. Añade `$schema` al archivo y tu editor lo validará mientras escribes.
:::

## Lo mínimo

Sólo son obligatorios `models[].name`, `props[].name` y `props[].type`. Todo lo demás tiene el valor por defecto que declara el esquema, así que el archivo sólo dice lo que se decide de verdad:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "Category",
            "props": [
                { "name": "name", "type": "string" }
            ]
        }
    ]
}
```

No rellenes cada propiedad con sus claves por defecto: el archivo se vuelve ilegible y lo generado no cambia.

## Cómo se valida

`larapack:validate` y `larapack:import` hacen lo mismo, en este orden:

1. **Forma**, contra el esquema: tipos, enums cerrados, ninguna clave desconocida en ningún objeto, `form: true` exige `form_component` y `foreignId` exige `constraint`. Declarar `only` junto a `except` se informa con un mensaje propio.
2. **Coherencia**, sobre el documento ya completado con los valores por defecto: lo que el esquema no puede expresar porque mira varias partes a la vez. Está en [Errores y avisos](#errores-y-avisos).

Si la forma falla, la coherencia no llega a evaluarse. Un error bloquea: `validate` sale con 1 e `import` no escribe nada. Un aviso no bloquea, salvo con `larapack:validate --strict`.

## La raíz del documento

| Clave | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `$schema` | string | — | Ruta o URL del esquema, para el editor. LaraPack no la lee. |
| `version` | integer, `const 1` | `1` | Versión del contrato. |
| `models` | array de [modelos](#modelo), al menos uno | obligatoria | Los modelos. El orden no importa. |
| `pivots` | array de [pivotes](#pivote) | `[]` | Tablas pivote: sólo su migración, sin modelo. |
| `controllers` | array de controladores | `[]` | Desde 9.0. Endpoints sin modelo: un escritorio, un asistente, un webhook. Ver [Endpoints declarados](/larapack/endpoints). |

No admite otras claves.

## Modelo {#modelo}

| Clave | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `name` | PascalCase (`^[A-Z][A-Za-z0-9]*$`) | obligatoria | Nombre de la clase, en singular. Todo lo demás se deriva de aquí. |
| `props` | array de [propiedades](#propiedad), al menos una | obligatoria | Las columnas. |
| `metas` | boolean | `false` | Genera la tabla `<modelo>_metas`, el modelo `<Model>Meta`, la relación `metas()`, la columna `payload` y el guardado de metas al crear y actualizar. Ver [Metas y payload](/larapack/metas). |
| `editable_metas` | array de snake_case | `[]` | Metas que el formulario puede escribir, con el nombre aplanado (`seo_title`). Un valor vacío borra la meta. |
| `protected_metas` | array de snake_case | `[]` | Metas que sólo escribe tu código con `setMeta()` o `setMetas()`. Se ignoran si llegan en la petición, aunque estén también en `editable_metas`. |
| `display` | snake_case | se resuelve sola | La columna que nombra a un registro en la ficha, las migas y el título de la pestaña. Ver [display](/larapack/acciones#display). |
| `load_relations` | array de [relaciones](#relacion) | `[]` | Cada relación: su método en el trait `Relations` y su nombre en `$loadable_relations`. |
| `load_counts` | array de snake_case | `[]` | Relaciones cuyo conteo se puede pedir con `withCount`: la lista `$loadable_counts`. |
| `requests` | array de [requests](#request) | `[]` | Reglas de validación de `CreateRequest` y `UpdateRequest`. |
| `routes` | objeto con `only` o `except` | todas las acciones | Qué acciones genera el modelo. Ver [routes](/larapack/acciones#routes). |
| `immutable` | boolean | `false` | La fila no se modifica ni se borra una vez creada. Ver [immutable](/larapack/acciones#immutable). |
| `authenticatable` | boolean | `false` | El modelo es el usuario que inicia sesión. Ver [authenticatable](/larapack/acciones#authenticatable). |
| `endpoints` | array de endpoints | `[]` | Desde 9.0. Lo que no es una de las doce acciones: `publish`, `importRoster`. Ver [Endpoints declarados](/larapack/endpoints). |
| `assignments` | array | — | **Obsoleta.** Se acepta y no se lee: el trait `Assignment` se genera siempre igual. |
| `filters` | array | — | **Obsoleta.** Se acepta y no se lee: los filtros son un conjunto fijo. |

### Lo que se deriva del nombre

Para `"name": "OrderLine"` en un paquete con namespace `Acme\Shop\`:

| Pieza | Valor |
|---|---|
| Tabla | `order_lines` (el plural lo decide el pluralizador de Laravel) |
| Archivo de rutas | `routes/api/models/order_line.php` |
| URL | `api/acme/shop/order_line/<acción>`; en una aplicación, `api/app/order_line/<acción>` |
| Nombres de ruta | `api.acme.shop.order_line.*`; en una aplicación, `api.app.order_line.*` |
| `API_ROUTE_PREFIX` del contrato JS | `api.acme.shop.order_line.` |
| Identificador en las requests | `order_line_id` |
| Tabla y modelo de metas | `order_line_metas` y `OrderLineMeta` |
| Carpeta del módulo de interfaz | `resources/<ui>/src/models/order-line` |
| Rutas de la interfaz | ruta `order-line`, con los nombres `AdminOrderLines`, `AdminCreateOrderLine`, `AdminShowOrderLine` y `AdminEditOrderLine` |
| Store | `useOrderLineStore`, con id `acme.shop.order_line` |
| Textos en pantalla | `Order line` y `Order lines`, que son claves de traducción |
| Exportación | `OrderLinesExports` y la vista `resources/views/excel/order_line.blade.php` |

El segmento del modelo va siempre en snake_case, en un paquete y en una aplicación. Sólo la carpeta y la ruta de la interfaz usan kebab-case.

## Propiedad {#propiedad}

| Clave | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `name` | snake_case (`^[a-z][a-z0-9_]*$`) | obligatoria | Nombre de la columna. |
| `type` | [tipo de columna](#tipos-de-columna) | obligatoria | El método de `Blueprint` con el que se crea. |
| `nullable` | boolean | `false` | Añade `->nullable()`. |
| `default` | string, number, boolean o null | `null` | Añade `->default(...)`: un booleano como `true` o `false`, un número tal cual y un texto entre comillas. |
| `constraint` | string o null | `null` | Tabla a la que apunta la clave foránea. Sólo tiene efecto con `foreignId`, y ahí es **obligatoria y no vacía**: añade `->constrained('<tabla>')->onUpdate('cascade')->onDelete('cascade')`. |
| `cast` | string o null | `null` | Cast de Eloquent, en el método `casts()` del modelo. |
| `fillable` | boolean | `true` | Entra en `$fillable`. |
| `creatable` | boolean | `true` | Entra en `$creatable`: lo que `createModel()` toma de la petición. |
| `updatable` | boolean | `true` | Entra en `$updatable`: lo que `updateModel()` toma de la petición. |
| `exports_cols` | boolean | `true` | Es columna de la exportación a Excel (`$export_cols`). |
| `form` | boolean | `false` | Es campo de `CreateForm`, `EditForm` y `FilterForm`. Exige `form_component`. |
| `form_component` | [componente](#componentes-de-formulario) o null | `null` | Con qué componente se pinta. Obligatorio si `form` es `true`. |
| `form_submit` | boolean | `false` | Viaja al crear y al actualizar. Con `form: false` se convierte en prop del formulario: el valor llega desde fuera, como un `user_id`. |
| `datatable` | boolean | `false` | Es columna de la tabla. La primera con `datatable` da el orden por defecto. |
| `enum` | objeto valor → etiqueta, al menos una entrada | — | Las opciones del campo: las de un `SelectInputComponent`, la etiqueta en la tabla, un select en el filtro, una acción masiva por valor y los valores de la factory. |
| `secret` | boolean | `false` | Nunca sale por la API: va a `$hidden`, y nunca a la tabla ni a la exportación. Se escribe, no se lee. Ver [secret](/larapack/acciones#secret). |

::: tip `id`, marcas de tiempo y borrado lógico
La migración pone `$table->id()`, `$table->timestamps()` y, si el modelo tiene `delete`, `restore` o `forceDelete`, `$table->softDeletes()`. No hace falta declarar esas columnas.
:::

### Tipos de columna {#tipos-de-columna}

El enum es cerrado. Cada valor es el método de `Blueprint` al que se llama con el nombre de la propiedad:

`bigIncrements`, `bigInteger`, `binary`, `boolean`, `char`, `date`, `dateTime`, `dateTimeTz`, `decimal`, `double`, `enum`, `float`, `foreignId`, `foreignUuid`, `geometry`, `increments`, `integer`, `ipAddress`, `json`, `jsonb`, `longText`, `macAddress`, `mediumInteger`, `mediumText`, `morphs`, `nullableMorphs`, `smallInteger`, `string`, `text`, `time`, `timeTz`, `timestamp`, `timestampTz`, `tinyInteger`, `tinyText`, `unsignedBigInteger`, `unsignedInteger`, `unsignedSmallInteger`, `unsignedTinyInteger`, `uuid`, `year`.

::: warning Tipos que piden algo más
- **`enum`** se escribe como `$table->enum('nombre')`, sin la lista de valores que Laravel exige. Para un campo con opciones, declara `"type": "string"` y la clave `enum`.
- **`foreignUuid`** no recibe `->constrained()`: la restricción sólo se añade a `foreignId`.
- **`morphs`** y **`nullableMorphs`** crean dos columnas (`<nombre>_id` y `<nombre>_type`), y la factory no les da valor.
:::

### Componentes de formulario {#componentes-de-formulario}

Son los 27 nombres que exportan igual `innoboxrr-form-elements` (Vue) e `innoboxrr-react-form-elements` (React), así que el mismo `laraimport.json` vale para los dos módulos:

`AvatarInputComponent`, `CheckboxInputComponent`, `ClickToEditComponent`, `CodeInputComponent`, `CodeMirrorComponent`, `ColorPickerInputComponent`, `CountrySelectInputComponent`, `DynamicGroupInputComponent`, `EditorInputComponent`, `FileDropInputComponent`, `FileInputComponent`, `FqsInputComponent`, `ModelSearchInputComponent`, `MultiCheckboxInputComponent`, `PolymorphicInputComponent`, `RadioInputComponent`, `SelectInputComponent`, `SelectSearchInputComponent`, `SimpleFileInputComponent`, `SingleCheckboxInputComponent`, `StarsInputComponent`, `SwitchComponent`, `TagsInputComponent`, `TextEditorMonoStyleInputComponent`, `TextInputComponent`, `TextareaInputComponent`, `TimezoneSelectInputComponent`.

Cómo se escribe cada uno en `CreateForm` y `EditForm`:

| Componente | Qué recibe |
|---|---|
| `SelectInputComponent` | `name`, la etiqueta, `validators="required"`, el enlace de datos y una opción por cada valor de `enum`; sin `enum`, una sola opción vacía. |
| `EditorInputComponent` | Lo mismo que el resto, más un `id` único por formulario y una altura de 300. Sin subida de archivos. |
| `TextInputComponent` | `type="text"` y un placeholder con la etiqueta. |
| `TextareaInputComponent` | Un placeholder con la etiqueta. |
| Los demás | `name`, la etiqueta, `validators="required"` y el enlace de datos: `v-model` en Vue, `value` y `onChange` en React. |

La etiqueta es la clave de traducción del nombre de la columna: `unit_price` se pinta con `t('Unit price')`. En `FilterForm` el componente no sale de `form_component`: es un `SelectInputComponent` si la propiedad tiene `enum` y un `TextInputComponent` si no. Detalles en [La interfaz generada](/larapack/interfaz#formularios).

## Relación {#relacion}

| Clave | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `type` | `belongsTo`, `hasOne`, `hasMany`, `belongsToMany`, `morphTo`, `morphOne`, `morphMany` o `morphToMany` | obligatoria | El método de Eloquent. |
| `related` | PascalCase | obligatoria | El modelo relacionado. |
| `name` | snake_case | obligatoria | Nombre del método de la relación. |
| `namespace` | string | se resuelve solo | Namespace del modelo relacionado. Sólo hace falta si no está en este archivo ni en `App\Models`. |

Cada relación genera en `Traits/Relations/<Model>Relations.php` un método `return $this-><type>(<Related>::class);`, con su `use`, y añade su `name` a `$loadable_relations`, que es la lista que acepta `show` en `load_relations`.

::: warning Los métodos se escriben cuando se crea el trait
El trait `Relations` sólo se crea si no existe y nunca se reescribe, ni con `--force`. Una relación que añades más tarde a `load_relations` entra en `$loadable_relations` al regenerar el modelo, pero su método lo escribes tú en el trait. Completa ahí también las polimórficas (`morphTo`, `morphOne`, `morphMany`, `morphToMany`), que necesitan otros argumentos que el nombre de la clase.
:::

## Request {#request}

| Clave | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `name` | `Create` o `Update` | obligatoria | Qué request recibe las reglas. El resto de requests tienen reglas fijas. |
| `rules` | objeto campo → string o array de strings | — | Reglas de Laravel. Usa un array para toda regla que lleve una barra vertical dentro, como un `regex:`. |

Las reglas se inyectan en el marcador `//RULES//` de `rules()`. Lo que el request declara fuera del marcador no se toca.

- **`UpdateRequest` necesita la regla del identificador**, `<modelo>_id` (`post_id`): su `authorize()` y su `handle()` hacen `findOrFail` con ese valor. El stub ya la trae como `required|numeric`. Si declaras reglas de `Update` sin ella es un error de validación, y si la declaras, la tuya sustituye a la del stub.
- Una regla sobre algo que no es columna ni el identificador es un aviso: no valida nada y suele ser una errata.
- Las reglas de una acción que el modelo no tiene son un aviso: ese request no se genera.
- `BulkUpdateRequest` reutiliza las reglas de `UpdateRequest`, cada una precedida de `sometimes`. Ver [Acciones masivas](/larapack/acciones#acciones-masivas).

## Pivote {#pivote}

| Clave | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `name` | snake_case | obligatoria | Nombre de la tabla. Por convención, los dos modelos en singular y en orden alfabético: `post_tag`. |
| `props` | array, al menos una | obligatoria | Las columnas. |

Cada columna de una pivote admite sólo estas claves:

| Clave | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `name` | snake_case | obligatoria | Nombre de la columna. |
| `type` | [tipo de columna](#tipos-de-columna) | obligatoria | |
| `nullable` | boolean | `false` | |
| `default` | string, number, boolean o null | `null` | En una pivote se escribe siempre entre comillas. |
| `constraint` | string o null | `null` | Obligatoria y no vacía con `foreignId`. |

Una pivote genera sólo `database/migrations/<fecha>_create_<name>_table.php`, con `id()`, sus columnas y `timestamps()`. Ver [Migraciones](/larapack/migraciones#pivotes).

## Acciones {#acciones}

`routes.only` y `routes.except` reciben nombres de este enum, sin repetir: `policies`, `policy`, `index`, `show`, `create`, `update`, `delete`, `restore`, `forceDelete`, `export`, `bulkUpdate`, `bulkDelete`. `routes` necesita una de las dos claves y no admite las dos. Lo que cuelga de cada acción está en [Rutas, inmutables, secretos y usuarios](/larapack/acciones).

## Errores y avisos {#errores-y-avisos}

Cada hallazgo lleva `level` (`error` o `warning`), `path` (el puntero JSON del dato) y `message`. En los caminos, `<i>` es la posición del modelo o de la pivote y `<j>` la de la propiedad, la relación o el request.

### Errores

Bloquean la generación.

| Qué | `path` | Por qué |
|---|---|---|
| Un fallo de forma contra el esquema | el dato que falla | Un tipo, un valor fuera de su enum, una clave desconocida, `form` sin `form_component` o `foreignId` sin `constraint`. |
| `routes` con `only` y `except` | `/models/<i>/routes` | Juntas no tienen una lectura única. |
| Un modelo declarado dos veces | `/models/<i>/name` | |
| Una columna declarada dos veces en el mismo modelo | `/models/<i>/props/<j>/name` | |
| Una pivote declarada dos veces | `/pivots/<i>/name` | |
| Una clave foránea hacia la propia tabla que no es `nullable` | `/models/<i>/props/<j>` | No se podría insertar la primera fila. |
| Un ciclo de claves foráneas entre modelos del archivo | `/models` | No hay orden de migración posible. |
| Reglas de `Update` sin `<modelo>_id`, en un modelo con `update` | `/models/<i>/requests/<j>/rules` | `authorize()` y `handle()` la necesitan. |
| `immutable` con `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` o `bulkDelete` en `only` | `/models/<i>/routes/only` | Una fila inmutable no se modifica ni se borra. |
| `bulkUpdate` sin `update`, o `bulkDelete` sin `delete`, en `only` | `/models/<i>/routes/only` | La masiva usa la política y las reglas de la individual. |
| `form: true` en un modelo sin `create` ni `update` | `/models/<i>/props/<j>/form` | El campo no tiene dónde vivir. |
| Un `secret` con `datatable: true` o `exports_cols: true` escritos en el archivo | `/models/<i>/props/<j>/<clave>` | Pide salir y no salir a la vez. |
| `display` que no es una columna | `/models/<i>/display` | La ficha se quedaría sin nombre. |
| `display` que es `secret` | `/models/<i>/display` | Nunca sale por la API. |
| `authenticatable` sin `email` o sin `password` | `/models/<i>/props` | Nadie podría iniciar sesión. |

### Avisos

No bloquean. Con `larapack:validate --strict` cuentan como fallo.

| Qué | `path` | Qué pasa |
|---|---|---|
| `restore` o `forceDelete` sin `delete` | `/models/<i>/routes` | Nada de la API produce una fila borrada. Es correcto si la borra otro proceso. |
| `export` sin `index` | `/models/<i>/routes` | La exportación reutiliza los filtros del índice. |
| Reglas de `Create` o `Update` sin esa acción | `/models/<i>/requests/<j>` | No se genera ese request, y las reglas no se usan. |
| `editable_metas` o `protected_metas` sin `metas: true` | `/models/<i>/<clave>` | No hay tabla donde guardarlas. |
| Una meta en `editable_metas` y en `protected_metas` | `/models/<i>/editable_metas` | Gana `protected`: el formulario no la escribe. |
| `payload` declarado con `fillable`, `creatable`, `updatable` o `exports_cols` en `true`, en un modelo con metas | `/models/<i>/props/<j>/<clave>` | Se ignora: `payload` lo escribe el sistema. |
| Una pivote con `constraint` hacia una tabla que no es de ningún modelo del archivo | `/pivots/<i>/props/<j>/constraint` | Asegúrate de que exista. No avisa de `users`, `roles`, `permissions` ni `teams`. |
| Una relación hacia un modelo que no está en el archivo, sin `namespace` | `/models/<i>/load_relations/<j>/related` | Se resuelve contra `App\Models`. |
| Una regla sobre algo que no es columna ni el identificador | `/models/<i>/requests/<j>/rules/<campo>` | La regla no valida nada. |
| `enum` en un campo de formulario cuyo componente no es `SelectInputComponent`, `SelectSearchInputComponent`, `RadioInputComponent` ni `MultiCheckboxInputComponent` | `/models/<i>/props/<j>/enum` | El componente no pinta las opciones. |

### Avisos de interfaz

Sólo con `--vue` o `--react`, en `validate` y en `import`: un paquete que sólo expone una API declara modelos sin índice constantemente, y un aviso que no hay que atender acaba haciendo que nadie lea la lista. Todos van en `/models/<i>/routes`.

| Qué | Qué pasa |
|---|---|
| Sin `index` | El módulo sólo trae el contrato y el store: las vistas cuelgan del índice. |
| `index` sin `policies` | No se generan vistas: la tabla consulta las políticas para decidir qué acciones ofrece. |
| `update` sin `show` | No hay formulario de edición: la edición cuelga del detalle. |

## Lo que se resuelve solo

No hay que arreglarlo a mano:

- **El orden de los modelos.** Se ordenan topológicamente por sus claves foráneas, así que la migración de una tabla se genera después de las tablas a las que apunta, aunque el modelo se declare antes. `larapack:validate` imprime ese orden.
- **El namespace de las relaciones.** Un modelo declarado en el mismo archivo vive en el mismo proyecto y el `use` apunta ahí; uno que no está resuelve contra `App\Models`.
- **La lista de acciones**, a partir de `routes` e `immutable`. Las herramientas no leen `only` ni `except`: preguntan si una acción está.
- **`payload` con `metas: true`.** Si no lo declaras, se añade como `longText` anulable con cast `array`. Si lo declaras, se respetan su tipo y su cast, pero nunca es asignable, exportable, columna de la tabla ni campo del formulario.
- **Los secretos, fuera.** Una propiedad `secret` queda con `exports_cols` y `datatable` en `false` aunque no lo escribas. En un modelo `authenticatable`, también `password` y `remember_token`.
- **`display`**, si no lo declaras: `name`, luego `title`, luego la primera columna de texto que no sea secreta (antes las que salen en la tabla) y, si no hay ninguna, `id`.

## Ejemplos completos

### Un blog: formulario, tabla, relaciones, metas y pivote

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "Post",
            "metas": true,
            "props": [
                {
                    "name": "title",
                    "type": "string",
                    "form": true,
                    "form_component": "TextInputComponent",
                    "form_submit": true,
                    "datatable": true
                },
                {
                    "name": "status",
                    "type": "string",
                    "cast": "string",
                    "form": true,
                    "form_component": "SelectInputComponent",
                    "form_submit": true,
                    "datatable": true,
                    "enum": {
                        "draft": "Draft",
                        "published": "Published"
                    }
                },
                {
                    "name": "category_id",
                    "type": "foreignId",
                    "constraint": "categories",
                    "form_submit": true
                },
                {
                    "name": "user_id",
                    "type": "foreignId",
                    "constraint": "users",
                    "exports_cols": false,
                    "form_submit": true
                }
            ],
            "load_relations": [
                { "type": "belongsTo", "related": "Category", "name": "category" },
                { "type": "belongsTo", "related": "User", "name": "user", "namespace": "App\\Models" }
            ],
            "editable_metas": ["seo_title", "seo_og_image"],
            "protected_metas": ["views"],
            "requests": [
                {
                    "name": "Create",
                    "rules": {
                        "title": "required|string|max:255",
                        "status": ["required", "in:draft,published"],
                        "category_id": "required|exists:categories,id",
                        "user_id": "required|exists:users,id"
                    }
                },
                {
                    "name": "Update",
                    "rules": {
                        "post_id": "required|numeric",
                        "title": "nullable|string|max:255",
                        "status": ["nullable", "in:draft,published"],
                        "category_id": "nullable|exists:categories,id"
                    }
                }
            ]
        },
        {
            "name": "Category",
            "props": [
                { "name": "name", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true }
            ]
        },
        {
            "name": "Tag",
            "props": [
                { "name": "name", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true }
            ]
        }
    ],
    "pivots": [
        {
            "name": "post_tag",
            "props": [
                { "name": "post_id", "type": "foreignId", "constraint": "posts" },
                { "name": "tag_id", "type": "foreignId", "constraint": "tags" }
            ]
        }
    ]
}
```

Lo que conviene notar:

- `Post` apunta a `categories`, así que la migración de `Category` se genera antes aunque el modelo esté declarado después.
- `category_id` y `user_id` viajan en el envío sin ser campos del formulario: los dos formularios reciben esas props desde fuera.
- Las etiquetas de `enum` son claves de traducción en inglés; su traducción va en `src/locales/es.json` del módulo.
- `User` declara su `namespace` porque no está en el archivo; sin él se resolvería igual contra `App\Models`, con un aviso.

### Tablas que no se administran desde un formulario

```json
{
    "models": [
        {
            "name": "AuditEvent",
            "immutable": true,
            "routes": { "only": ["policies", "index", "show", "export"] },
            "props": [
                { "name": "action", "type": "string", "datatable": true },
                { "name": "details", "type": "longText", "cast": "json" }
            ]
        },
        {
            "name": "ApiKey",
            "routes": { "except": ["update", "restore", "forceDelete"] },
            "props": [
                { "name": "label", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true },
                { "name": "token_hash", "type": "string", "secret": true }
            ]
        }
    ]
}
```

`AuditEvent` se lista, se consulta y se exporta, y nadie la modifica. `ApiKey` se crea y se revoca, pero no se edita, y su hash nunca sale por la API. Qué genera cada uno está en [Rutas, inmutables, secretos y usuarios](/larapack/acciones).

### El usuario que inicia sesión

Es la declaración de la aplicación base:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "User",
            "authenticatable": true,
            "metas": true,
            "editable_metas": ["avatar"],
            "routes": { "except": ["create"] },
            "props": [
                { "name": "name", "type": "string", "datatable": true, "form": true, "form_component": "TextInputComponent", "form_submit": true },
                { "name": "email", "type": "string", "datatable": true, "form": true, "form_component": "TextInputComponent", "form_submit": true },
                { "name": "email_verified_at", "type": "timestamp", "nullable": true, "fillable": false, "creatable": false, "updatable": false, "datatable": true },
                { "name": "password", "type": "string", "updatable": false, "exports_cols": false }
            ],
            "requests": [
                {
                    "name": "Update",
                    "rules": {
                        "user_id": "required|numeric",
                        "name": "sometimes|required|string|max:255",
                        "email": "sometimes|required|email|max:255"
                    }
                }
            ]
        }
    ]
}
```

Los usuarios se registran por `innoboxrr/laravel-auth`, así que la API de administración no tiene `create`. El avatar es una meta editable. Ver [Acceso y usuarios](/app-base/acceso).
