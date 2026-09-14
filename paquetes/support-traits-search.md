# support, traits y search-surge

Estos tres paquetes no tienen pantallas ni rutas: son la base sobre la que se escriben los demás y el código que genera LaraPack.

- `support` aplana los formularios.
- `traits` guarda las metas.
- `search-surge` filtra, ordena y pagina los listados.

`larapack:new` los declara en cada paquete nuevo y la aplicación base los instala.

| Paquete | Versión | PHP | Laravel | Lo usa |
|---|---|---|---|---|
| `innoboxrr/support` | 2.1.1 | `^8.3` | `illuminate/support ^13.0` | El trait `Storage` de un modelo con metas |
| `innoboxrr/traits` | 2.1.0 | `^8.2` | `illuminate/* ^12.0 \|\| ^13.0` | Un modelo con metas; laravel-options, laravel-uploads, laravel-audit |
| `innoboxrr/search-surge` | 3.0.3 | `^8.2` | `illuminate/* ^12.0\|^13.0` | Los `IndexRequest`, filtros y exportaciones generados; laravel-options, laravel-audit |

## support

`innoboxrr/support` **2.1.1** reúne utilidades compartidas. Normalmente no se instala a mano: llega como dependencia.

### Instalar

```bash
composer require innoboxrr/support
```

Requiere además `giggsey/libphonenumber-for-php ^9.0`.

### Configuración y publicación

`config/innoboxrr-support.php`, clave `innoboxrr-support`:

| Clave | Por omisión | Qué decide |
|---|---|---|
| `jobs.force_async` | `false` | Si `DispatchJob` encola también en el entorno `local`, donde por omisión ejecuta el job en el momento |
| `user_class`, `excel_view`, `notification_via`, `export_disk` | — | No las usa el paquete |

| Tag | Qué copia |
|---|---|
| `config` | `config/innoboxrr-support.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\Support\Providers\AppServiceProvider" --tag=config
```

::: warning El tag no es innoboxrr-support-config
El README del paquete indica `--tag=innoboxrr-support-config`, que no existe. El tag real es `config`: pasa también el proveedor.
:::

No tiene variables de entorno, migraciones, comandos, rutas ni políticas.

### RequestFormater: de formulario anidado a metas planas

Un formulario puede mandar grupos de varios niveles. `RequestFormater` los convierte en las claves planas que lista `$editable_metas`, para que `MetaOperations` las guarde:

```php
use Innoboxrr\Support\Http\Requests\RequestFormater;

RequestFormater::flatten(['seo' => ['title' => 'T', 'og' => ['image' => 'x.png']]]);
// ['seo_title' => 'T', 'seo_og_image' => 'x.png']

$article->update_metas(RequestFormater::flatten($request->all()), ArticleMeta::class, 'article_id');
```

- **Listas.** Una lista (`['a', 'b']`) y una lista de objetos con `value` (correos, teléfonos) se conservan enteras y se guardan como JSON.
- **Vacíos.** Un grupo vacío (`'seo' => []`) y los valores vacíos se conservan, así un formulario puede vaciarlos: `update_metas` borra la meta que llega vacía.
- **Choques.** Si dos claves acaban siendo la misma (`seo_title` y `seo.title`), gana la primera.
- **`RequestFormater::format($request)`** sustituye el contenido de la petición: las reglas de validación que corran después usan los nombres aplanados.

### El resto

| Clase | Métodos |
|---|---|
| `Helpers\HttpHelper` | `getSubdomain($host, $mainDomain = null)`: el subdominio de `$host`. Sin `$mainDomain` lee `config('app.app_host')`, que Laravel no define |
| `Helpers\RequestHelper` | `getCookie($key)`: una cookie leída de la cabecera. `handleFormRequestWithUser($formRequestClass, $data, $user)`: ejecuta un FormRequest (autoriza, valida y llama a `handle()`) como si lo enviara `$user`, para colas o seeders |
| `Jobs\DispatchJob` | `DispatchJob::run($class, $connection = 'redis', $queue = 'default', ...$params)`, o `DispatchJob::config($connection, $queue)` con `setDelay()`, `setPriority()` y `dispatch($jobClass, ...$params)`. En `local` ejecuta el job en el momento salvo con `jobs.force_async` |
| `Utils\DataContainer` | Un contenedor de datos: `get`, `set`, `has`, `remove`, `only`, `except`, `merge`, `mergeRecursive`, `replace`, `clear`, `keys`, `values`, `filter`, `map`, `reduce`, `chunk`, `first`, `last`, `sort`, `toArray`, `toJson`, `fromJson`, `isEmpty`, `keysExist`, `count` y acceso como propiedad |
| `Utils\PhoneFormatter` | `format($number, $region = null)` devuelve `countryCode`, `number`, `region`, `formattedE164`, `formattedInternational` y `formattedNational` (o `error`). También `formattedPhone`, `getDialCode`, `getCountryCodeFromDialCode` y `normalizePhone` |

### En la aplicación base

El usuario de la aplicación base se genera con `metas` y la meta editable `avatar`. Su trait de `Storage` guarda las metas así:

```php
$this->update_metas(RequestFormater::flatten($data), UserMeta::class, 'user_id')->updatePayload();
```

Es lo que guarda la foto del perfil. Ver [Metas y payload](/larapack/metas).

### Actualizar

- **De 2.1.0 a 2.1.1:**
  - los proveedores heredan de `Illuminate\Support\ServiceProvider`;
  - `migrate` ya no falla con `CACHE_STORE=database`;
  - las rutas de la aplicación no se registran dos veces;
  - el correo de verificación ya no sale repetido.

  Las claves de caché `support_auth_policies` y `support_events_and_observers` dejan de escribirse; las que queden se pueden borrar.
- **El paso a la 2.1** (grupos vacíos que se conservan) se describe en la [Guía de actualización](/larapack/actualizar) de LaraPack.

## traits

`innoboxrr/traits` **2.1.0** es un conjunto de traits independientes: usa sólo el que necesites.

### Instalar

```bash
composer require innoboxrr/traits
```

### Configuración y publicación

`config/innoboxrrtraits.php` está vacío y el proveedor no lo carga: no hay nada que configurar. Existe el tag `config`, que copia ese archivo vacío.

::: warning El tag no es innoboxrrtraits-config
El README indica `--tag=innoboxrrtraits-config`, que no existe. El tag real es `config`, y publicar no sirve de nada.
:::

No tiene variables de entorno, migraciones, rutas ni políticas.

### Los traits

| Trait | Métodos |
|---|---|
| `MetaOperations` | Ver abajo |
| `ArrayOperations` | `isNotEmpty(array $array)`: `true` si algún valor no es nulo. `wrapImplode($array, $before = '', $after = '', $separator = '')` |
| `DtoTrait` | Un contenedor de datos con la misma API que `DataContainer` de support (`get`, `set`, `only`, `except`, `merge`, `toArray`, `toJson`...) |
| `EnumTrait` | Para enums respaldados: `getValues()`, `getKeys()`, `getKey($value)`, `getValue($key)`, `isValid($value)`, `isValidKey($key)`, `isValidValue($value)`, `isValidKeyValue($key, $value)` |
| `ModelAppendsTrait` | `setAppends(array $appends)`: añade atributos a `$appends` sin duplicar |
| `DumpsGlobalScopes` | `dumpMyGlobalScopes()`: los scopes globales del modelo, cada uno con su clase, `closure` o `callable` |
| `SemVerOperations` | `incrementVersion($version, $type)`, `decrementVersion($version, $type)` con `major`, `minor` o `patch`; `compareVersions($a, $b)`, `isValidVersion($version)` |

### MetaOperations

Las metas son campos que no merecen columna. Cada meta es una fila `key`/`value` en la tabla `<modelo>_metas`, y `payload` es una columna JSON del modelo que las reúne para leerlas sin consultas.

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
use Innoboxrr\Traits\MetaOperations;

class Article extends Model
{
    use MetaOperations;

    // Lo que puede escribir un formulario.
    protected $editable_metas = ['seo_title', 'seo_description'];

    // Lo que sólo escribe tu código. Gana sobre $editable_metas.
    protected $protected_metas = ['views'];

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }

    public function metas(): HasMany
    {
        return $this->hasMany(ArticleMeta::class);
    }

    public function buildPayload(): array
    {
        return $this->metas()->pluck('value', 'key')->all();
    }

    public function updatePayload(): bool
    {
        $this->payload = $this->buildPayload();

        return $this->save();
    }
}
```

La tabla de metas necesita `key`, `value` (text), la clave foránea y un índice único sobre (`key`, `<modelo>_id`): las escrituras son `upsert` sobre ese par.

| Método | Qué hace |
|---|---|
| `update_metas($requestOArreglo, Meta::class, 'article_id', $eventClass = null)` | El camino del formulario. Escribe las claves de `$editable_metas` que no estén en `$protected_metas`. Un valor vacío (`null`, texto en blanco, arreglo vacío) borra la meta; una clave que no llega no se toca. Los arreglos se guardan como JSON. Con `$eventClass`, lanza ese evento por cada meta guardada. Devuelve el modelo |
| `setMeta($key, $value)` / `setMetas([...], $foreignKey = null)` | El camino del código. Sin lista blanca, así se escriben las metas protegidas. Los arreglos se guardan como JSON; `setMetas([])` no hace nada |
| `meta($key, $default = null)` | Lee una meta de la tabla, tal como está guardada: una meta JSON vuelve como texto. Una consulta por llamada |
| `getPayload('seo.title', $default = null)` | Lee la copia de `payload` con notación de puntos |
| `metas_array($requestOArreglo)` | Lo que `update_metas` escribiría. Sin `$editable_metas`, nada |
| `protectedMetas()` | Las claves que sólo escribe el sistema |

`setMeta` y `setMetas` no refrescan `payload`: llama a `updatePayload()` después.

LaraPack genera todo esto cuando un modelo declara `metas`. Ver [Metas y payload](/larapack/metas).

### Comandos

| Comando | Argumentos y opciones | Qué hace |
|---|---|---|
| `metas:regpayload` | `{modelClass}` (la clase completa), `{--modelId=}` | Llama a `updatePayload()` en un modelo o en todos, de 100 en 100, e informa de los que fallan |
| `meta:cleanup` | `{models*}`: nombres cortos de modelos Meta, separados por espacios | Borra las filas duplicadas de (`key`, `<modelo>_id`), conservando la más antigua, y añade el índice único. **Sólo MySQL** |

```bash
php artisan metas:regpayload "App\Models\User"
php artisan metas:regpayload "App\Models\User" --modelId=7
php artisan meta:cleanup UserMeta ArticleMeta
```

`meta:cleanup UserMeta` trabaja sobre la tabla `user_metas` y la columna `user_id`, y crea el índice `unique_key_user_id`.

### En la aplicación base

El usuario generado usa `MetaOperations`, con `avatar` como meta editable y `payload` en la tabla `users`. La interfaz lee la foto de `payload.avatar`.

### Actualizar

`traits` no tiene CHANGELOG. La 2.1.0 cambia el comportamiento de `MetaOperations`:

- **`$protected_metas`.** `update_metas` ignora estas claves aunque lleguen en la petición y figuren en `$editable_metas`.
- **Arreglo vacío.** Ahora borra la meta; antes se guardaba como `"[]"`.
- **`setMeta` con un arreglo.** Lo guarda como JSON; antes fallaba.
- **`setMetas([])`.** No hace nada; antes lanzaba una excepción.
- **Sin `$editable_metas`.** `metas_array` devuelve `[]`; antes devolvía `null` y `update_metas` fallaba.

Los pasos para una aplicación generada están en la [Guía de actualización](/larapack/actualizar).

### Problemas frecuentes

- **`meta:cleanup` falla en SQLite o PostgreSQL.** Usa tablas temporales e `information_schema` de MySQL.
- **`meta:cleanup "App\Models\UserMeta"` no encuentra la tabla.** Recibe el nombre corto: `UserMeta`.
- **Las metas se duplican.** Falta el índice único sobre (`key`, `<modelo>_id`) y el `upsert` inserta en lugar de actualizar.
- **`payload` no refleja un `setMeta`.** Llama a `updatePayload()`.
- **`EnumTrait::getKey()` no devuelve el nombre del caso.** Devuelve su posición en la lista, y `null` para el primero. `getValue($key)` busca con `from()`, es decir, por valor.
- **`SemVerOperations` con una versión o un tipo inválidos** termina en un error de clase no encontrada en lugar de una excepción legible.

## search-surge

`innoboxrr/search-surge` **3.0.3** filtra, ordena y pagina modelos Eloquent. Escribes filtros pequeños, uno por archivo; search-surge los encuentra, los ordena y los aplica. Funciona igual dentro de una aplicación que dentro de un paquete, sin rutas a mano.

### Instalar

```bash
composer require innoboxrr/search-surge
```

El proveedor y la fachada `SearchSurge` se descubren solos.

### Uso

```php
use Innoboxrr\SearchSurge\Facades\SearchSurge;

SearchSurge::get(User::class, $request->all());      // colección o paginador
SearchSurge::query($model, $data, $options);         // Builder sin ejecutar
SearchSurge::count($model, $data, $options);         // int
SearchSurge::exists($model, $data, $options);        // bool
SearchSurge::first($model, $data, $options);         // Model|null
SearchSurge::lazy($model, $data, $options);          // LazyCollection por lotes
SearchSurge::lazyById($model, $data, $options);      // LazyCollection por keyset
SearchSurge::cursor($model, $data, $options);        // cursor PDO
```

La API de la v2 sigue funcionando: `(new Builder())->get($model, $data, $options)`, `setBasePath()` y `filtersPath`. Es la que usan laravel-options, laravel-audit y el código que genera LaraPack.

**Un filtro:**

```php
namespace App\Models\Filters\User;

use Illuminate\Database\Eloquent\Builder;
use Innoboxrr\SearchSurge\Search\Contracts\Filter;
use Innoboxrr\SearchSurge\Search\Support\DataContainer;
use Innoboxrr\SearchSurge\Search\Utils\Order;

class NameFilter implements Filter
{
    // Si no llega ninguna de estas claves, el filtro no se ejecuta.
    public static array $keys = ['name', ...Order::KEYS];

    public static function apply(Builder $query, DataContainer $data)
    {
        if ($data->filled('name')) {
            $query->where('name', $data->string('name'));
        }

        return Order::orderBy($query, $data, 'name');
    }
}
```

`App\Models\User` busca sus filtros en `App\Models\Filters\User\*` sin configurar nada; el directorio real sale del autoloader de Composer. Un filtro puede declarar `$keys`, `$priority` y `$critical`.

**Filtros comunes.** Todo modelo responde, sin crear archivos, a:

- `?id=`, `?ids=` e `?id_not=`;
- los rangos de fecha de `created_at` y `updated_at`;
- `?orderBy=` y `?orderMode=`;
- `?trashed=`.

Un filtro común se descarta si el modelo ya tiene uno con el mismo nombre corto o con claves que se solapan.

**Datos de la petición** (`$data`):

| Clave | Efecto |
|---|---|
| `paginate` | `0` trae todo; un número es el tamaño de página, acotado a `max_per_page` |
| `page`, `cursor` | Página o cursor actual |
| `orderBy`, `orderMode` | Columna y sentido; los interpreta cada filtro |
| `paginator` | `length_aware`, `simple` o `cursor` |
| `managed` | Aplica los filtros de autorización (`Managed`) |
| `except_view_any` | Con `managed`, quien tiene `viewAny` se salta la restricción |

**Opciones del código** (`$options`):

| Clave | Efecto |
|---|---|
| `filters`, `filtersNamespace`, `filtersPath` | De dónde salen los filtros. `filters` es una lista exhaustiva, sin comunes |
| `query` | Un Builder del que partir |
| `columns` | Columnas en vez de `*`. Sólo se lee de `$options`, nunca de la petición |
| `with`, `withCount`, `withoutGlobalScopes` | Relaciones y scopes |
| `perPage`, `maxPerPage`, `maxPage`, `countCache` | Tamaño, profundidad y caché del `COUNT(*)` |
| `paginator`, `stableOrder` | Modo de paginación y desempate por clave primaria |
| `strict` | Que un filtro que falla propague la excepción |
| `events`, `slowThreshold` | Observabilidad |

**Piezas para escribir filtros:**

| Pieza | Para qué |
|---|---|
| `DateFilterQuery` | Rangos y operadores de fecha sin `whereDate()` |
| `NumericFilterQuery` | `?precio_min=`, `?precio_max=`, `?precio=50&precio_operator=>` |
| `SetFilterQuery` | Conjuntos con lista blanca |
| `RelationFilterQuery` | `exists`, `count` y `column` sobre una relación |
| `Order` | `orderBy`, `orderByAny` y `fallback` |
| `TextSearch` | `prefix`, `contains`, `suffix` y `fullText`, con los comodines escapados |
| `EngineFilter` | Delegar la búsqueda en Scout o en un motor externo |

Cada pieza expone `keys()` para declarar `$keys`.

**Autorización.** Un filtro que extiende `Innoboxrr\SearchSurge\Search\Utils\Managed` implementa `canView($query, $user, array $args = [])`. Se aplica con `managed` en los datos, siempre primero, y sus excepciones se propagan: devolver resultados sin acotar porque falló el filtro de permisos sería una fuga de datos.

**En el modelo.** El trait `HasSearchSurge` añade `surgeFilters()`, `surgeOptions()`, `surgeSearch()`, `surgeQuery()`, `surgeCount()`, `surgeLazy()` y el scope `->surge($data, $options)`. En un paquete, `SearchSurge::registerNamespace()`, `registerFilters()` y `registerFilterMap()` declaran los filtros desde el proveedor.

**Contrato de entrada.**

- `SearchSurge::schema($model)` describe los parámetros que acepta un modelo.
- `SearchSurge::unknownParameters($model, $data)` detecta un `?nombre=` enviado en vez de `?name=`.

**Observabilidad.** Cada búsqueda lanza `Events\SearchExecuted` con el modelo, los filtros que entraron, el SQL, los bindings y el tiempo.

### Configuración

```bash
php artisan vendor:publish --tag=search-surge-config
```

El tag `search-surge` copia el mismo archivo, `config/search-surge.php`.

| Clave | Por omisión | Variable |
|---|---|---|
| `filters.map` | `[]` | — |
| `filters.namespaces` | `[]` | — |
| `filters.suffix` | `Filters` | — |
| `filters.defaults` | `IdFilter`, `TimestampsFilter`, `SoftDeletesFilter` | — |
| `filters.namespace` / `filters.path` | `App\Models\Filters` / `app/Models/Filters` | — |
| `cache.enabled` | `null` (sólo en producción) | `SEARCH_SURGE_CACHE` |
| `cache.store` | `null` | `SEARCH_SURGE_CACHE_STORE` |
| `cache.ttl` | `86400` | — |
| `cache.prefix` | `search-surge:filters:` | — |
| `pagination.per_page` | `10` | — |
| `pagination.max_per_page` | `1000` | — |
| `pagination.page_name` | `page` | — |
| `pagination.paginator` | `length_aware` | — |
| `pagination.count_cache` | `null` | `SEARCH_SURGE_COUNT_CACHE` |
| `pagination.max_page` | `null` | `SEARCH_SURGE_MAX_PAGE` |
| `pagination.stable_order` | `true` | — |
| `text.min_length` | `1` | — |
| `text.max_terms` | `8` | — |
| `observability.events` | `true` | — |
| `observability.slow_threshold` | `null` (ms) | `SEARCH_SURGE_SLOW_MS` |
| `strict` | `false` | `SEARCH_SURGE_STRICT` |

Por encima de `max_page` se lanza `PageLimitExceededException`, que se renderiza como 400.

No tiene migraciones, rutas ni políticas.

### Comandos

| Comando | Argumentos y opciones | Qué hace |
|---|---|---|
| `search-surge:filter` | `{model} {name} {--type=basic} {--force}` | Crea un filtro donde el descubrimiento lo busca. `--type`: `basic`, `text`, `date`, `engine` o `managed` |
| `search-surge:filters` | `{model?} {--namespace=*} {--json}` | Lista los filtros que se aplican, en qué orden y con qué claves. `--json` vuelca el contrato de entrada |
| `search-surge:explain` | `{model} {--data=} {--count} {--time} {--sql}` | Analiza el SQL y el plan de ejecución y avisa de lo que no va a escalar. Sale con 1 ante un hallazgo crítico |
| `search-surge:cache` | `{--namespace=*} {--show}` | Compila el mapa modelo → filtros para no escanear en tiempo de ejecución |
| `search-surge:clear` | — | Borra ese manifiesto |

```bash
php artisan search-surge:filters "App\Models\User"
php artisan search-surge:explain "App\Models\User" --data='{"name":"ana"}' --time
```

### En la aplicación base

- **Los listados del administrador.** Cada `IndexRequest` que genera LaraPack, empezando por el de usuarios, pasa la petición a search-surge. Las tablas envían `paginate`, `page`, `orderBy` y `orderMode`. Los filtros generados son `IdFilter`, `CreationFilter`, `UpdatedFilter`, `EagerLoadingFilter` y `ManagedFilter`. El último es un punto de extensión: sin tu `canView`, el listado no restringe nada. Ver [Qué se genera y dónde va tu código](/larapack/que-se-genera).
- **Las opciones.** El store `options` pide el `index` de laravel-options con `paginate=0`.

### Actualizar

**De v2 a v3** no hay que tocar nada para que siga funcionando. Cambia el comportamiento en cinco puntos:

1. `updated_at_start_date` y `updated_at_end_date` filtran por `updated_at`; antes lo hacían por `created_at`.
2. Los booleanos de `Managed` se leen bien: `?except_view_any=false` ya no salta la comprobación de permisos.
3. Un `ManagedFilter` que lanza ya no se ignora.
4. `paginate` se acota a `max_per_page` (1000).
5. Requiere PHP 8.2 y Laravel 12 o superior. Laravel 13 requiere PHP 8.3, y quien siga en Laravel 11 se queda en la 2.0.6.

Opcional: quita los `filtersPath`, declara `$keys`, añade `search-surge:cache` al despliegue y pasa las exportaciones a `lazy()`.

### Problemas frecuentes

- **El listado trae sólo 10 filas.** `per_page` es 10: envía `paginate`.
- **Un filtro no se aplica.** Compruébalo con `search-surge:filters`: el filtro tiene que estar en `<Modelos>\Filters\<Modelo>\` y tener un `apply` estático.
- **Un filtro se salta con ciertos parámetros.** Declaraste `$keys` sin todas las claves que lees; el caso típico es olvidar `Order::KEYS`.
- **Un filtro nuevo no se ve en producción.** El descubrimiento se cachea allí: `php artisan search-surge:clear`.
- **Un filtro falla y la búsqueda sigue.** Por omisión se registra en el log y continúa; usa `strict` para verlo.
- **`ManagedFilter` no restringe.** La petición no envía `managed`, o `canView` devuelve la consulta sin tocar.
- **Cambia el orden de las páginas.** Ordena por una columna no única; `stable_order` añade la clave primaria sólo si ya había `ORDER BY`.

## Versiones y línea base

La línea base del ecosistema es PHP `^8.3` y Laravel `^13.0`. `traits` y `search-surge` declaran PHP `^8.2` e `illuminate/* ^12 || ^13`, por debajo de ella:

- **En una aplicación Laravel 13** se instalan sin problema.
- **`larapack:audit`** lo marca como aviso: la restricción admite versiones fuera de la línea base y la CI tiene que cubrirlas.
- **Su CI no llama al workflow compartido del ecosistema.** Cada uno tiene su propia matriz (PHP 8.2 a 8.4 con Laravel 12 y 13), así que no pasa por `larapack:audit`.

Ver [Versiones y compatibilidad](/ayuda/versiones) y [La línea base](/ci/).
