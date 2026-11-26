# Rutas, inmutables, secretos y usuarios

Por defecto un modelo tiene doce acciones: la forma correcta para algo que una persona administra desde una pantalla, y la equivocada para buena parte de un sistema real. Una bitácora sólo se agrega, un catálogo sólo se lee, una concesión se otorga y se revoca pero no se edita, y una credencial se lista sin que su secreto salga nunca.

Eso no se resuelve generando todo y borrando lo que sobra: lo borrado a mano queda marcado como editado para siempre, `larapack:verify` lo señala como deriva y el contrato deja de describir el código. Se declara con cuatro claves: `routes`, `immutable`, `secret` y `authenticatable`. Sin ellas, un modelo tiene todas las acciones.

Lo que no es una de las doce —publicar, importar una lista, un escritorio, un webhook— tampoco se escribe a mano: se declara con `endpoints` o `controllers`. Ver [Endpoints declarados](/larapack/endpoints).

## Las doce acciones

| Acción | Verbo y URI | Nombre de ruta | Request | Habilidad de la política | Evento |
|---|---|---|---|---|---|
| `policies` | `GET policies` | `policies` | `PoliciesRequest` | Ninguna: responde con todas | — |
| `policy` | `GET policy` | `policy` | `PolicyRequest` | La que se pide | — |
| `index` | `GET index` | `index` | `IndexRequest` | `index` | — |
| `show` | `GET show` | `show` | `ShowRequest` | `view` | — |
| `create` | `POST create` | `create` | `CreateRequest` | `create` | `CreateEvent` |
| `update` | `PUT update` | `update` | `UpdateRequest` | `update` | `UpdateEvent` |
| `delete` | `DELETE delete` | `delete` | `DeleteRequest` | `delete` | `DeleteEvent` |
| `restore` | `POST restore` | `restore` | `RestoreRequest` | `restore` | `RestoreEvent` |
| `forceDelete` | `DELETE force-delete` | `force.delete` | `ForceDeleteRequest` | `forceDelete` | `ForceDeleteEvent` |
| `export` | `POST export` | `export` | `ExportRequest` | `export` | `ExportEvent` |
| `bulkUpdate` | `PUT bulk-update` | `bulk.update` | `BulkUpdateRequest` | `update`, registro a registro | `UpdateEvent` por registro |
| `bulkDelete` | `DELETE bulk-delete` | `bulk.delete` | `BulkDeleteRequest` | `delete`, registro a registro | `DeleteEvent` por registro |

La URI completa lleva el prefijo del modelo, `api/acme/catalogo/order_line/force-delete`, y el nombre completo también: `api.acme.catalogo.order_line.force.delete`. Todas piden `auth:sanctum`.

Lo que recibe cada una:

| Acción | Parámetros |
|---|---|
| `policies` | `id`, opcional: con él, las habilidades sobre ese registro. Responde un objeto con `true` o `false` por cada método del controlador y por su habilidad. |
| `policy` | `policy`, una de `index`, `view`, `viewAny`, `create`, `update`, `delete`, `restore`, `forceDelete` o `export`; e `id`, obligatorio para `view`, `update`, `delete`, `restore` y `forceDelete`. |
| `index` | Los parámetros de search-surge: `paginate`, `page`, `orderBy`, `orderMode`, los filtros y `managed`. Ver [support, traits y search-surge](/paquetes/support-traits-search). |
| `show` | `<modelo>_id`, y opcionalmente `load_relations` y `load_counts`, limitados a `$loadable_relations` y `$loadable_counts`. |
| `create` | Los campos; se guardan los de `$creatable`. |
| `update` | `<modelo>_id` y los campos; se guardan los de `$updatable`. |
| `delete`, `restore`, `forceDelete` | `<modelo>_id`. |
| `export` | Los filtros. Ver [Exportar a Excel](/larapack/exportar). |
| `bulkUpdate` | `ids` y `data`. Ver [Acciones masivas](#acciones-masivas). |
| `bulkDelete` | `ids`. |

La política generada tiene `index` y `viewAny` (con `index`), `view` (con `show`), `create`, `update`, `delete`, `restore`, `forceDelete` y `export`, cada uno según su acción, y todos devuelven `false`. Su `before()` deja pasar al usuario cuyo `isAdmin()` devuelve `true`, salvo en las habilidades de `$exceptAbilities`, que empieza con `forceDelete`: ni el administrador borra para siempre hasta que lo decidas.

## routes {#routes}

```json
{ "name": "ApiKey", "routes": { "except": ["update", "restore", "forceDelete"] }, "props": [] }
```

```json
{ "name": "Country", "routes": { "only": ["policies", "policy", "index", "show"] }, "props": [] }
```

- **`only`**: sólo estas acciones. **`except`**: todas menos estas. Nunca las dos.
- Sin la clave, las doce.

Las acciones que quedan se calculan siempre igual, en este orden:

1. Se parte de `only`, o de las doce.
2. Se quitan las de `except`.
3. Si el modelo es `immutable`, se quitan `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` y `bulkDelete`.
4. Se quita `bulkUpdate` si no queda `update`, y `bulkDelete` si no queda `delete`: una masiva usa la política y las reglas de su individual.

Por eso `"except": ["delete"]` quita también el borrado masivo, sin error. Pedir una masiva en `only` sin su individual sí es un error, porque alguien la pidió expresamente.

### Qué cuelga de cada acción

Quitar una acción quita todo lo que depende de ella:

| Pieza | Qué se quita |
|---|---|
| Rutas y controlador | Su ruta, y su método y su import en el controlador. Un modelo sin ninguna acción no tiene controlador ni archivo de rutas. |
| Request | Su archivo. |
| Evento | Su evento y sus listeners (`create`, `update`, `delete`, `restore`, `forceDelete` y `export`). |
| Política | Su método. |
| Observer | Su handler: `updated`, `deleted`, `restored` o `forceDeleted`. `created` está siempre. |
| Storage | `restoreModel()`, sin `restore`. |
| Modelo y migración | `SoftDeletes` y `$table->softDeletes()`, si no queda ninguna de `delete`, `restore` y `forceDelete`. |
| Recurso | Sus acciones de fila: «Show» sin `show`, «Edit» sin `update` o sin `show`, «Delete» sin `delete`. |
| Exportación | La clase de exportación, la vista de Excel, la notificación y su listener, sin `export`. |
| Test | Su test. |
| Contrato JS | Su función: `getPolicies`, `getPolicy`, `indexModel`, `showModel`, `createModel`, `updateModel`, `deleteModel`, `restoreModel`, `forceDeleteModel`, `exportModel`, `bulkUpdateModels` y `updateField`, `bulkDeleteModels`. |
| Barra de la tabla y paleta | «Create» sin `create`; «Export» sin `export`; las acciones de la selección sin `bulkUpdate` ni `bulkDelete`. |
| Store | `fetchIndex`, `fetchOne`, `fetchPolicies`, `create`, `update` y `remove`, según su acción. |
| Vistas y formularios | Los que necesitan esa acción (ver [el módulo](/larapack/que-se-genera#el-modulo-de-interfaz)), la ruta hija, el drawer y la entrada del menú de la ficha. |

Lo que queda siempre: el modelo, sus traits, sus filtros, la política con su `before()`, el observer, la factory, la migración, el recurso y el archivo de test.

::: tip Las vistas necesitan `index` y `policies`
Las vistas cuelgan de la ruta del índice, y la tabla consulta las políticas para decidir qué acciones ofrece. La edición cuelga además de la ruta de detalle, así que necesita `show`. Con `--vue` o `--react`, la validación avisa de lo que falte.
:::

## immutable {#immutable}

```json
{
    "name": "AuditEvent",
    "immutable": true,
    "routes": { "only": ["policies", "index", "show", "export"] },
    "props": [
        { "name": "action", "type": "string", "datatable": true },
        { "name": "details", "type": "longText", "cast": "json" }
    ]
}
```

Una fila inmutable, una vez creada, no se modifica ni se borra.

- **Quita** `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` y `bulkDelete`, con todo lo que cuelga de ellas.
- **Crear sigue permitido**: una fila inmutable nace (un consentimiento, un movimiento contable, un registro de envío). Si tampoco debe crearse por la API, quítalo con `routes`, como en el ejemplo.
- **El modelo se defiende solo.** Quitar las rutas impide entrar por HTTP, pero no que el propio código llame a `save()` o a `delete()`. El modelo registra dos guardas:

```php
protected static function booted(): void
{
    $refuse = static function (): never {
        throw new \LogicException('AuditEvent es inmutable: sus filas no se modifican ni se borran.');
    };

    static::updating($refuse);
    static::deleting($refuse);
}
```

- **El test lo comprueba**: que no hay rutas de escritura registradas y que modificar o borrar un registro lanza `LogicException`.
- **`larapack:verify` lo vigila** con `immutable-write`: una ruta, un método, un request o un componente de escritura, o el modelo sin sus guardas.

::: warning Lo que la guarda no cubre
Una actualización masiva desde el query builder, como `AuditEvent::query()->update([...])`, no carga modelos ni dispara eventos, así que no pasa por `booted()`. Si el dominio lo necesita garantizado también ahí, hazlo en la base de datos.
:::

## secret {#secret}

```json
{
    "name": "ApiKey",
    "routes": { "except": ["update", "restore", "forceDelete"] },
    "props": [
        { "name": "label", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true },
        { "name": "token_hash", "type": "string", "secret": true }
    ]
}
```

Una columna secreta se escribe pero no se lee: el hash de un token, una credencial.

- **Va a `$hidden`** del modelo. El recurso generado devuelve `parent::toArray()`, así que no sale por la API, ni en cualquier otra serialización.
- **Nunca sale en la tabla ni en la exportación.** `datatable` y `exports_cols` se ponen en `false` aunque no lo escribas; escribirlos en `true` es un error de validación.
- **Sigue siendo asignable**: `fillable`, `creatable` y `updatable` conservan su valor.
- No genera acciones masivas por valor, no se edita en la celda y no puede ser `display`.
- **`larapack:verify` lo vigila** con `secret-exposed`: una columna secreta fuera de `$hidden`, en `$export_cols`, nombrada en el recurso o como columna de la tabla.

::: danger Nunca «sólo para depurar»
Nombrar un secreto en el recurso lo expone aunque esté en `$hidden`, y `verify` falla con razón. Si necesitas ver el valor, consúltalo en la base de datos, no por la API.
:::

## authenticatable {#authenticatable}

```json
{
    "name": "User",
    "authenticatable": true,
    "routes": { "except": ["create"] },
    "props": [
        { "name": "name", "type": "string", "datatable": true },
        { "name": "email", "type": "string", "datatable": true },
        { "name": "email_verified_at", "type": "timestamp", "nullable": true, "fillable": false },
        { "name": "password", "type": "string", "updatable": false }
    ]
}
```

El modelo es el usuario que inicia sesión, con la misma arquitectura que cualquier otro: API, políticas, tests y su módulo en el administrador. Lo que cambia:

- Hereda de `Illuminate\Foundation\Auth\User` y usa `Notifiable` y `HasApiTokens`, así que la aplicación necesita `laravel/sanctum`.
- `password` y `remember_token` van a `$hidden`, y quedan fuera de la tabla y de la exportación aunque se declaren.
- Si están declarados y no tienen un cast propio, `email_verified_at` se castea a `datetime` y `password` a `hashed`: la contraseña se guarda cifrada sin que nadie lo haga a mano.
- `isAdmin()` compara el correo, sin distinguir mayúsculas, con `config('auth.admins')`. Es lo que consulta el `before()` de cada política generada, en este modelo y en todos los demás.
- Tiene que declarar `email` y `password`: sin ellos, `larapack:validate` falla.

La lista de administradores la define la aplicación en `config/auth.php`. La aplicación base la lee de `ADMIN_EMAILS`:

```php
'admins' => array_values(array_filter(array_map('trim', explode(',', env('ADMIN_EMAILS'))))),
```

::: tip `remember_token` no se añade como columna
LaraPack no añade `remember_token` a `props`. En una aplicación, la tabla `users` la crea la migración de Laravel, que LaraPack no altera: ver [Migraciones que no generó LaraPack](/larapack/migraciones#migraciones-que-no-genero-larapack).
:::

`isAdmin()` es un punto de partida: cámbialo por tu sistema de roles cuando lo tengas. Cómo lo usa la aplicación base está en [Acceso y usuarios](/app-base/acceso).

## display {#display}

La columna que nombra a un registro en pantalla: el título de su ficha, su miga de pan y el título de la pestaña del navegador.

```json
{ "name": "Product", "display": "sku", "props": [ { "name": "sku", "type": "string" } ] }
```

Sin la clave se elige sola:

1. `name`, si existe;
2. si no, `title`;
3. si no, la primera columna de texto (`string`, `char`, `text`, `tinyText`, `mediumText` o `longText`) que no sea `secret` ni `payload`, prefiriendo las que tienen `datatable`;
4. si no hay ninguna, `id`.

Una columna que no existe o una `secret` son un error de validación. Un modelo generado sin laraimport, con `larapack:full-model`, se nombra por `name`.

## Acciones masivas {#acciones-masivas}

`bulkUpdate` y `bulkDelete` son la acción individual aplicada a varios registros.

### En la API

| | `bulkUpdate` | `bulkDelete` |
|---|---|---|
| Petición | `PUT bulk-update` con `ids` y `data` | `DELETE bulk-delete` con `ids` |
| Validación | `ids` obligatorio, entre 1 y 500 enteros distintos; `data` obligatorio, un objeto con al menos un campo; cada regla de `UpdateRequest`, salvo la del identificador, como `data.<campo>` y precedida de `sometimes` | `ids` obligatorio, entre 1 y 500 enteros distintos |
| Autorización | La habilidad `update` sobre **cada** registro | La habilidad `delete` sobre cada registro |
| Qué hace | `updateModel()` en cada registro, con `data`: sólo `$updatable` y las metas editables | `deleteModel()` en cada registro |

- **Todo o nada.** Si un registro no se puede tocar, responde 403 y no se toca ninguno. Si un id no existe, responde 404. El trabajo va dentro de una transacción.
- **Los eventos salen al final**, uno por registro, cuando el cambio ya es firme.
- **Responde** la colección de recursos.
- `PoliciesRequest` traduce `bulkUpdate` a `update` y `bulkDelete` a `delete` al responder las habilidades.

`sometimes` hace que un campo que no llega no se exija ni se toque: se puede cambiar un solo campo en muchos registros.

### En la tabla

El contrato declara las acciones de la selección en `bulkActions()`:

```js
export const bulkActions = () => [
    {
        id: 'status-published',
        name: t('Status') + ': ' + t('Published'),
        success: t('Records updated'),
        callback: 'bulkUpdateModels',
        icon: 'edit',
        params: { status: 'published' },
    },
    {
        id: 'bulkDelete',
        name: t('Delete'),
        success: t('Records deleted'),
        callback: 'bulkDeleteModels',
        icon: 'delete',
        danger: true,
        params: {},
    },
]
```

- **Una acción por valor de `enum`**, si el modelo tiene `bulkUpdate` y la propiedad tiene `enum`, es `updatable` y no es `secret`: «Estado: Publicado» pone ese valor en todos los seleccionados.
- **«Delete»** con `bulkDelete`, que pregunta antes con la confirmación del tema.
- La tabla llama a `model[callback](ids, filas, params)` y después recarga. Los ids incluyen los seleccionados en otras páginas.
- Las casillas de selección sólo salen si `bulkActions()` devuelve alguna acción.

## Edición en la celda {#edicion-en-la-celda}

Una columna de texto de una línea que el formulario ya edita se edita en su celda: clic, se escribe, y Enter o salir guarda sólo ese campo.

Una columna se edita en la celda si se cumple todo esto:

- el modelo tiene `bulkUpdate`;
- la propiedad tiene `datatable`, `form` y `updatable`;
- su tipo es `string` o `char` y su componente, `TextInputComponent`;
- no es `secret` ni tiene `enum`: un enum tiene sus acciones masivas.

El contrato lo declara así:

```js
{
    id: 'title',
    value: t('Title'),
    sortable: true,
    html: false,
    component: 'ClickToEdit',
    parser: (value, row) => ({ value, label: t('Title'), save: (next) => updateField(row.id, 'title', next) }),
},
```

- `updateField(id, campo, valor)` llama a `bulkUpdateModels([id], [], { campo: valor })`, así que pasa por la política de `update` y por las reglas de `UpdateRequest`.
- Si la API lo rechaza, lanza un error con el mensaje de `data.<campo>` y la celda lo enseña **sin cerrarse**.
- El contrato sólo nombra el componente. Cada widget `DataTable` lo aporta con `dataTableComponents`: `ClickToEditComponent` en Vue y, en React, un envoltorio que pasa `save` como `onSave`.

## Las mismas primitivas sin laraimport

`larapack:full-model` acepta las mismas decisiones para un modelo suelto:

```bash
php artisan larapack:full-model AuditEvent --only=policies,index,show --immutable
php artisan larapack:full-model ApiKey --except=update,restore,forceDelete
```

`--only` y `--except` no van juntas, una acción desconocida es un error y `--immutable` no admite escrituras en `--only`. `secret` y `display` sólo se declaran en el laraimport.

En los dos casos, la forma de un modelo que se aparta de la de siempre queda en `models.<Model>.declaration` del manifiesto, que es lo que lee `larapack:verify`.
