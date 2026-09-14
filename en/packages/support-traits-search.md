# support, traits and search-surge

These three packages have no screens or routes. They are the foundation the other packages, and the code LaraPack generates, are built on:
- `support` flattens forms;
- `traits` stores metas;
- `search-surge` filters, sorts and paginates listings.

`larapack:new` declares them in every new package, and the base application installs them.

| Package | Version | PHP | Laravel | Used by |
|---|---|---|---|---|
| `innoboxrr/support` | 2.1.1 | `^8.3` | `illuminate/support ^13.0` | The `Storage` trait of a model with metas |
| `innoboxrr/traits` | 2.1.0 | `^8.2` | `illuminate/* ^12.0 \|\| ^13.0` | A model with metas; laravel-options, laravel-uploads, laravel-audit |
| `innoboxrr/search-surge` | 3.0.3 | `^8.2` | `illuminate/* ^12.0\|^13.0` | Generated `IndexRequest`s, filters and exports; laravel-options, laravel-audit |

## support

`innoboxrr/support` **2.1.1** holds shared helpers. You usually don't install it yourself; it arrives as a dependency.

### Install

```bash
composer require innoboxrr/support
```

It also requires `giggsey/libphonenumber-for-php ^9.0`.

### Configuration and publishing

`config/innoboxrr-support.php`, under the `innoboxrr-support` key:

| Key | Default | What it decides |
|---|---|---|
| `jobs.force_async` | `false` | Whether `DispatchJob` also queues in the `local` environment, where it otherwise runs the job immediately |
| `user_class`, `excel_view`, `notification_via`, `export_disk` | — | Not used by the package |

| Tag | What it copies |
|---|---|
| `config` | `config/innoboxrr-support.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\Support\Providers\AppServiceProvider" --tag=config
```

::: warning The tag isn't innoboxrr-support-config
The package README says `--tag=innoboxrr-support-config`, which doesn't exist. The real tag is `config`, so pass the provider too.
:::

It has no environment variables, migrations, commands, routes or policies.

### RequestFormater: from nested forms to flat metas

A form can send groups several levels deep. `RequestFormater` turns them into the flat keys `$editable_metas` lists, so `MetaOperations` can store them:

```php
use Innoboxrr\Support\Http\Requests\RequestFormater;

RequestFormater::flatten(['seo' => ['title' => 'T', 'og' => ['image' => 'x.png']]]);
// ['seo_title' => 'T', 'seo_og_image' => 'x.png']

$article->update_metas(RequestFormater::flatten($request->all()), ArticleMeta::class, 'article_id');
```

- **Lists.** A list (`['a', 'b']`) and a list of `value` objects (emails, phones) are kept whole and stored as JSON.
- **Empty values.** An empty group (`'seo' => []`) and empty values are kept, so a form can clear them: `update_metas` deletes a meta that arrives empty.
- **Collisions.** When two keys end up identical (`seo_title` and `seo.title`), the first one wins.
- **`RequestFormater::format($request)`** replaces the request's data in place. Validation rules that run afterwards must use the flattened names.

### The rest

| Class | Methods |
|---|---|
| `Helpers\HttpHelper` | `getSubdomain($host, $mainDomain = null)`: the subdomain of `$host`. Without `$mainDomain` it reads `config('app.app_host')`, which Laravel doesn't define |
| `Helpers\RequestHelper` | `getCookie($key)`: a cookie read from the header. `handleFormRequestWithUser($formRequestClass, $data, $user)`: runs a FormRequest (authorize, validate, `handle()`) as if `$user` had sent it, for queued jobs or seeders |
| `Jobs\DispatchJob` | `DispatchJob::run($class, $connection = 'redis', $queue = 'default', ...$params)`, or `DispatchJob::config($connection, $queue)` with `setDelay()`, `setPriority()` and `dispatch($jobClass, ...$params)`. In `local` it runs the job immediately unless `jobs.force_async` is set |
| `Utils\DataContainer` | A data container: `get`, `set`, `has`, `remove`, `only`, `except`, `merge`, `mergeRecursive`, `replace`, `clear`, `keys`, `values`, `filter`, `map`, `reduce`, `chunk`, `first`, `last`, `sort`, `toArray`, `toJson`, `fromJson`, `isEmpty`, `keysExist`, `count`, and property access |
| `Utils\PhoneFormatter` | `format($number, $region = null)` returns `countryCode`, `number`, `region`, `formattedE164`, `formattedInternational` and `formattedNational` (or `error`). Also `formattedPhone`, `getDialCode`, `getCountryCodeFromDialCode` and `normalizePhone` |

### In the base application

The base application's user is generated with `metas` and an editable `avatar` meta. Its `Storage` trait saves metas like this:

```php
$this->update_metas(RequestFormater::flatten($data), UserMeta::class, 'user_id')->updatePayload();
```

That is what stores the profile photo. See [Metas and payload](/en/larapack/metas).

### Upgrading

- **From 2.1.0 to 2.1.1:**
  - providers extend `Illuminate\Support\ServiceProvider`;
  - `migrate` no longer fails with `CACHE_STORE=database`;
  - application routes are no longer registered twice;
  - the verification email is no longer sent twice.

  The `support_auth_policies` and `support_events_and_observers` cache keys are no longer written; you can delete any left over.
- **The move to 2.1** (empty groups are kept) is covered in LaraPack's [Upgrade guide](/en/larapack/upgrade).

## traits

`innoboxrr/traits` **2.1.0** is a set of independent traits; take only the one you need.

### Install

```bash
composer require innoboxrr/traits
```

### Configuration and publishing

`config/innoboxrrtraits.php` is empty and the provider doesn't load it, so there is nothing to configure. There is a `config` tag, which copies that empty file.

::: warning The tag isn't innoboxrrtraits-config
The README says `--tag=innoboxrrtraits-config`, which doesn't exist. The real tag is `config`, and publishing achieves nothing.
:::

It has no environment variables, migrations, routes or policies.

### The traits

| Trait | Methods |
|---|---|
| `MetaOperations` | See below |
| `ArrayOperations` | `isNotEmpty(array $array)`: `true` if any value isn't null. `wrapImplode($array, $before = '', $after = '', $separator = '')` |
| `DtoTrait` | A data container with the same API as support's `DataContainer` (`get`, `set`, `only`, `except`, `merge`, `toArray`, `toJson`...) |
| `EnumTrait` | For backed enums: `getValues()`, `getKeys()`, `getKey($value)`, `getValue($key)`, `isValid($value)`, `isValidKey($key)`, `isValidValue($value)`, `isValidKeyValue($key, $value)` |
| `ModelAppendsTrait` | `setAppends(array $appends)`: adds attributes to `$appends` without duplicates |
| `DumpsGlobalScopes` | `dumpMyGlobalScopes()`: the model's global scopes, each named by its class, `closure` or `callable` |
| `SemVerOperations` | `incrementVersion($version, $type)` and `decrementVersion($version, $type)` with `major`, `minor` or `patch`; `compareVersions($a, $b)`, `isValidVersion($version)` |

### MetaOperations

Metas are fields that don't deserve a column. Each meta is a `key`/`value` row in the `<model>_metas` table, and `payload` is a JSON column on the model that gathers them so reading costs no queries.

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
use Innoboxrr\Traits\MetaOperations;

class Article extends Model
{
    use MetaOperations;

    // What a form may write.
    protected $editable_metas = ['seo_title', 'seo_description'];

    // What only your code writes. Wins over $editable_metas.
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

The metas table needs `key`, `value` (text), the foreign key and a unique index on (`key`, `<model>_id`): writes are `upsert`s on that pair.

| Method | What it does |
|---|---|
| `update_metas($requestOrArray, Meta::class, 'article_id', $eventClass = null)` | The form path. Writes the keys in `$editable_metas` that aren't in `$protected_metas`. An empty value (`null`, blank string, empty array) deletes the meta; a key that isn't sent is left alone. Arrays are stored as JSON. With `$eventClass`, fires that event for each saved meta. Returns the model |
| `setMeta($key, $value)` / `setMetas([...], $foreignKey = null)` | The code path. No whitelist, so this is how protected metas are written. Arrays are stored as JSON; `setMetas([])` does nothing |
| `meta($key, $default = null)` | Reads one meta from the table, as stored: a JSON meta comes back as a string. One query per call |
| `getPayload('seo.title', $default = null)` | Reads the `payload` copy with dot notation |
| `metas_array($requestOrArray)` | What `update_metas` would write. Without `$editable_metas`, nothing |
| `protectedMetas()` | The keys only the system writes |

`setMeta` and `setMetas` don't refresh `payload`; call `updatePayload()` afterwards.

LaraPack generates all of this when a model declares `metas`. See [Metas and payload](/en/larapack/metas).

### Commands

| Command | Arguments and options | What it does |
|---|---|---|
| `metas:regpayload` | `{modelClass}` (fully qualified class), `{--modelId=}` | Calls `updatePayload()` on one model or all of them, 100 at a time, and reports the ones that fail |
| `meta:cleanup` | `{models*}`: short names of Meta models, separated by spaces | Deletes duplicate (`key`, `<model>_id`) rows, keeping the oldest, and adds the unique index. **MySQL only** |

```bash
php artisan metas:regpayload "App\Models\User"
php artisan metas:regpayload "App\Models\User" --modelId=7
php artisan meta:cleanup UserMeta ArticleMeta
```

`meta:cleanup UserMeta` works on the `user_metas` table and the `user_id` column, and creates the `unique_key_user_id` index.

### In the base application

The generated user uses `MetaOperations`, with `avatar` as an editable meta and `payload` on the `users` table. The interface reads the photo from `payload.avatar`.

### Upgrading

`traits` has no CHANGELOG. Version 2.1.0 changes how `MetaOperations` behaves:
- **`$protected_metas`.** `update_metas` ignores these keys even when they arrive in the request and are listed in `$editable_metas`.
- **Empty array.** It now deletes the meta; before, it was stored as `"[]"`.
- **`setMeta` with an array.** It stores it as JSON; before, it failed.
- **`setMetas([])`.** It does nothing; before, it threw.
- **No `$editable_metas`.** `metas_array` returns `[]`; before, it returned `null` and `update_metas` failed.

The steps for a generated application are in the [Upgrade guide](/en/larapack/upgrade).

### Pitfalls

- **`meta:cleanup` fails on SQLite or PostgreSQL.** It uses MySQL temporary tables and `information_schema`.
- **`meta:cleanup "App\Models\UserMeta"` can't find the table.** It takes the short name: `UserMeta`.
- **Metas get duplicated.** The unique index on (`key`, `<model>_id`) is missing, so `upsert` inserts instead of updating.
- **`payload` doesn't reflect a `setMeta`.** Call `updatePayload()`.
- **`EnumTrait::getKey()` doesn't return the case name.** It returns the case's position in the list, and `null` for the first case. `getValue($key)` looks up with `from()`, which means by value.
- **`SemVerOperations` with an invalid version or type** ends in a class-not-found error instead of a readable exception.

## search-surge

`innoboxrr/search-surge` **3.0.3** filters, sorts and paginates Eloquent models. You write small filters, one per file; search-surge finds them, orders them and applies them. It works the same inside an application as inside a package, with no hardcoded paths.

### Install

```bash
composer require innoboxrr/search-surge
```

The provider and the `SearchSurge` facade are auto-discovered.

### Usage

```php
use Innoboxrr\SearchSurge\Facades\SearchSurge;

SearchSurge::get(User::class, $request->all());      // collection or paginator
SearchSurge::query($model, $data, $options);         // Builder, not executed
SearchSurge::count($model, $data, $options);         // int
SearchSurge::exists($model, $data, $options);        // bool
SearchSurge::first($model, $data, $options);         // Model|null
SearchSurge::lazy($model, $data, $options);          // LazyCollection in chunks
SearchSurge::lazyById($model, $data, $options);      // LazyCollection by keyset
SearchSurge::cursor($model, $data, $options);        // PDO cursor
```

The v2 API still works: `(new Builder())->get($model, $data, $options)`, `setBasePath()` and `filtersPath`. It's what laravel-options, laravel-audit and the code LaraPack generates use.

**A filter:**

```php
namespace App\Models\Filters\User;

use Illuminate\Database\Eloquent\Builder;
use Innoboxrr\SearchSurge\Search\Contracts\Filter;
use Innoboxrr\SearchSurge\Search\Support\DataContainer;
use Innoboxrr\SearchSurge\Search\Utils\Order;

class NameFilter implements Filter
{
    // If none of these keys arrives, the filter doesn't run.
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

`App\Models\User` looks for its filters in `App\Models\Filters\User\*` with no configuration; the real directory comes from Composer's autoloader. A filter may declare `$keys`, `$priority` and `$critical`.

**Common filters.** Every model responds to these without any files:
- `?id=`, `?ids=` and `?id_not=`;
- the `created_at` and `updated_at` date ranges;
- `?orderBy=` and `?orderMode=`;
- `?trashed=`.

A common filter is dropped when the model already has one with the same short name or overlapping keys.

**Request data** (`$data`):

| Key | Effect |
|---|---|
| `paginate` | `0` returns everything; a number is the page size, capped at `max_per_page` |
| `page`, `cursor` | Current page or cursor |
| `orderBy`, `orderMode` | Column and direction; each filter interprets them |
| `paginator` | `length_aware`, `simple` or `cursor` |
| `managed` | Applies the authorization filters (`Managed`) |
| `except_view_any` | With `managed`, users with `viewAny` skip the restriction |

**Code options** (`$options`):

| Key | Effect |
|---|---|
| `filters`, `filtersNamespace`, `filtersPath` | Where filters come from. `filters` is an exhaustive list, with no common filters |
| `query` | A Builder to start from |
| `columns` | Columns instead of `*`. Only read from `$options`, never from the request |
| `with`, `withCount`, `withoutGlobalScopes` | Relations and scopes |
| `perPage`, `maxPerPage`, `maxPage`, `countCache` | Page size, depth, and `COUNT(*)` caching |
| `paginator`, `stableOrder` | Pagination mode and primary-key tie-breaking |
| `strict` | Make a failing filter throw |
| `events`, `slowThreshold` | Observability |

**Building blocks for filters:**

| Building block | What it's for |
|---|---|
| `DateFilterQuery` | Date ranges and operators without `whereDate()` |
| `NumericFilterQuery` | `?price_min=`, `?price_max=`, `?price=50&price_operator=>` |
| `SetFilterQuery` | Sets against a whitelist |
| `RelationFilterQuery` | `exists`, `count` and `column` on a relation |
| `Order` | `orderBy`, `orderByAny` and `fallback` |
| `TextSearch` | `prefix`, `contains`, `suffix` and `fullText`, with wildcards escaped |
| `EngineFilter` | Delegating search to Scout or an external engine |

Each one exposes `keys()` for declaring `$keys`.

**Authorization.** A filter extending `Innoboxrr\SearchSurge\Search\Utils\Managed` implements `canView($query, $user, array $args = [])`. It applies when the data carries `managed`, always first, and its exceptions propagate: returning unrestricted results because the permission filter failed would be a data leak.

**On the model.** The `HasSearchSurge` trait adds `surgeFilters()`, `surgeOptions()`, `surgeSearch()`, `surgeQuery()`, `surgeCount()`, `surgeLazy()` and the `->surge($data, $options)` scope. In a package, `SearchSurge::registerNamespace()`, `registerFilters()` and `registerFilterMap()` declare filters from the provider.

**Input contract.**
- `SearchSurge::schema($model)` describes the parameters a model accepts.
- `SearchSurge::unknownParameters($model, $data)` spots a `?nombre=` sent instead of `?name=`.

**Observability.** Every search fires `Events\SearchExecuted` with the model, the filters that actually applied, the SQL, the bindings and the time.

### Configuration

```bash
php artisan vendor:publish --tag=search-surge-config
```

The `search-surge` tag copies the same file, `config/search-surge.php`.

| Key | Default | Variable |
|---|---|---|
| `filters.map` | `[]` | — |
| `filters.namespaces` | `[]` | — |
| `filters.suffix` | `Filters` | — |
| `filters.defaults` | `IdFilter`, `TimestampsFilter`, `SoftDeletesFilter` | — |
| `filters.namespace` / `filters.path` | `App\Models\Filters` / `app/Models/Filters` | — |
| `cache.enabled` | `null` (production only) | `SEARCH_SURGE_CACHE` |
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

Beyond `max_page`, `PageLimitExceededException` is thrown and rendered as 400.

It has no migrations, routes or policies.

### Commands

| Command | Arguments and options | What it does |
|---|---|---|
| `search-surge:filter` | `{model} {name} {--type=basic} {--force}` | Creates a filter where discovery looks for it. `--type`: `basic`, `text`, `date`, `engine` or `managed` |
| `search-surge:filters` | `{model?} {--namespace=*} {--json}` | Lists the filters that apply, in which order and with which keys. `--json` dumps the input contract |
| `search-surge:explain` | `{model} {--data=} {--count} {--time} {--sql}` | Analyses the SQL and the execution plan and warns about what won't scale. Exits 1 on a critical finding |
| `search-surge:cache` | `{--namespace=*} {--show}` | Compiles the model → filters map so nothing is scanned at runtime |
| `search-surge:clear` | — | Deletes that manifest |

```bash
php artisan search-surge:filters "App\Models\User"
php artisan search-surge:explain "App\Models\User" --data='{"name":"ana"}' --time
```

### In the base application

- **Admin listings.** Every `IndexRequest` LaraPack generates, starting with the users one, hands the request to search-surge. The tables send `paginate`, `page`, `orderBy` and `orderMode`. The generated filters are `IdFilter`, `CreationFilter`, `UpdatedFilter`, `EagerLoadingFilter` and `ManagedFilter`. The last one is an extension point: without your `canView`, the listing restricts nothing. See [What is generated and where your code goes](/en/larapack/generated-code).
- **Options.** The `options` store requests laravel-options' `index` with `paginate=0`.

### Upgrading

**From v2 to v3**, nothing needs to change for it to keep working. Behaviour changes in five places:
1. `updated_at_start_date` and `updated_at_end_date` filter on `updated_at`; before, they filtered on `created_at`.
2. `Managed` booleans are read correctly, so `?except_view_any=false` no longer skips the permission check.
3. A `ManagedFilter` that throws is no longer ignored.
4. `paginate` is capped at `max_per_page` (1000).
5. It requires PHP 8.2 and Laravel 12 or newer. Laravel 13 requires PHP 8.3, and anyone still on Laravel 11 stays on 2.0.6.

Optionally: drop `filtersPath`, declare `$keys`, add `search-surge:cache` to your deploy, and move exports to `lazy()`.

### Pitfalls

- **The listing returns only 10 rows.** `per_page` is 10; send `paginate`.
- **A filter doesn't apply.** Check with `search-surge:filters`: it must live in `<Models>\Filters\<Model>\` and have a static `apply`.
- **A filter is skipped for some parameters.** You declared `$keys` without every key you read; the classic case is forgetting `Order::KEYS`.
- **A new filter doesn't show up in production.** Discovery is cached there: run `php artisan search-surge:clear`.
- **A filter fails and the search carries on.** By default the failure is logged and the search continues; use `strict` to see it.
- **`ManagedFilter` doesn't restrict anything.** The request doesn't send `managed`, or `canView` returns the query untouched.
- **Page order shifts between pages.** You're sorting by a non-unique column; `stable_order` adds the primary key only when there's already an `ORDER BY`.

## Versions and the baseline

The ecosystem baseline is PHP `^8.3` and Laravel `^13.0`. `traits` and `search-surge` declare PHP `^8.2` and `illuminate/* ^12 || ^13`, below that baseline:
- **On a Laravel 13 application** they install without trouble.
- **`larapack:audit`** reports this as a warning: the constraint admits versions outside the baseline, so CI has to cover them.
- **Their CI doesn't call the ecosystem's shared workflow.** Each has its own matrix (PHP 8.2 to 8.4 with Laravel 12 and 13), so neither goes through `larapack:audit`.

See [Versions and compatibility](/en/help/versions) and [The baseline](/en/ci/).
