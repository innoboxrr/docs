# laravel-notifications

`innoboxrr/laravel-notifications` **2.1.0** expone por HTTP las notificaciones de base de datos de Laravel del usuario autenticado. Permite listarlas, contarlas, marcarlas como leídas y borrarlas. Es lo que usa la campana del administrador.

No define modelos ni notificaciones propias: trabaja con la relación `notifications` del trait `Illuminate\Notifications\Notifiable`. Cualquier notificación que envíes con el canal `database` aparece aquí.

## Instalar

```bash
composer require innoboxrr/laravel-notifications
php artisan notifications:install
php artisan migrate
```

Requiere PHP `^8.3`, `laravel/framework ^13.0` y `laravel/sanctum ^4.3`. El usuario tiene que usar `Notifiable`; el `App\Models\User` de Laravel y el que genera LaraPack con `authenticatable` ya lo traen.

## Configuración

La configuración se carga sin publicarla, en la clave `innoboxrrlaravelnotifications`.

| Clave | Por omisión |
|---|---|
| `user_class` | `App\Models\User` |
| `notification_via` | `['mail', 'database']` |
| `excel_view` | `innoboxrrlaravelnotifications::excel.` |
| `export_disk` | `s3` |

Las rutas no leen ninguna de estas claves: trabajan siempre con el usuario autenticado. Se conservan para aplicaciones que las consultan.

## Variables de entorno

El paquete no lee variables de entorno.

## Publicar

| Tag | Qué copia |
|---|---|
| `config` | `config/innoboxrrlaravelnotifications.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\LaravelNotifications\Providers\AppServiceProvider" --tag=config
```

## Migraciones

El paquete no trae migraciones propias. Necesita la tabla `notifications` de Laravel, que una aplicación nueva no tiene: la publica `notifications:install`.

## Comandos

| Comando | Opciones | Qué hace |
|---|---|---|
| `notifications:install` | — | Publica la migración de Laravel (`make:notifications-table`) sólo si no existe ya un `*_create_notifications_table.php` ni la tabla. Se puede ejecutar las veces que haga falta. Si la base de datos todavía no responde, publica la migración |

`php artisan make:notifications-table` hace lo mismo, pero falla si la migración ya existe. Por eso no sirve para un instalador que se ejecuta más de una vez.

## Rutas HTTP

Todas van en el grupo `web` y el controlador exige `auth:sanctum`. Operan sólo sobre las notificaciones del usuario autenticado.

| Método | URI | Nombre | Campos | Respuesta JSON |
|---|---|---|---|---|
| GET | `/innoboxrr/notifications/notifications` | `innoboxrr.notifications.index` | `limit` (opcional, entero ≥ 1) | Arreglo de notificaciones, las más recientes primero |
| GET | `/innoboxrr/notifications/notifications/unread` | `innoboxrr.notifications.index.unread` | `limit` (opcional) | Arreglo de no leídas |
| GET | `/innoboxrr/notifications/notifications/unread/count` | `innoboxrr.notifications.index.unread.count` | — | `{ count }` |
| POST | `/innoboxrr/notifications/notifications/markAsRead` | `innoboxrr.notifications.mark.all.as.read` | — | `{ success, count }` |
| DELETE | `/innoboxrr/notifications/notifications` | `innoboxrr.notifications.delete.all` | — | `{ success, count }` |
| POST | `/innoboxrr/notifications/notifications/{notificationId}/markAsRead` | `innoboxrr.notifications.mark.as.read` | — | `{ success, id, action, read_at }`. 404 con `{ success: false, message }` si no es del usuario |
| GET | `/notification/read/{notificationId}` | `read.noification` | — | Redirige a `data.action`, o a `/` si no tiene. Con JSON responde como la anterior |

- **`limit`** trae las N más recientes. Sin él se devuelven todas. La respuesta es siempre un arreglo, no un paginador, y un `limit` inválido responde 422.
- **Cada notificación** es la fila tal cual: `id`, `type`, `notifiable_type`, `notifiable_id`, `data`, `read_at`, `created_at`, `updated_at`.
- **Sin JSON**, `mark.all.as.read` y `delete.all` responden texto plano: `Notifications marked as read` y `Notifications deleted`.
- **`read.noification`** es para el enlace de un correo: una navegación normal que marca la notificación y lleva a su acción.

**Autenticación y CSRF.** Las rutas están pensadas para una SPA en el mismo dominio que usa la cookie de sesión:

1. La SPA pide `GET /sanctum/csrf-cookie` y recibe `XSRF-TOKEN`.
2. axios la devuelve en `X-XSRF-TOKEN` en cada POST o DELETE.
3. Sin esa cabecera, una escritura responde 419.

Un invitado que pide JSON recibe 401; sin JSON, Laravel lo redirige al login.

::: tip El nombre read.noification
La errata es histórica y se conserva porque las aplicaciones ya generan enlaces con ese nombre. Laravel no admite dos nombres para una misma ruta, así que no hay alias bien escrito.
:::

## Políticas y gates

No hay políticas ni habilidades. La única regla es que cada consulta sale de `$request->user()->notifications()`, así que nadie ve ni toca notificaciones ajenas.

## Puntos de extensión

Envía notificaciones con el canal `database`. La campana del administrador lee estas claves de `data`:

```php
public function via(object $notifiable): array
{
    return ['mail', 'database'];
}

public function toArray(object $notifiable): array
{
    return [
        'message' => 'Pedido nuevo',
        'action' => '/admin/orders/7', // a dónde lleva al abrirla
        'img' => $this->sender->avatar_url,
        'from_name' => $this->sender->name,
    ];
}
```

::: warning La acción empieza por /
Las interfaces de la aplicación base sólo navegan si `action` es una ruta interna que empieza por `/`, o una URL `http(s)://`. Una acción como `admin/orders/7`, sin barra, se marca como leída pero no lleva a ninguna parte. El enlace del correo (`read.noification`) sí la resuelve, porque redirige con Laravel.
:::

## En la aplicación base

- **Instalación.** `app:install` ejecuta `notifications:install` antes de `migrate`.
- **La campana del administrador**, en Vue y en React:
  - **Contador.** Pide `index.unread.count` al montar el administrador, cada 60 segundos y al volver a la pestaña. El intervalo es `notificationsInterval` en `resources/react/app/config.js`; en Vue está fijo en `stores/notifications.js`.
  - **Lista.** Al abrirla pide las últimas 10 con `index` y `limit=10`.
  - **Abrir una.** Llama a `mark.as.read` y navega a `action`: una ruta interna con el router, una URL absoluta con `location`.
  - **«Marcar todas».** Llama a `mark.all.as.read`.
- **Texto.** `data.message` (o `data.title`) se pinta como texto, nunca como HTML.
- **Lo que las interfaces no usan:** `index.unread`, `delete.all` y `read.noification`.

Ver [El administrador](/app-base/administrador).

## Actualizar

### De 2.0 a 2.1

- **Respuestas JSON cuando la petición las pide:**
  - marcar una responde `{ success, id, action, read_at }` en lugar de redirigir, y 404 en JSON si no es del usuario;
  - marcar todas y borrar todas responden `{ success, count }`.

  Sin JSON, el enlace del correo sigue redirigiendo y las masivas siguen respondiendo texto.
- **Añadidos:** `limit`, la ruta `index.unread.count` y el comando `notifications:install`. La configuración se carga y se publica con `--tag=config`.
- **`composer.json` requiere `laravel/framework ^13.0` y `laravel/sanctum ^4.3`** en lugar de `illuminate/support`.
- **Los proveedores heredan de `Illuminate\Support\ServiceProvider`.** Si tu aplicación extendía alguno, revisa sus métodos: se quitaron `map()`, `mapPolicies()` y la detección de observers por carpeta.
- **URIs, nombres de ruta y claves de configuración no cambian.**

## Problemas frecuentes

- **500 al abrir la campana en una aplicación nueva.** Falta la tabla: `php artisan notifications:install` y `php artisan migrate`.
- **419 al marcar como leída.** Falta la cookie CSRF o axios no envía `X-XSRF-TOKEN`.
- **Una notificación no aparece.** No se envió por `database`. Revisa `notification_via` de quien la envía: laravel-options y LaraPack avisan sólo por `mail` por omisión.
- **Al abrirla no navega.** `data.action` no empieza por `/` ni por `http`.
- **Esperabas un paginador.** `index` devuelve un arreglo; usa `limit`.
- **`make:notifications-table` falla porque la migración ya existe.** Usa `notifications:install`.
