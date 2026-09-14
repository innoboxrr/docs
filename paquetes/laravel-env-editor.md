# laravel-env-editor

`innoboxrr/laravel-env-editor` **2.1.1** permite editar el `.env` de la aplicación sin entrar al servidor: añadir, cambiar y borrar claves, subir otro `.env` y crear o restaurar copias. Se hace desde una interfaz web o desde la fachada `EnvEditor`, sin romper la estructura del archivo.

::: warning Quien llega aquí controla la aplicación
El editor lee y reescribe el `.env` entero, con `APP_KEY` y todas las credenciales. Actívalo sólo detrás de una comprobación de administrador.
:::

## Instalar

```bash
composer require innoboxrr/laravel-env-editor
php artisan vendor:publish --provider="Innoboxrr\EnvEditor\ServiceProvider" --tag=config
```

Requiere PHP `^8.3` y `laravel/framework ^13.0`. El proveedor y el alias `EnvEditor` se descubren solos. La interfaz nace **apagada**: actívala en `config/env-editor.php`.

## Configuración

`config/env-editor.php`:

| Clave | Por omisión | Qué decide |
|---|---|---|
| `paths.backupDirectory` | `storage_path('env-editor')` | Dónde se guardan las copias del `.env` |
| `route.enable` | `false` | Registrar las rutas de la interfaz |
| `route.prefix` | `env-editor` | Prefijo de las URIs |
| `route.name` | `env-editor` | Prefijo de los nombres |
| `route.middleware` | `['web', 'auth']` | Middleware del grupo. `auth` es el mínimo: añade tu comprobación de administrador |
| `route.gate` | `null` | Habilidad que se exige en cada acción, además del middleware |
| `timeFormat` | `d/m/Y H:i:s` | Formato de fechas en la interfaz y en las copias |
| `layout` | `env-editor::layout` | La vista que extiende `index.blade.php` |

```php
'route' => [
    'enable' => true,
    'middleware' => ['web', 'auth', 'admin'],
    'gate' => 'manage-env',
],
```

## Variables de entorno

El paquete no lee variables de entorno.

::: tip ENV_EDITOR_ENABLED es de la aplicación base
`ENV_EDITOR_ENABLED` no existe en el paquete ni en su README. La define el `config/env-editor.php` que copia laravel-setup, como `'enable' => env('ENV_EDITOR_ENABLED', true)`.
:::

## Publicar

Los tres tags son genéricos: pasa siempre `--provider="Innoboxrr\EnvEditor\ServiceProvider"`.

| Tag | Qué copia |
|---|---|
| `config` | `config/env-editor.php` |
| `views` | `resources/views/vendor/env-editor` |
| `translations` | `resources/lang/vendor/env-editor` |

## Migraciones

No trae migraciones.

## Comandos

No registra comandos. Guardar el `.env` programa el job `OptimizeApplication` (`php artisan optimize`) un minuto después, **sólo si la configuración está cacheada**. Sin caché, los valores nuevos se leen en la siguiente petición.

## Rutas HTTP

Sólo existen con `route.enable` en `true`. Van bajo `/env-editor`, con el middleware de `route.middleware` y nombres `env-editor.*`.

| Método | URI | Nombre | Campos | Respuesta |
|---|---|---|---|---|
| GET | `/env-editor` | `env-editor.index` | — | La interfaz, o `{ items, success }` con JSON |
| POST | `/env-editor/key` | `env-editor.key` | `key`, `value`, y opcionalmente `index` o `group` para colocarla | `{ message, success }` |
| PATCH | `/env-editor/key` | — | `key`, `value` | `{ message, success }` |
| DELETE | `/env-editor/key` | — | `key` | `{ message, success }` |
| DELETE | `/env-editor/clear-cache` | `env-editor.clearConfigCache` | — | Ejecuta `config:clear`; `{ message, success }` |
| GET | `/env-editor/files` | `env-editor.getBackups` | — | La interfaz, o `{ items, success }` con JSON |
| POST | `/env-editor/files/create-backup` | `env-editor.createBackup` | — | `{ message, success }` |
| POST | `/env-editor/files/restore-backup/{filename?}` | `env-editor.restoreBackup` | — | `{ message, success }` |
| DELETE | `/env-editor/files/destroy-backup/{filename?}` | `env-editor.destroyBackup` | — | `{ message, success }` |
| GET | `/env-editor/files/download/{filename?}` | `env-editor.download` | — | Descarga la copia, o el `.env` actual sin nombre |
| POST | `/env-editor/files/upload` | `env-editor.upload` | `file` (texto), `replace_current` (booleano) | Lo guarda como copia, o sustituye el `.env` |

- **Errores.** Las respuestas son 200 con `success: true`, o 400 con `success: false`. Un error del editor en una petición JSON llega como 400 con `{ message, success: false }`.
- **Nombres de copia.** Uno que sale del directorio de copias se rechaza, y sin nombre `restore-backup` y `destroy-backup` responden 400.
- **Sin nombre.** Las rutas `PATCH` y `DELETE` de `key` no tienen nombre, así que no aparecen en `routes.json`.

## Políticas y gates

No define políticas. Con `route.gate`, el controlador exige `can:<habilidad>` en cada acción, después del middleware: un invitado recibe 401 (o la redirección al login) y un usuario sin la habilidad, 403.

```php
// App\Providers\AppServiceProvider::boot()
Gate::define('manage-env', fn (User $user): bool => $user->isAdmin());
```

## Puntos de extensión

La fachada `Innoboxrr\EnvEditor\Facades\EnvEditor`:

```php
EnvEditor::getEnvFileContent($fileName = '');   // Collection; con nombre, lee esa copia
EnvEditor::keyExists($key);
EnvEditor::getKey($key, $default = null);
EnvEditor::addKey($key, $value, ['index' => 3]); // o ['group' => 'MAIL']
EnvEditor::editKey($key, $value);
EnvEditor::deleteKey($key);
EnvEditor::getAllBackUps();                      // Collection con fecha y contenido
EnvEditor::upload($uploadedFile, $replaceCurrentEnv);
EnvEditor::backUpCurrent();
EnvEditor::getFilePath($fileName = '');          // sin nombre, la ruta del .env
EnvEditor::deleteBackup($fileName);
EnvEditor::restoreBackUp($fileName);
```

Para cambiar el aspecto, publica `views` o apunta `layout` a tu propia vista.

## En la aplicación base

- **Configuración.** `app:setup` copia su propio `config/env-editor.php`:

  ```php
  'route' => [
      'enable' => env('ENV_EDITOR_ENABLED', true),
      'prefix' => 'env-editor',
      'name' => 'env-editor',
      'middleware' => ['web', 'auth', 'admin'],
      'gate' => null,
  ],
  ```

  El alias `admin` es `EnsureUserIsAdmin`, que exige `isAdmin()`, y en el usuario generado eso quiere decir estar en `ADMIN_EMAILS`.
- **Invitados.** `bootstrap/app.php` los redirige a `/auth/login`, así que no aparece el error «Route [login] not defined».
- **Menú.** El grupo «Administración» enlaza a `/env-editor` como «Entorno» (`t('Environment')`), en otra pestaña.
  - En Vue el enlace está fijo en `resources/vue/app/router/menu.js`.
  - En React está en `adminTools` de `resources/react/app/config.js`.

Para apagarlo en producción, pon `ENV_EDITOR_ENABLED=false` y quita el enlace del menú: el enlace no mira esa variable y llevaría a una página inexistente.

Ver [El administrador](/app-base/administrador).

## Actualizar

### De 2.0 a 2.1

- **`route.middleware` pasa de `['web']` a `['web', 'auth']`.** Una configuración publicada antes conserva `['web']`: añade `auth` y tu comprobación de administrador a mano.
- **Opción nueva `route.gate`**, `null` por omisión.
- **Seguridad de las copias.** Los nombres de copia con `..` se rechazan, y `restore-backup` y `destroy-backup` sin nombre responden 400 en lugar de 500.
- **Los errores del editor llegan como JSON.**
- **`optimize` sólo se programa** si la configuración está cacheada.
- **Recursos de la interfaz.** Carga Font Awesome Free 5.15.4 y la build de producción de Vue 2.7.16.

URIs, nombres de ruta, el resto de claves, los tags y la fachada no cambian.

### De 2.1.0 a 2.1.1

Font Awesome y Vue se cargan con `integrity`, como Bootstrap y jQuery.

## Problemas frecuentes

- **Cualquier usuario con sesión entra.** Falta tu comprobación de administrador en `route.middleware`, o la configuración publicada es anterior a la 2.1.0 y sólo tiene `['web']`.
- **«Route [login] not defined».** Un invitado llegó a una aplicación sin ruta `login`. Define `redirectGuestsTo()` en `bootstrap/app.php`.
- **Guardé un valor y la aplicación sigue con el anterior.** La configuración está cacheada y `optimize` todavía no corrió: espera el job o usa «clear cache».
- **No se puede guardar.** El usuario del servidor web no puede escribir el `.env` o `storage/env-editor`.
- **La interfaz sale sin estilos.** Carga Bootstrap, jQuery, Font Awesome y Vue desde CDN, y el navegador no llega a ellos o una CSP los bloquea.
- **Las copias guardan secretos.** `storage/env-editor` contiene copias completas del `.env`: no lo expongas ni lo subas al repositorio.
