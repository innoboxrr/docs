# Qué se genera y dónde va tu código

Un modelo produce unas 58 piezas: la API completa, sus tests y, si lo pides, su módulo de interfaz. Esta página es el mapa: qué archivo sale y cuándo, dónde escribes tú, qué no se toca y qué no se reescribe nunca.

Las rutas son las de un **paquete**. En una **aplicación**, `src/` pasa a ser `app/` y el namespace, `App\`; el resto de diferencias están [al final](#paquete-o-aplicacion).

En los nombres, `<Model>` es el modelo (`OrderLine`), `<Plural>` su plural (`OrderLines`), `<snake>` su snake_case (`order_line`), `<tabla>` el plural en snake_case (`order_lines`) y `<kebab>` su kebab-case (`order-line`).

## Por modelo

### Modelo, traits y filtros

| Archivo | Cuándo | Qué es |
|---|---|---|
| `src/Models/<Model>.php` | Siempre | El modelo: `$fillable`, `$hidden`, `$creatable`, `$updatable`, `$protected_metas`, `$editable_metas`, `$export_cols`, `$loadable_relations`, `$loadable_counts` y `casts()`, sacados del contrato. Enlaza su observer, su política y su factory con `#[ObservedBy]`, `#[UsePolicy]` y `#[UseFactory]`. |
| `src/Models/<Model>Meta.php` | Con `metas: true` | Una fila `key`/`value` de `<snake>_metas`. |
| `src/Models/Traits/Relations/<Model>Relations.php` | Si no existe | **Hueco.** Las relaciones declaradas y, con metas, `metas()`. |
| `src/Models/Traits/Operations/<Model>Operations.php` | Si no existe | **Hueco.** La lógica de negocio. Con metas, `buildPayload()` y `updatePayload()`. |
| `src/Models/Traits/Storage/<Model>Storage.php` | Si no existe | **Hueco.** `createModel()`, `updateModel()`, `deleteModel()`, `restoreModel()` (con `restore`), `forceDeleteModel()` y, con metas, `updateModelMetas()`. |
| `src/Models/Traits/Mutators/<Model>Mutators.php` | Si no existe | **Hueco.** Accessors y mutators. |
| `src/Models/Traits/Assignments/<Model>Assignment.php` | Si no existe | Un ejemplo comentado de asignación a través de una pivote. |
| `src/Models/Filters/<Model>/ManagedFilter.php` | Siempre | **Hueco.** `canView()`: quién ve qué. |
| `src/Models/Filters/<Model>/IdFilter.php`, `CreationFilter.php`, `UpdatedFilter.php`, `EagerLoadingFilter.php` | Siempre | Los filtros fijos de search-surge. |

### HTTP

| Archivo | Cuándo | Qué es |
|---|---|---|
| `src/Http/Controllers/<Model>Controller.php` | Con alguna acción | Un método por acción que delega en su request, con el middleware `auth:sanctum`. |
| `src/Http/Controllers/Controller.php` | En un paquete, una vez | El controlador base. |
| `src/Http/Requests/<Model>/<Acción>Request.php` | Uno por acción declarada | `PoliciesRequest`, `PolicyRequest`, `IndexRequest`, `ShowRequest`, `CreateRequest`, `UpdateRequest`, `DeleteRequest`, `RestoreRequest`, `ForceDeleteRequest`, `ExportRequest`, `BulkUpdateRequest` y `BulkDeleteRequest`. Autorizan, validan y hacen el trabajo en `handle()`. |
| `src/Http/Resources/Models/<Model>Resource.php` | Siempre | **Hueco.** La respuesta: `parent::toArray()` más el array `actions` de la fila. |
| `src/Http/Events/<Model>/Events/<Acción>Event.php` | Con `create`, `update`, `delete`, `restore`, `forceDelete` o `export` | El evento, con el idioma de la petición. |
| `src/Http/Events/<Model>/Listeners/<Acción>Event/DefaultOperation.php` | Uno por evento | **Hueco.** Los efectos secundarios. |
| `src/Http/Events/<Model>/Listeners/ExportEvent/SendExportNotification.php` | Con `export` | Manda la notificación que crea el archivo. |
| `routes/api/models/<snake>.php` | Con alguna acción | Una ruta por acción. |

### Autorización, ciclo de vida y exportación

| Archivo | Cuándo | Qué es |
|---|---|---|
| `src/Policies/<Model>Policy.php` | Siempre | **Hueco.** Una habilidad por acción. Nace cerrada. |
| `src/Observers/<Model>Observer.php` | Siempre | **Hueco.** `created` y un handler por escritura declarada. |
| `src/Exports/<Plural>Exports.php` | Con `export` | La consulta y la vista de la hoja. |
| `resources/views/excel/<snake>.blade.php` | Con `export` | La tabla que se convierte en hoja. |
| `src/Notifications/<Model>/ExportNotification.php` | Con `export` | Crea el archivo y avisa con el enlace. |

### Base de datos, tests y textos

| Archivo | Cuándo | Qué es |
|---|---|---|
| `database/migrations/<fecha>_create_<tabla>_table.php` | Siempre | La creación. |
| `database/migrations/<fecha>_create_<snake>_metas_table.php` | Con `metas: true` | La tabla de metas. |
| `database/migrations/<fecha>_alter_<tabla>_table.php` | Al reimportar con otras columnas | La alteración. Ver [Migraciones](/larapack/migraciones). |
| `database/factories/<Model>Factory.php` | Siempre | **Hueco.** Un valor que la base acepta para cada columna. |
| `tests/Feature/Models/<Model>EndpointsTest.php` | Si no existe | **Hueco.** Un test por acción y, con `immutable`, los de inmutabilidad. |
| `lang/es.json` | Al generar el recurso y la notificación | Las claves de las acciones de fila y del correo de exportación que LaraPack sabe traducir. |

## Por proyecto

| Archivo | Cuándo | Qué es |
|---|---|---|
| `tests/TestCase.php` | Si no existe | En un paquete, arranca Testbench con los proveedores de `composer.json`, Sanctum y Excel, usa `tests/User.php`, llama a `JsonResource::withoutWrapping()`, migra y abre la autorización con `Gate::before`. En una aplicación, el `TestCase` vacío de Laravel. |
| `tests/User.php` | En un paquete, si no existe | El usuario con que se autentican los tests. |
| `phpunit.xml` | Si no hay ni `phpunit.xml` ni `phpunit.xml.dist` | |
| `composer.json` | En un paquete | Añade `<Namespace>\Database\Factories\` al autoload y `<Namespace>\Tests\` al autoload-dev. |
| `.larapack/manifest.json` | Siempre | El registro de lo generado. Se versiona. Ver [Regenerar sin destruir](/larapack/regenerar). |

Los proveedores y la configuración no los genera el importador: están en [Proveedores y configuración](/larapack/comandos#proveedores-y-configuracion).

## El módulo de interfaz

Sólo con `--vue`, `--react` o los dos. `<ui>` es `vue` o `react`, y los componentes son `.vue` o `.jsx`.

### Por modelo, en `resources/<ui>/src/models/<kebab>/`

| Archivo | Necesita | Qué es |
|---|---|---|
| `index.js` | — | El contrato del modelo. **Es el mismo archivo en Vue y en React.** |
| `store/index.js` | — | Store de Pinia (Vue) o de Zustand (React), con la misma superficie. |
| `routes/index.js` | `index` y `policies` | Las rutas del modelo. |
| `views/AdminView` | `index` y `policies` | El índice, con la tabla, el drawer de alta y la paleta de comandos. |
| `widgets/DataTable` | `index` y `policies` | La tabla. |
| `forms/FilterForm` | `index` y `policies` | Los filtros. |
| `views/ShowView`, `widgets/ModelCard`, `widgets/ModelProfile` | `index`, `policies` y `show` | La ficha. |
| `views/CreateView`, `forms/CreateForm` | `index`, `policies` y `create` | El alta. |
| `views/EditView`, `forms/EditForm` | `index`, `policies`, `show` y `update` | La edición. |

Las vistas cuelgan del índice, y el índice necesita las políticas porque la tabla las consulta para decidir qué acciones ofrece. Sin `index` o sin `policies` el módulo sólo trae el contrato y el store.

### Del módulo, en `resources/<ui>/`

| Archivo | Qué es |
|---|---|
| `index.js` | El punto de entrada. |
| `src/routes/index.js` | Reúne las rutas de `src/models/*/routes/index.js` con un glob de Vite. En React exporta además `registerModuleRoutes` y `routeNamesOf`. |
| `src/theme.js` | Importa `innoboxrr-form-core/styles` y deja preparados `setTheme` y `setIcons`. |
| `src/i18n.js` | Exporta `translations` y `tableLabels()`. |
| `src/locales/en.json`, `src/locales/es.json` | Los textos, que LaraPack completa cada vez que genera. |
| `src/components/Breadcrumbs`, `src/components/ActionMenu` | Las migas y el menú de acciones de un registro. |
| `package.json`, `vite.config.js` | Sólo en un paquete. El nombre npm es el namespace en kebab-case: `acme-catalogo` en Vue y `acme-catalogo-react` en React. En una aplicación los pone la aplicación. |

### Lo que exporta el punto de entrada

::: code-group

```js [Vue]
import module, { routes, translations } from 'acme-catalogo'

// routes        las rutas de todos los modelos, para montarlas como hijas
// translations  { en, es }
// module        plugin de Vue, { install(app, options) }, vacío por defecto
```

```js [React]
import routes, { registerModuleRoutes, routeNamesOf, translations } from 'acme-catalogo-react'

// routes                      las rutas de todos los modelos (también como export nombrado)
// registerModuleRoutes(base)  registra los nombres de ruta con el prefijo donde se montan
// routeNamesOf(tree, base)    nombre → ruta completa, recorriendo el árbol
// translations                { en, es }
```

:::

Cómo se usa cada pieza está en [La interfaz generada](/larapack/interfaz) y cómo se monta, en [Montar un paquete en una aplicación](/larapack/montar-en-aplicacion).

## Dónde va tu código {#donde-va-tu-codigo}

Estos son los sitios donde se escribe a mano. Si una lógica no cabe en ninguno, falta algo en el `laraimport.json`: no hay que salirse.

| Hueco | Qué va ahí |
|---|---|
| `Traits/Operations/` | La lógica de negocio del modelo. Es el sitio por defecto. Con metas, también la forma de `payload` en `buildPayload()`. |
| `Traits/Relations/` | Relaciones que el JSON no expresa (through, polimórficas completas, condicionales) y los métodos de las relaciones que declares después de crear el trait. |
| `Traits/Storage/` | La subida y el borrado de archivos del modelo, y lo que haga falta al crear o actualizar. |
| `Traits/Mutators/` | Accessors y mutators. |
| `Filters/<Model>/ManagedFilter::canView` | **Quién puede ver qué.** Sin esto el índice lo devuelve todo a quien pase la política. |
| `Policies/<Model>Policy` | La autorización por acción. Nace cerrada: cada método devuelve `false`, sólo pasa el administrador en `before()`, y ni él borra para siempre hasta que se quite `forceDelete` de `$exceptAbilities`. |
| `Requests/*/rules()` | Reglas que no vienen del JSON, dentro del array. |
| `Resources/<Model>Resource` | La forma exacta de la respuesta y su array `actions`. |
| `Events/*/Listeners/` | Efectos secundarios: notificaciones, colas, integraciones. |
| `Observers/` | El ciclo de vida del modelo. |
| `database/factories/` | Datos de prueba realistas. Las generadas ya insertan. |
| `tests/Feature/` | El comportamiento. Los tests generados pasan recién generados y prueban que cada endpoint responde, con la autorización abierta; la autorización pruébala aparte, contra la política. |

**El modelo es una fachada, no un almacén de lógica.** Un método público en `Operations` que orquesta, y el trabajo real en la clase que le corresponda.

::: warning La autorización no va en el modelo
Si escondes un `abort(403)` en el modelo, la API de políticas no lo ve y la tabla ofrece un botón que falla. Quién puede hacer qué se decide en la política, que es lo que consulta el front.
:::

## Qué no se toca

- **El controlador.** Delega en los requests y no tiene lógica. Lo distinto va en el request.
- **El archivo de rutas.** Si falta un endpoint, falta en el generador o en `routes`.
- **Las listas del modelo:** `$fillable`, `$creatable`, `$updatable`, `$export_cols`, `$loadable_relations`, `$loadable_counts`, `$editable_metas`, `$protected_metas` y `casts()`. Salen del JSON; editarlas separa el código del contrato.
- **Lo que un request declara fuera de su array de reglas.**
- **`models/<kebab>/index.js` de un solo framework.** Es el mismo archivo en Vue y en React; editarlo en uno los separa.
- **Clases de un framework CSS** (`uk-*`, `fa-*`, Tailwind) en un archivo generado. El aspecto sale del tema.

Un archivo generado que editas queda marcado como `customised` en `larapack:verify` y ya no recibe regeneraciones. En un hueco es lo esperado; en el controlador, las rutas o el modelo es deriva.

## Los marcadores

Hay dos clases de marcas en las plantillas.

**Bloques condicionales.** Las plantillas marcan lo que depende de una acción o de una clave del modelo:

```php
// @larapack:if update
public function update(UpdateRequest $request) { ... }
// @larapack:endif
```

Las condiciones son el nombre de una acción, `immutable`, `secret`, `metas` o `authenticatable`; `a|b` se cumple si se cumple cualquiera, `a&b` si se cumplen las dos, y `!a` si no se cumple `a`. Las líneas del marcador desaparecen siempre, así que nunca llegan a tu proyecto.

**Marcadores de datos.** Son el sitio donde el importador escribe lo que sale del contrato:

| Marcador | Dónde | Qué pone |
|---|---|---|
| `//FILLABLE//`, `//HIDDEN//`, `//CREATABLE//`, `//UPDATABLE//`, `//EDITABLEMETAS//`, `//EXPORTCOLS//`, `//LOADABLERELATIONS//`, `//LOADABLECOUNTS//`, `//CASTS//` | El modelo | Las listas y los casts. |
| `//RULES//` | `CreateRequest` y `UpdateRequest` | Las reglas de `requests`. |
| `//IMPORTS//` y `//EDIT//` | El trait `Relations` | Los `use` y los métodos de relación. |
| `//EDIT//` | Migración de creación, migración de pivote y factory | Las columnas y los valores de la factory. |
| `//UP//` y `//DOWN//` | Migración de alteración | Los cambios y su reverso. |
| `//DATA_TABLE_COLUMNS//`, `//DATA_TABLE_SORT//` y `//BULK_UPDATE_ACTIONS//` | `models/<kebab>/index.js` | Las columnas de la tabla, el orden por defecto y una acción masiva por valor de enum. |
| `<!-- Add more inputs -->` (Vue), `{/* Add more inputs */}` (React), `//import_more_components//`, `//form_fields//`, `//submit_data//` y `//props//` | Los formularios | Los campos, sus imports, el estado, lo que se envía y las props. |

Desde `larapack:import` cada marcador se sustituye por su contenido y desaparece. Un generador suelto no tiene laraimport y deja los marcadores de datos tal cual, con el archivo vacío de columnas, reglas o campos.

## Lo que nunca se reescribe

| Qué | Por qué |
|---|---|
| Los cinco traits (`Relations`, `Operations`, `Storage`, `Mutators` y `Assignment`) | Son tuyos desde que existen: sólo se crean si faltan, ni `--force` los reescribe y no entran en el manifiesto. |
| `tests/Feature/Models/<Model>EndpointsTest.php` | Se crea si falta y no entra en el manifiesto. Para recibir el de una versión nueva, bórralo y vuelve a importar. |
| `tests/TestCase.php`, `tests/User.php` y `phpunit.xml` | Se copian una vez. |
| Las migraciones de pivotes | Se crean si no hay una migración de creación de esa tabla. |
| Una migración de creación que no generó LaraPack | Se omite. Ver [Migraciones](/larapack/migraciones#migraciones-que-no-genero-larapack). |
| Una traducción que no está vacía, en `src/locales/*.json` o en `lang/es.json` | Al generar sólo se suman claves nuevas y se rellenan las vacías que LaraPack conoce. Un JSON inválido se deja como está. |
| Lo que `larapack:new` escribe fuera de los generadores: `README.md`, `CHANGELOG.md`, `VERSION`, `AGENTS.md`, los workflows, `pint.json`, `phpstan.neon.dist`, `phpunit.xml.dist`, `.gitignore`, `.gitattributes` y `LICENSE` | Es del paquete desde el primer commit: no pasa por el manifiesto, y cambiarlo no es una desviación de la arquitectura. |
| La skill instalada | `larapack:skill` sólo la pisa con `--force`. |
| Cualquier archivo generado que editaste | `--force` lo conserva y lo dice. |

## Paquete o aplicación {#paquete-o-aplicacion}

| | Paquete | Aplicación |
|---|---|---|
| Código | `src/`, con el namespace del paquete | `app/`, con `App\` |
| Rutas | `api/<namespace>/<snake>`, nombres `api.<namespace>.<snake>.*` | `api/app/<snake>`, nombres `api.app.<snake>.*` |
| Factories | `<Namespace>\Database\Factories` | `Database\Factories` |
| Tests | `<Namespace>\Tests\Feature\Models`, con el `TestCase` de Testbench y `tests/User.php` | `Tests\Feature\Models`, con el `TestCase` de la aplicación; inician sesión con la factory del modelo de `auth.providers.users.model` |
| Módulo de interfaz | Con su `package.json` y su `vite.config.js` | Sin ellos: lo compila la aplicación, que declara sus dependencias |
| Vista y configuración de la exportación | `<clave>::excel.` y `config/<clave>.php` | `excel.` y `config/larapack.php` |
| Proveedores | En `extra.laravel.providers`, descubiertos por Laravel | Registrados a mano en `bootstrap/providers.php` |

El detalle está en [Paquete o aplicación](/conceptos/paquete-o-aplicacion).

## Cómo es el PHP generado

Lo generado sigue las convenciones de Laravel 13, pasa `pint --test` y Larastan de nivel 5:

- **Modelos:** los casts se declaran con el método `casts(): array`, y el observer, la política y la factory se enlazan con `#[ObservedBy]`, `#[UsePolicy]` y `#[UseFactory]`, sin descubrirlos por reflexión.
- **Controladores:** implementan `HasMiddleware` con un `middleware()` estático; el controlador base no extiende `Illuminate\Routing\Controller`.
- **Rutas:** callables `[Controlador::class, 'método']`, así que el `RouteServiceProvider` no declara namespace de controladores.
- **Proveedores:** extienden `Illuminate\Support\ServiceProvider`.
- **Migraciones, requests, políticas y recursos:** firmas con tipo de retorno (`up(): void`, `rules(): array`, `toArray(Request $request): array`).
- **Eventos:** toman el idioma de la petición en un parámetro `locale`, sin cambiar el idioma de la aplicación.
