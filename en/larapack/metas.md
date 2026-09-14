# Metas and payload

Some data doesn't deserve a column: a post's SEO, a user's preferences, a counter, the answers to a form that changes over time. With `metas: true` the model stores them as `key`/`value` rows in its `<model>_metas` table, and keeps a copy of all of them in its `payload` column, which can be read without extra queries.

The generated code works end to end: the form sends nested groups, the API flattens them, saves the allowed metas, ignores the protected ones, deletes the empty ones and rebuilds `payload`. Three packages make it work: LaraPack generates the code, `innoboxrr/traits` provides `MetaOperations` and `innoboxrr/support` flattens the request.

## Column or meta

| If the data… | It goes in |
|---|---|
| is filtered, sorted, is a foreign key or needs an index | a column (`props`) |
| is optional, changes shape or there are many of them | a meta |
| is read together with the record, in the API or in a view | `payload`, which builds itself |

::: warning Don't add a JSON column by hand
Flexible data is what metas and `payload` are for. A hand-written JSON column skips the whitelist, can't tell what the form writes from what the system writes, and isn't deleted when it's emptied.
:::

## Declaring them

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

| Key | What it is |
|---|---|
| `metas` | Turns on everything on this page. |
| `editable_metas` | What the form writes, using the already flattened name: if the form sends `seo.og.image`, you declare `seo_og_image`. |
| `protected_metas` | What only your code writes: counters, dates set by a process, whatever the system computes. Takes precedence over `editable_metas`. |

Don't declare `payload`: with `metas: true` it's added automatically.

## What gets generated

### The meta table and model

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

No `softDeletes()`: an empty meta is deleted for real. The unique index is what writes rely on to avoid duplicate keys. The `PostMeta` model has `$guarded = []` and its `belongsTo` relation to `Post`; you don't use it directly.

### The model

- It always uses the `MetaOperations` trait from `innoboxrr/traits`.
- `$editable_metas` and `$protected_metas` come from the contract.
- `payload` is a nullable `longText` column with an `array` cast. It never goes into `$fillable`, `$creatable`, `$updatable` or `$export_cols`, it isn't a table column or a form field, and the factory doesn't give it a value. If you declare it yourself, its type and cast are respected, and everything else is enforced anyway.

### The traits

In `Traits/Relations/<Model>Relations.php`:

```php
public function metas(): HasMany
{
    return $this->hasMany(PostMeta::class);
}
```

In `Traits/Storage/<Model>Storage.php`, create and update save the metas:

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

`updateModelMetas()` accepts the request or an array, so you can also call it from a job.

In `Traits/Operations/<Model>Operations.php`:

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

By default, each meta goes under its own key, and the ones that store a JSON object or list come out already decoded. `updatePayload()` saves without firing events: it's a derived copy, not a change to the record.

### The forms

`CreateForm` and `EditForm` include a text field for every meta in `editable_metas` that isn't in `protected_metas` and doesn't share its name with a column:

- it isn't required: left empty, the meta is deleted;
- it's sent with the flattened name (`seo_title`);
- when editing, it's filled from `payload`.

For a different kind of field, change the component in both forms.

`larapack:full-model Post --metas` wires the model the same way the importer does.

## What the form writes

A form can send nested groups:

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

`RequestFormater::flatten()` flattens them with underscores (`seo_title`, `seo_og_image`, `views`), and `update_metas()` saves only the keys in `$editable_metas` that aren't in `$protected_metas`. With the declaration above, `seo_title` and `seo_og_image` are saved; `views` is ignored.

- **An empty value (`null`, `''` or `[]`) deletes the meta.**
- **A key that isn't sent is left untouched.** To keep a meta as it is, don't send it.
- **A list** (`['a', 'b']`) is stored whole, as JSON, and so is a list of objects with `value`.
- **After saving, `payload` is rebuilt.**
- **Bulk editing** goes through `updateModel()`, so editable metas that arrive in `data` are saved too.

::: tip Validating a meta
Metas aren't columns: a rule on `seo_title` in the laraimport's `requests` triggers a warning. Write it by hand in the request's `rules()`, with the flattened name, which is how the generated forms send it.
:::

## What your code writes

Protected metas are written with `setMeta()` or `setMetas()`, which skip the whitelist. **They don't refresh `payload`**: call `updatePayload()` when you're done.

```php
$post->setMeta('views', $post->meta('views', 0) + 1)->updatePayload();

$post->setMetas([
    'published_by' => $user->id,
    'published_at' => now()->toIso8601String(),
])->updatePayload();
```

That code goes in `Traits/Operations`, which is where the model's logic lives.

## Reading

| How | What it does |
|---|---|
| `$post->getPayload('seo_title')` | Reads the `payload` copy with dot notation, without queries. Accepts a default value. |
| `$post->meta('seo_title', $default)` | Queries the table on every call and returns the value as it was stored: a list comes back as JSON text. |
| `$post->payload` | The whole copy, which the API returns with the record. |

In a listing, read `payload`: `meta()` inside a loop is one query per row.

## You decide the shape of `payload`

Change `buildPayload()` in `Traits/Operations` to return a structure:

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

Then use `$post->getPayload('seo.title')`. After changing it, rebuild `payload` for existing records with `metas:regpayload`.

::: warning The edit form reads flat keys
`EditForm` fills each meta from `payload.<flattened key>`. If `buildPayload()` groups the metas, adapt how the form is filled or keep the flat keys in `payload` as well.
:::

## What `MetaOperations` provides

| Method | What it does |
|---|---|
| `update_metas($requestOrArray, Meta::class, 'post_id')` | The form path: writes the keys in `$editable_metas` that aren't in `$protected_metas`. Empty deletes; missing leaves it untouched; lists are stored as JSON. |
| `setMeta($key, $value)` and `setMetas([...])` | The code path: no whitelist. `setMetas([])` does nothing. |
| `meta($key, $default)` | A meta read from the table, as it was stored. |
| `getPayload('a.b', $default)` | The `payload` copy, with dot notation. |
| `metas_array($requestOrArray)` | What `update_metas` would write. |
| `protectedMetas()` | The keys only the system writes. |

The full reference is in [support, traits and search-surge](/en/packages/support-traits-search).

## Maintenance

With the commands from `innoboxrr/traits`:

```bash
# Rebuild payload for every record, or for one
php artisan metas:regpayload "Acme\Blog\Models\Post"
php artisan metas:regpayload "Acme\Blog\Models\Post" --modelId=42

# Remove duplicate keys and add the unique index to meta tables created without it (MySQL only)
php artisan meta:cleanup "Acme\Blog\Models\PostMeta"
```

`meta:cleanup` takes one or more Meta models, separated by spaces.

## Turning on metas for an existing model

Setting `metas: true` and reimporting with `--force` generates the `PostMeta` model, the `post_metas` migration and an alter migration that adds `payload`, and regenerates the model and the forms you haven't edited. But **the `Relations`, `Storage` and `Operations` traits already exist and aren't rewritten**: add by hand `metas()`, the call to `updateModelMetas()` in `createModel()` and `updateModel()`, `updateModelMetas()` itself, `buildPayload()` and `updatePayload()`, with the content from [The traits](#the-traits).

## What validation warns about

- `editable_metas` or `protected_metas` without `metas: true`: there's no table to store them in.
- A meta in both lists: `protected` wins and the form doesn't write it.
- `payload` declared with `fillable`, `creatable`, `updatable` or `exports_cols` set to `true`: it's ignored.

## Checking it

Create a record sending a nested group and a protected meta, edit it emptying one meta, and look at `payload` in the response: the editable meta must be there, and neither the protected one nor the emptied one.
