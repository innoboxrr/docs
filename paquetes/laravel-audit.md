# laravel-audit

`innoboxrr/laravel-audit` **2.1.1** registra quién cambió qué, cuándo y desde dónde. También lleva un registro de intentos de acceso y una API de administración para consultar los dos.

El registro es **explícito**: tú decides qué operaciones merecen una fila de auditoría y llamas a `log()` ahí. Nada se audita solo.

::: warning En la aplicación base está instalado, pero no hace nada
La aplicación base instala el paquete, fija `LARAVEL_AUDIT_EXPORT_DISK` y `migrate` crea sus tablas. Pero:

- ninguna parte de la aplicación llama a `log()` ni a `trackLoginAttempt()`;
- laravel-auth tampoco los llama;
- no hay pantalla ni entrada en el menú.

Las tablas se quedan vacías hasta que escribas el código de [Puntos de extensión](#puntos-de-extension).
:::

## Instalar

```bash
composer require innoboxrr/laravel-audit
php artisan vendor:publish --tag=laravel-audit-config   # opcional
php artisan migrate
```

Requiere PHP `^8.3`, `illuminate/support ^13.0`, `innoboxrr/search-surge ^3.0` e `innoboxrr/traits ^2.1`. De la aplicación espera:

- **Sanctum.** Todas las rutas usan `auth:sanctum`, aunque el paquete no lo declara.
- **`isAdmin()` en el usuario** (opcional). Un administrador usa toda la API.
- **`isAllowTo($ability, $model)` en el usuario** (opcional). Decide para quien no es administrador; sin ninguno de los dos métodos, 403.
- **`maatwebsite/excel`** (sugerido). Sólo para exportar; sin él, las exportaciones responden 501.

## Configuración

`config/laravel-audit.php`:

| Clave | Por omisión | Qué decide |
|---|---|---|
| `db_prefix` | `''` | Prefijo de las tablas `audits`, `actions` y `login_attempts` |
| `user_class` | `App\Models\User` | El modelo detrás del usuario de una auditoría |
| `excel_view` | `innoboxrrlaravelaudit::excel.` | Prefijo de las vistas de exportación |
| `notification_via` | `['mail', 'database']` | Canales del aviso de exportación. `database` necesita la tabla `notifications` |
| `export_disk` | `env('LARAVEL_AUDIT_EXPORT_DISK', 'local')` | Disco de las exportaciones |
| `builder.basePath` | `base_path('vendor/innoboxrr/laravel-audit/')` | Desde dónde busca search-surge los filtros de `index` |
| `builder.filtersPath` | `src/Models/Filters` | Carpeta de los filtros, relativa a `basePath` |
| `builder.filtersNamespace` | `Innoboxrr\LaravelAudit\Models\Filters` | Namespace de los filtros |

## Variables de entorno

| Variable | Por omisión | Uso |
|---|---|---|
| `LARAVEL_AUDIT_EXPORT_DISK` | `local` | `export_disk` |

## Publicar

| Tag | Qué copia |
|---|---|
| `laravel-audit-config` (o `config`) | `config/laravel-audit.php` |

Las vistas de Excel no se publican.

## Migraciones

Se cargan solas desde el paquete, y todas usan `db_prefix`: fíjalo **antes** de migrar.

| Tabla | Columnas |
|---|---|
| `audits` | `id`, `before` y `after` (longText, nullable), `route` (text), `ip_address`, `user_agent`, `loggable_id`, `loggable_type`, `user_id`, `action_id`, fechas, `deleted_at` |
| `actions` | `id`, `type`, `actionable_id`, `actionable_type`, `description` (nullable), fechas, `deleted_at` |
| `login_attempts` | `id`, `email`, `status` (booleano), `ip_address`, `user_agent`, fechas, `deleted_at` |

Una cuarta migración cambia `audits.route` de `string` a `text`.

## Comandos

No registra comandos.

## Rutas HTTP

Tres recursos, `audit`, `action` y `login_attempt`. Cada uno vive en el grupo `api`, bajo `/api/innoboxrr/laravel-audit/{recurso}/`, con nombres `api.innoboxrr.laravel.audit.{recurso}.*` y `auth:sanctum` en todas sus rutas. El campo del identificador es `audit_id`, `action_id` o `login_attempt_id`.

| Método | URI | Nombre | Campos | Respuesta |
|---|---|---|---|---|
| GET | `policies` | `policies` | `id` (opcional) | `{ <acción>: bool, ... }` |
| GET | `policy` | `policy` | `policy`, `id` | `{ <policy>: bool }` |
| GET | `index` | `index` | Los datos de search-surge: `paginate` (`0` trae todo), `page`, `orderBy`, `orderMode` y los filtros | Colección |
| GET | `show` | `show` | `{recurso}_id`, `load_relations` | Un registro |
| POST | `create` | `create` | Los campos del modelo (sin reglas de validación) | El registro |
| PUT | `update` | `update` | `{recurso}_id` y los campos | El registro |
| DELETE | `delete` | `delete` | `{recurso}_id` | Borrado suave |
| POST | `restore` | `restore` | `{recurso}_id` | El registro |
| DELETE | `force-delete` | `force.delete` | `{recurso}_id` | Borrado definitivo |
| POST | `export` | `export` | Los filtros de `index` | `{ status: true }`. 501 sin `maatwebsite/excel` |

Por ejemplo, el listado de auditorías es `GET /api/innoboxrr/laravel-audit/audit/index`, con el nombre `api.innoboxrr.laravel.audit.audit.index`.

**Exportar.** `export` guarda un `.xlsx` en `export_disk` y avisa por `notification_via`.

## Políticas y gates

`AuditPolicy`, `ActionPolicy` y `LoginAttemptPolicy` se registran con `Gate::policy()`:

- **`before()`** deja pasar a quien tiene `isAdmin()` y responde `true`, en **todas** las habilidades, incluidas `update` y `forceDelete`.
- **Para cualquier otro usuario**, cada habilidad (`index`, `viewAny`, `view`, `create`, `update`, `delete`, `restore`, `forceDelete`, `export`) pregunta a `$user->isAllowTo($habilidad, $modelo)` si existe. Si no existe, niega.

::: warning Un administrador puede editar y borrar el registro de auditoría
La API expone `create`, `update`, `delete` y `force-delete` sobre las auditorías, y un administrador pasa todas. Si necesitas un registro inalterable, sustituye las políticas desde la aplicación con `Gate::policy()`, o no expongas esas rutas.
:::

## Puntos de extensión

### Registrar auditorías

```php
use Innoboxrr\LaravelAudit\Support\Traits\Auditable;

class Invoice extends Model
{
    use Auditable;
}
```

```php
// Actualizar: primero fill, luego log, luego save.
// `before` es la fila guardada y `after` lo que se va a escribir.
$invoice->fill($request->validated());
$invoice->log('update');
$invoice->save();

// Crear o borrar: log cuando el modelo ya tiene id.
$invoice = Invoice::create($data);
$invoice->log('create');

$invoice->audits; // morphMany de Innoboxrr\LaravelAudit\Models\Audit
```

`log(string $type)` hace esto:

- **Guarda**: `before` (el original en JSON), `after` (los atributos en JSON si el modelo tiene cambios sin guardar, y si no `null`), la URL, la IP, el user agent, el usuario autenticado y una `Action`.
- **La `Action`** es una por tipo y registro, y se crea la primera vez.
- **Sólo escribe** dentro de una petición HTTP con un usuario autenticado. En comandos, colas y peticiones de invitados no hace nada y devuelve `null`.

### Registrar intentos de acceso

```php
use Innoboxrr\LaravelAudit\Support\Traits\LoginAttempts;

class User extends Authenticatable
{
    use LoginAttempts;
}

$user->trackLoginAttempt(true);   // o false
$user->loginAttempts;             // hasMany, por email
```

### En un modelo generado por LaraPack

El modelo lo regenera LaraPack, pero sus traits de `Operations` no se vuelven a escribir. Un trait puede usar otro, así que ahí van los del paquete. En la aplicación base, el usuario es `app/Models/User.php` y su trait de operaciones es `app/Models/Traits/Operations/UserOperations.php`:

```php
trait UserOperations
{
    use \Innoboxrr\LaravelAudit\Support\Traits\LoginAttempts;
}
```

laravel-auth inicia sesión con el guard `web`, que lanza los eventos de Laravel `Login` y `Failed`. Para registrar los intentos, escúchalos desde un proveedor de la aplicación:

```php
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;

Event::listen(Login::class, fn (Login $event) => $event->user->trackLoginAttempt(true));
Event::listen(Failed::class, fn (Failed $event) => $event->user?->trackLoginAttempt(false));
```

Un intento con un correo que no existe no tiene usuario, así que no queda registrado. `Login` también se lanza cuando laravel-auth hace entrar a alguien sin contraseña: al registrarse, con el login social y al suplantar o volver de una suplantación. Esos también cuentan como intentos correctos. Ver [Qué se genera y dónde va tu código](/larapack/que-se-genera).

## En la aplicación base

- **Instalación.** `app:setup` pide `innoboxrr/laravel-audit ^2.1` y añade `LARAVEL_AUDIT_EXPORT_DISK=local` al `.env`. `app:install` migra sus tablas.
- **Uso.** Nada más: sin pantalla, sin menú y sin llamadas a `log()`. Sus rutas existen y aparecen en `routes.json`.
- **Permisos.** Sólo responden a administradores, porque el usuario generado tiene `isAdmin()` pero no `isAllowTo()`.

## Actualizar

### De 2.0 a 2.1

- **El disco de las exportaciones pasa de `s3` a `local`.** Si exportabas a S3 sin publicar la configuración, fija `LARAVEL_AUDIT_EXPORT_DISK=s3`.
- **La configuración se publica** con `--tag=laravel-audit-config` o `--tag=config`. Antes el comando del README no publicaba nada.
- **Exportar sin `maatwebsite/excel` responde 501** con un mensaje que dice qué instalar.
- **Las políticas comprueban `isAdmin()` e `isAllowTo()` con `method_exists`.** Un usuario sin esos métodos recibe 403 en lugar de un error fatal.
- **`innoboxrr/search-surge` e `innoboxrr/traits` pasan a `require`.** Se quita `doctrine/dbal`.
- **Se corrigen:**
  - `policy`, que respondía 500;
  - `index` de `action` y `login_attempt`;
  - las exportaciones;
  - el rollback con prefijo;
  - `log()` sin `User-Agent`.

### De 2.1.0 a 2.1.1

Arreglos de los proveedores: la aplicación ya no registra sus rutas dos veces, el correo de verificación ya no sale repetido y las tres políticas se registran de verdad. URIs, nombres, middleware y respuestas no cambian.

## Problemas frecuentes

- **La tabla `audits` está vacía.** Nadie llama a `log()`. Tampoco escribe desde un comando, una cola o una petición sin usuario.
- **`after` es `null`.** Llamaste a `log()` cuando el modelo no tenía cambios sin guardar, por ejemplo después de `save()`.
- **Las tablas se crearon sin prefijo.** `db_prefix` se lee al migrar: cámbialo antes de la primera migración.
- **Un usuario que no administra recibe 403 en todo.** Su modelo no tiene `isAllowTo()`.
- **El enlace del aviso de exportación no descarga el archivo.** El aviso construye el enlace con `config('app.aws_url')`, que Laravel 13 no define. Busca el archivo en `export_disk`.
- **`create` guarda lo que llegue.** Sus reglas de validación están vacías.
