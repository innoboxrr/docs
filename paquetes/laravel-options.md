# laravel-options

`innoboxrr/laravel-options` **2.1.0** guarda en la base de datos los ajustes que son del negocio y no del despliegue: el nombre del sitio, su descripción, la maqueta de las páginas. Las credenciales y las claves de API van en el `.env`. Lo que decide quien administra no debería necesitar un despliegue para cambiar.

Las opciones se leen sin sesión, porque el sitio público las necesita antes de que nadie entre. Por eso `index` y `show` son **públicos**.

::: warning Nunca guardes secretos en una opción
Cualquiera puede listar todas las opciones con `GET /api/laravel-options/option/index?paginate=0`. Claves de API, tokens, contraseñas y credenciales van en el `.env`.
:::

## Instalar

```bash
composer require innoboxrr/laravel-options
php artisan migrate
php artisan options:seed
```

Requiere PHP `^8.3`, `illuminate/support ^13.0`, `innoboxrr/search-surge ^3.0` e `innoboxrr/traits ^2.1`.

- **Sanctum** (sugerido). Las rutas de escritura usan `auth:sanctum`, así que la aplicación lo necesita.
- **`maatwebsite/excel`** (sugerido, `^3.1 || ^4.0`). Sólo para exportar.
- **`isAdmin()` en el usuario.** Quien escribe opciones es quien administra.

## Configuración

`config/laravel-options.php`:

| Clave | Por omisión | Qué decide |
|---|---|---|
| `export_disk` | `env('LARAVEL_OPTIONS_EXPORT_DISK', 'local')` | Disco donde se guarda el `.xlsx` exportado |
| `notification_via` | `['mail']` | Canales del aviso de exportación. `database` necesita la tabla `notifications` |
| `excel_view` | `laravel-options::excel.` | Prefijo de la vista de la exportación |
| `user_class` | `App\Models\User` | No lo usa el paquete |

## Variables de entorno

| Variable | Por omisión | Uso |
|---|---|---|
| `LARAVEL_OPTIONS_EXPORT_DISK` | `local` | `export_disk` |

## Publicar

Los tres tags son genéricos: pasa siempre el proveedor.

| Tag | Qué copia |
|---|---|
| `config` | `config/laravel-options.php` |
| `views` | `resources/views/vendor/laravel-options` (la vista de Excel) |
| `vue` | `resources/vue/vendor/laravel-options`: un `models/option.js` y un store de **Vuex** |

```bash
php artisan vendor:publish --provider="Innoboxrr\LaravelOptions\Providers\AppServiceProvider" --tag=config
```

::: warning El tag vue es de la interfaz antigua
Lo que publica `--tag=vue` es un store de Vuex. Las interfaces del ecosistema ya no usan Vuex: la aplicación base trae su propio store de opciones en Pinia (Vue) y en Zustand (React). No lo publiques en una aplicación nueva.
:::

## Migraciones

Se cargan solas desde el paquete; no hace falta publicarlas.

| Tabla | Columnas |
|---|---|
| `options` | `id`, `name` (nullable), `key` (única), `value` (text, nullable), `created_at`, `updated_at`, `deleted_at` |

`key` es única también entre las opciones borradas, porque el borrado es suave.

## Comandos

| Comando | Opciones | Qué hace |
|---|---|---|
| `options:seed` | — | Crea `site_name`, `site_description` y `theme` **sólo si no existen**, también entre las borradas. No toca lo que se cambió desde el panel ni revive una opción borrada. Corre con `--force`, así que siembra también en producción |

## Leer opciones en PHP

```php
use Innoboxrr\LaravelOptions\Models\Option;

Option::value('site_name');            // 'Mi Sitio'
Option::value('theme');                // ['home' => [...]]: un objeto o arreglo JSON vuelve decodificado
Option::value('banner', 'hidden');     // el valor por omisión si la clave falta, está borrada o es null
```

Los valores se guardan como texto. `Option::value()` decodifica los objetos y arreglos JSON y devuelve cualquier otro valor tal cual: `"2024"` o `"true"` siguen siendo texto. No hay caché: cada llamada es una consulta.

## Rutas HTTP

Todas bajo `/api/laravel-options/option/`, en el grupo `api`, con nombres `api.laravel-options.option.*`. El controlador pone `auth:sanctum` en todas salvo `index` y `show`.

| Método | URI | Nombre | Quién | Campos | Respuesta |
|---|---|---|---|---|---|
| GET | `index` | `index` | Cualquiera | `paginate` (10 por omisión; `0` trae todas), `page`, `orderBy`, `orderMode`, `key` (coincidencia parcial) | Colección de opciones |
| GET | `show` | `show` | Cualquiera | `option_id` | Una opción |
| GET | `policies` | `policies` | Con sesión | `id` (opcional) | `{ <acción>: bool, ... }` para cada acción del controlador |
| GET | `policy` | `policy` | Con sesión | `policy` (`index`, `view`, `viewAny`, `create`, `update`, `delete`, `restore`, `forceDelete`, `export`), `id` (obligatorio en las de un registro) | `{ <policy>: bool }` |
| POST | `create` | `create` | Administrador | `name` (obligatorio, máx. 255), `key` (obligatoria, única, máx. 255), `value` (texto, arreglo o vacío) | La opción creada |
| PUT | `update` | `update` | Administrador | `option_id` (obligatorio, existe), `name` (nullable), `key` (si viene, obligatoria y única), `value` (texto, arreglo o vacío) | La opción |
| DELETE | `delete` | `delete` | Administrador | `option_id` | La opción, borrada en suave |
| POST | `restore` | `restore` | Administrador | `option_id` | La opción |
| DELETE | `force-delete` | `force.delete` | Nadie, hasta que lo permitas | `option_id` | — |
| POST | `export` | `export` | Administrador | Los filtros de `index` | `{ status: true }`. 501 sin `maatwebsite/excel`; 500 con `{ message }` si falla |

- **Cada opción** trae `id`, `name`, `key`, `value`, las fechas y un arreglo `actions` heredado de la interfaz antigua.
- **`value` como arreglo** se guarda como JSON, igual que lo siembra el seeder.
- **`index` pagina con search-surge:** 10 por página y como mucho 1000. Con `paginate=0` responde la lista entera, que es lo que suele querer un sitio.
- **Un invitado** recibe 401 en las escrituras y un usuario sin permiso, 403.

**Exportar.** `export` genera un `.xlsx` en `export_disk`, una sola vez aunque el aviso salga por varios canales. El correo enlaza a una URL temporal de un día si el disco la admite, y si no a la URL del disco.

## Políticas y gates

`OptionPolicy` se registra explícitamente para `Option`:

- **En `before()`**, deja pasar a quien tiene `isAdmin()` y responde `true`, en todo menos `forceDelete`.
- **Cada método** devuelve `false`: sin ser administrador no se escribe nada.
- **El borrado definitivo** nace apagado, también para administradores.

Para cambiarlo, registra tu política desde la aplicación. Los proveedores de la aplicación arrancan después de los del paquete, así que la tuya gana:

```php
Gate::policy(\Innoboxrr\LaravelOptions\Models\Option::class, \App\Policies\OptionPolicy::class);
```

## Puntos de extensión

- **Eventos.** Cada escritura lanza un evento de `Innoboxrr\LaravelOptions\Http\Events\Option\Events`: `CreateEvent`, `UpdateEvent`, `DeleteEvent`, `RestoreEvent`, `ForceDeleteEvent` y `ExportEvent`. Los de un registro exponen `$option`, `$data` y `$response`. Es el sitio para invalidar tu propia caché, ya que `Option::value()` no cachea:

  ```php
  use Illuminate\Support\Facades\Cache;
  use Illuminate\Support\Facades\Event;
  use Innoboxrr\LaravelOptions\Http\Events\Option\Events\UpdateEvent;

  Event::listen(UpdateEvent::class, fn (UpdateEvent $event) => Cache::forget('option.'.$event->option->key));
  ```

- **La política**, con `Gate::policy()` como se ve arriba.
- **La vista de Excel**, publicando `views` o cambiando `excel_view`.

## En la aplicación base

- **Siembra.** `app:install` no ejecuta `options:seed`: ejecuta `db:seed --class=Database\Seeders\SiteOptionsSeeder --force`. Ese seeder es de la aplicación y crea, sólo si faltan:
  - `site_name`, con `config('app.name')`;
  - `site_description`;
  - un `theme` completo con las cinco páginas del sitio.
- **Arranque.** El store `options`, en Pinia o en Zustand, carga `api.laravel-options.option.index` con `paginate=0` antes de montar el router. Guarda cada valor decodificado igual que `Option::value()`. Lo lees con `option('site_name')` u `option('theme.home.title')`.
- **Sitio y editor.** El sitio público pinta sus páginas desde `theme`. El editor en `/admin/site`, sólo para administradores, guarda `site_name`, `site_description` y `theme` con `update`, o con `create` si la opción no existe.
- **Diferencia entre interfaces al guardar.** Vue envía `{ option_id, value }` y React `{ option_id, name, key, value }`. Las dos son válidas porque `key` sólo se valida si viene.
- **Entorno.** `app:setup` añade `LARAVEL_OPTIONS_EXPORT_DISK=local`.
- **No hay pantalla genérica de opciones** en el administrador: sólo el editor del sitio.

Ver [El sitio y su editor](/app-base/sitio).

## Actualizar

### De 2.0 a 2.1

- **Cambian valores por defecto de la configuración.**
  - `export_disk` pasa de `s3` a `env('LARAVEL_OPTIONS_EXPORT_DISK', 'local')`.
  - `notification_via` pasa de `['mail', 'database']` a `['mail']`.
  - `excel_view` pasa de `innoboxrrlaraveloptions::excel.` a `laravel-options::excel.`.

  Una configuración ya publicada conserva sus valores: revisa `export_disk` y `notification_via`.
- **`Option::value()` es un método propio.** Antes `Option::value('columna')` llegaba al query builder y devolvía esa columna de la primera fila.
- **`options:seed` ya no restaura** los valores por defecto de las claves que existen.
- **`OptionPolicy` se registra explícitamente.** Antes un administrador podía recibir 403 en toda escritura.
- **Dependencias.** `laravel/sanctum` pasa a sugerido. `innoboxrr/traits` e `innoboxrr/search-surge` pasan a `require`.

## Problemas frecuentes

- **Faltan opciones en el sitio.** `index` pagina de 10 en 10: pide `paginate=0`.
- **Un administrador recibe 403 al guardar.** El usuario no tiene `isAdmin()` o responde `false`, o el paquete es anterior a la 2.1.0.
- **`force-delete` responde 403 a un administrador.** Es a propósito: permítelo con tu propia política.
- **`update` o `delete` sin `option_id` responden 404, no 422.** La opción se busca antes de validar.
- **Una opción vale `"true"` o `"10"` y la tratas como booleano o número.** Sólo los objetos y arreglos JSON se decodifican.
- **`vendor:publish --tag=config` copió configuraciones de otros paquetes.** Pasa `--provider`.
- **La exportación no aparece en la campana.** `notification_via` es `['mail']`: añade `database` en la configuración publicada.
- **`php artisan migrate` fallaba en una aplicación nueva** con `CACHE_STORE=database` antes de la 2.1.0.
