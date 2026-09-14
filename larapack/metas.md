# Metas y payload

Hay datos que no merecen una columna: el SEO de un post, las preferencias de un usuario, un contador, las respuestas de un formulario que cambia con el tiempo. Con `metas: true` el modelo los guarda como filas `key`/`value` en su tabla `<modelo>_metas`, y guarda una copia de todos en su columna `payload`, que se lee sin consultas.

Lo generado funciona de punta a punta: el formulario manda grupos anidados, la API los aplana, guarda las metas permitidas, ignora las protegidas, borra las vacías y rehace `payload`. Lo ponen en marcha tres paquetes: LaraPack genera el código, `innoboxrr/traits` aporta `MetaOperations` e `innoboxrr/support` aplana la petición.

## Columna o meta

| Si el dato… | Va en |
|---|---|
| se filtra, se ordena, es una clave foránea o necesita un índice | una columna (`props`) |
| es opcional, cambia de forma o son muchos | una meta |
| se lee junto con el registro, en la API o en una vista | `payload`, que se arma solo |

::: warning No añadas una columna JSON a mano
Para datos flexibles están las metas y `payload`. Una columna JSON escrita a mano no pasa por la lista blanca, no distingue lo que escribe el formulario de lo que escribe el sistema y no se borra al vaciarse.
:::

## Declararlas

```json
{
    "models": [
        {
            "name": "Post",
            "metas": true,
            "editable_metas": ["seo_title", "seo_og_image"],
            "protected_metas": ["views"],
            "props": [
                { "name": "title", "type": "string", "form": true, "form_component": "TextInputComponent", "form_submit": true, "datatable": true }
            ]
        }
    ]
}
```

| Clave | Qué es |
|---|---|
| `metas` | Activa todo lo de esta página. |
| `editable_metas` | Lo que escribe el formulario, con el nombre ya aplanado: si el formulario manda `seo.og.image`, se declara `seo_og_image`. |
| `protected_metas` | Lo que sólo escribe tu código: contadores, fechas de un proceso, lo que calcula el sistema. Gana sobre `editable_metas`. |

No declares `payload`: con `metas: true` se añade solo.

## Qué se genera

### La tabla y el modelo de metas

```php
Schema::create('post_metas', function (Blueprint $table) {
    $table->id();
    $table->string('key');
    $table->longText('value');
    $table->foreignId('post_id')->constrained()->onDelete('cascade');
    $table->timestamps();

    $table->unique(['key', 'post_id'], 'unique_key_post_id');
});
```

Sin `softDeletes()`: una meta vacía se borra de verdad. El índice único es el que usan las escrituras para no duplicar claves. El modelo `PostMeta` tiene `$guarded = []` y su relación `belongsTo` con `Post`; no se usa directamente.

### El modelo

- Usa siempre el trait `MetaOperations` de `innoboxrr/traits`.
- `$editable_metas` y `$protected_metas` salen del contrato.
- `payload` es una columna `longText` anulable con cast `array`. Nunca entra en `$fillable`, `$creatable`, `$updatable` ni `$export_cols`, no es columna de la tabla ni campo del formulario, y la factory no le da valor. Si la declaras tú, se respetan su tipo y su cast, y lo demás se impone igual.

### Los traits

En `Traits/Relations/<Model>Relations.php`:

```php
public function metas(): HasMany
{
    return $this->hasMany(PostMeta::class);
}
```

En `Traits/Storage/<Model>Storage.php`, crear y actualizar guardan las metas:

```php
public function createModel($request)
{
    $post = $this->create($request->only($this->creatable));

    $post->updateModelMetas($request);

    return $post;
}

public function updateModel($request)
{
    $this->update($request->only($this->updatable));

    $this->updateModelMetas($request);

    return $this;
}

public function updateModelMetas($request)
{
    $data = is_array($request) ? $request : $request->all();

    $this->update_metas(RequestFormater::flatten($data), PostMeta::class, 'post_id')->updatePayload();

    return $this;
}
```

`updateModelMetas()` acepta la request o un array, así que también se puede llamar desde un job.

En `Traits/Operations/<Model>Operations.php`:

```php
public function buildPayload(): array
{
    return $this->metas()->pluck('value', 'key')
        ->map(fn ($value) => is_string($value) && json_validate($value) && in_array($value[0] ?? '', ['{', '['], true)
            ? json_decode($value, true)
            : $value)
        ->all();
}

public function updatePayload(): bool
{
    $this->payload = $this->buildPayload();

    return $this->saveQuietly();
}
```

Por defecto, cada meta va con su clave, y las que guardan un objeto o una lista en JSON salen ya decodificadas. `updatePayload()` guarda sin disparar eventos: es una copia derivada, no un cambio del registro.

### Los formularios

`CreateForm` y `EditForm` traen un campo de texto por cada meta de `editable_metas` que no esté en `protected_metas` ni se llame como una columna:

- no es obligatorio: vacío, la meta se borra;
- viaja con el nombre aplanado (`seo_title`);
- al editar se rellena desde `payload`.

Para otro tipo de campo, cambia el componente en los dos formularios.

`larapack:full-model Post --metas` deja el modelo conectado igual que el importador.

## Qué escribe el formulario

Un formulario puede mandar grupos anidados:

```php
[
    'title' => 'Hola',
    'seo' => [
        'title' => 'Hola, mundo',
        'og' => ['image' => 'portada.png'],
    ],
    'views' => 999,
]
```

`RequestFormater::flatten()` los aplana con guion bajo (`seo_title`, `seo_og_image`, `views`) y `update_metas()` guarda sólo las claves de `$editable_metas` que no están en `$protected_metas`. Con la declaración de arriba quedan `seo_title` y `seo_og_image`; `views` se ignora.

- **Un valor vacío (`null`, `''` o `[]`) borra la meta.**
- **Una clave que no llega no se toca.** Para no cambiar una meta, no la mandes.
- **Una lista** (`['a', 'b']`) se guarda entera, como JSON, igual que una lista de objetos con `value`.
- **Después de guardar se rehace `payload`.**
- **La edición masiva** pasa por `updateModel()`, así que las metas editables que lleguen en `data` también se guardan.

::: tip Validar una meta
Las metas no son columnas: una regla sobre `seo_title` en `requests` del laraimport da un aviso. Escríbela a mano en `rules()` del request, con el nombre aplanado, que es como la mandan los formularios generados.
:::

## Qué escribe tu código

Las metas protegidas se escriben con `setMeta()` o `setMetas()`, que no pasan por la lista blanca. **No refrescan `payload`**: llama a `updatePayload()` al terminar.

```php
$post->setMeta('views', $post->meta('views', 0) + 1)->updatePayload();

$post->setMetas([
    'published_by' => $user->id,
    'published_at' => now()->toIso8601String(),
])->updatePayload();
```

Ese código va en `Traits/Operations`, que es el sitio de la lógica del modelo.

## Leer

| Cómo | Qué hace |
|---|---|
| `$post->getPayload('seo_title')` | Lee la copia de `payload` con notación de puntos, sin consultas. Admite un valor por defecto. |
| `$post->meta('seo_title', $default)` | Consulta la tabla en cada llamada y devuelve el valor tal como se guardó: una lista vuelve como texto JSON. |
| `$post->payload` | La copia entera, que la API devuelve con el registro. |

En un listado, lee `payload`: `meta()` en un bucle es una consulta por fila.

## La forma de `payload` la decides tú

Cambia `buildPayload()` en `Traits/Operations` para leer una estructura:

```php
public function buildPayload(): array
{
    $metas = $this->metas()->pluck('value', 'key');

    return [
        'seo' => [
            'title' => $metas['seo_title'] ?? null,
            'image' => $metas['seo_og_image'] ?? null,
        ],
        'views' => (int) ($metas['views'] ?? 0),
    ];
}
```

Y después `$post->getPayload('seo.title')`. Tras cambiarla, rehaz `payload` de los registros que ya existen con `metas:regpayload`.

::: warning El formulario de edición lee claves planas
`EditForm` rellena cada meta desde `payload.<clave aplanada>`. Si `buildPayload()` agrupa las metas, adapta el relleno del formulario o deja también las claves planas en `payload`.
:::

## Lo que ofrece `MetaOperations`

| Método | Qué hace |
|---|---|
| `update_metas($requestOrArray, Meta::class, 'post_id')` | El camino del formulario: escribe las claves de `$editable_metas` que no están en `$protected_metas`. Vacío borra; ausente no toca; las listas van como JSON. |
| `setMeta($key, $value)` y `setMetas([...])` | El camino del código: sin lista blanca. `setMetas([])` no hace nada. |
| `meta($key, $default)` | Una meta leída de la tabla, tal como se guardó. |
| `getPayload('a.b', $default)` | La copia de `payload`, con notación de puntos. |
| `metas_array($requestOrArray)` | Lo que `update_metas` escribiría. |
| `protectedMetas()` | Las claves que sólo escribe el sistema. |

La referencia completa está en [support, traits y search-surge](/paquetes/support-traits-search).

## Mantenimiento

Con los comandos de `innoboxrr/traits`:

```bash
# Rehace payload de todos los registros, o de uno
php artisan metas:regpayload "Acme\Blog\Models\Post"
php artisan metas:regpayload "Acme\Blog\Models\Post" --modelId=42

# Quita claves duplicadas y añade el índice único a tablas de metas creadas sin él (sólo MySQL)
php artisan meta:cleanup "Acme\Blog\Models\PostMeta"
```

`meta:cleanup` recibe uno o varios modelos Meta, separados por espacios.

## Activar metas en un modelo que ya existe

Poner `metas: true` y reimportar con `--force` genera el modelo `PostMeta`, la migración de `post_metas` y una migración de alteración que añade `payload`, y regenera el modelo y los formularios que no hayas editado. Pero **los traits `Relations`, `Storage` y `Operations` ya existen y no se reescriben**: añade a mano `metas()`, la llamada a `updateModelMetas()` en `createModel()` y `updateModel()`, el propio `updateModelMetas()`, `buildPayload()` y `updatePayload()`, con el contenido de [Los traits](#los-traits).

## Lo que avisa la validación

- `editable_metas` o `protected_metas` sin `metas: true`: no hay tabla donde guardarlas.
- Una meta en las dos listas: gana `protected` y el formulario no la escribe.
- `payload` declarado con `fillable`, `creatable`, `updatable` o `exports_cols` en `true`: se ignora.

## Comprobarlo

Crea un registro mandando un grupo anidado y una meta protegida, edítalo vaciando una meta y mira `payload` en la respuesta: tiene que estar la meta editable, no la protegida y no la vaciada.
