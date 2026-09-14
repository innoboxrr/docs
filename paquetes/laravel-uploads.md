# laravel-uploads

`innoboxrr/laravel-uploads` **2.1.1** da a las subidas de archivos su propio modelo (`Upload`), con borrado suave y una API pequeña para subir, mostrar, borrar y restaurar. Con los archivos repartidos por una docena de tablas es fácil perder la pista de lo que hay en el disco. Con un modelo propio queda registrado qué subió cada usuario y a qué registro pertenece.

Los archivos se identifican por UUID y no por id secuencial: la URL de un archivo no revela cuántos hay ni deja recorrerlos.

## Instalar

```bash
composer require innoboxrr/laravel-uploads
php artisan migrate
```

Requiere PHP `^8.3`, `illuminate/support ^13.0`, `innoboxrr/traits ^2.1`, `intervention/image ^3.11` e `intervention/image-laravel ^1.2`. De la aplicación espera:

- **Sanctum.** Todas las rutas salvo `display` usan `auth:sanctum`, aunque el paquete no lo declara en `require`.
- **Una tabla `users`.** `uploads.user_id` es una clave foránea hacia ella.
- **`isAdmin()` en el usuario** (opcional). Quien responde `true` administra cualquier archivo.
- **GD o Imagick** (opcional). Sin ninguna de las dos, las imágenes se suben sin comprimir.

## Configuración

`config/laravel-uploads.php`:

| Clave | Por omisión | Qué decide |
|---|---|---|
| `disk` | `env('LARAVEL_UPLOADS_DISK', 's3')` | Disco donde se guardan los archivos |
| `max_size` | `env('LARAVEL_UPLOADS_MAX_SIZE', 10240)` | Tamaño máximo en kilobytes |
| `allowed_mimes` | `jpg`, `jpeg`, `png`, `gif`, `webp`, `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `odt`, `ods`, `csv`, `txt` | Extensiones para la regla `mimes`, que las deduce del contenido. Una lista vacía no restringe el tipo |
| `compress_images` | `true` | Reducir JPEG, PNG y GIF antes de guardarlos |
| `compress_images_quality` | `60` | Calidad de la compresión |
| `compress_images_max_width` | `1024` | Ancho máximo, en píxeles |
| `production_dir` | `files` | Directorio dentro del disco cuando `APP_ENV` es `production` |
| `development_dir` | `test` | Directorio en cualquier otro entorno |
| `user_class`, `excel_view`, `notification_via`, `export_disk` | — | No las usa el paquete |

SVG no está en la lista a propósito: se sirve inline y puede ejecutar scripts.

## Variables de entorno

| Variable | Por omisión | Uso |
|---|---|---|
| `LARAVEL_UPLOADS_DISK` | `s3` | `disk`. Una aplicación sin S3 usa `public` o `local` |
| `LARAVEL_UPLOADS_MAX_SIZE` | `10240` | `max_size`, en KB |
| `APP_ENV` | — | Elige entre `production_dir` y `development_dir` |

## Publicar

| Tag | Qué copia |
|---|---|
| `config` | `config/laravel-uploads.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\LaravelUploads\Providers\AppServiceProvider" --tag=config
```

::: warning Pasa el proveedor
El README del paquete indica `vendor:publish --tag=config` sin `--provider`. Así se publica la configuración de todos los paquetes que usan el tag `config`.
:::

## Migraciones

Se cargan solas desde el paquete.

| Migración | Qué hace |
|---|---|
| `create_uploads_table` | `id`, `uuid`, `filename`, `mime_type`, `extension`, `size` (bytes, como texto), `path`, `disk`, `visibility` (por omisión `public`), `uploadable_type` y `uploadable_id` (nullable), `user_id` (FK a `users`, borrado en cascada), fechas y `deleted_at` |
| `add_upload_uuid_indices_table` | Índice `idx_uploads_uuid` sobre `uuid` |

## Comandos

No registra comandos.

## Rutas HTTP

En el grupo `api`, con prefijo `/lu/upload` y nombres `lu.upload.*`. El controlador exige `auth:sanctum` en todas salvo `display`.

| Método | URI | Nombre | Campos | Respuesta |
|---|---|---|---|---|
| POST | `/lu/upload/file` | `lu.upload.file` | Multipart: `file` (obligatorio, `max_size`, `allowed_mimes`), `visibility` (`public` o `private`; por omisión `public`), `uploadable_type`, `uploadable_id` | 201 con el `Upload`. 422 si la validación falla |
| GET | `/lu/upload/{upload_uuid}/display/{filename?}` | `lu.upload.display` | — | El archivo en streaming, `inline`. Público. 404 si el registro o el archivo no existen |
| DELETE | `/lu/upload/delete` | `lu.upload.delete` | `upload_id` | Borrado suave; el `Upload` |
| POST | `/lu/upload/restore` | `lu.upload.restore` | `upload_id` | El `Upload` |
| DELETE | `/lu/upload/force-delete` | `lu.upload.force.delete` | `upload_id` | Borra el registro **y el archivo del disco** |

La respuesta de una subida:

```json
{
  "id": 1,
  "uuid": "9b1d...",
  "filename": "avatar.png",
  "mime_type": "image/png",
  "extension": "png",
  "size": 48213,
  "path": "files/Hk3...png",
  "disk": "public",
  "visibility": "public",
  "uploadable_type": null,
  "uploadable_id": null,
  "user_id": 7,
  "url": "https://app.test/lu/upload/9b1d.../display/avatar.png",
  "uri": "/lu/upload/9b1d.../display/avatar.png",
  "actions": [ ... ]
}
```

Sin `JsonResource::withoutWrapping()` el mismo objeto llega dentro de `data`. `url` es absoluta y `uri` relativa. `actions` trae tres acciones (ver, editar, eliminar) heredadas de la interfaz antigua.

**Cómo se sirve un archivo.** `display` funciona con los discos `s3`, `public` y `local`:

- **Lectura.** Lee del disco con `readStream`, así que no necesita que el archivo sea público en el disco.
- **Cabeceras.** Envía `Content-Type`, `Content-Length`, `Cache-Control: public, max-age=2628000` y `Content-Disposition: inline`.
- **Caché.** Guarda el disco y la ruta 60 segundos en la clave `laravel-uploads.display.{uuid}`, y la limpia al borrar o restaurar.
- **Nombre.** El nombre de archivo de la URL es decorativo y opcional.

**Visibilidad.** `visibility` se aplica al objeto en el disco, pero `display` no la comprueba: quien tenga el UUID descarga el archivo.

## Políticas y gates

`UploadPolicy` se registra con `Gate::policy()` y tipa `Illuminate\Contracts\Auth\Authenticatable`, nunca una clase de usuario concreta.

| Habilidad | Quién |
|---|---|
| `upload` | Cualquier usuario autenticado |
| `display` | Cualquiera (la ruta no la consulta) |
| `delete`, `restore` | Quien subió el archivo, o un administrador |
| `forceDelete` | Sólo un administrador |

Administrador quiere decir que el usuario tiene `isAdmin()` y responde `true`. Sin ese método nadie administra y la respuesta es 403.

## Puntos de extensión

Asocia subidas a tus modelos con los traits del paquete y envía `uploadable_type` (la clase) y `uploadable_id` al subir:

```php
use Innoboxrr\LaravelUploads\Support\Traits\HasUploads; // morphMany: $model->uploads
use Innoboxrr\LaravelUploads\Support\Traits\HasUpload;  // morphOne:  $model->upload

class Invoice extends Model
{
    use HasUploads;
}

$invoice->uploads; // las subidas enviadas con uploadable_type/uploadable_id de esta factura
```

En un modelo que genera LaraPack, añade el trait en su trait de `Relations`, que es un punto de extensión y no se regenera. Ver [Qué se genera y dónde va tu código](/larapack/que-se-genera).

::: warning uploadable_type no se valida contra tus modelos
La subida acepta cualquier texto en `uploadable_type` y cualquier id en `uploadable_id`. Un usuario autenticado puede asociar un archivo a cualquier registro. Si eso importa, comprueba la pertenencia en tu código antes de confiar en `$model->uploads`.
:::

## En la aplicación base

- **Instalación.**
  - `app:setup` añade `LARAVEL_UPLOADS_DISK=public` al `.env`, porque una aplicación nueva no tiene S3.
  - `app:install` migra y ejecuta `storage:link`.
- **Foto del perfil**, en `/admin/profile`:
  1. Sube la imagen a `lu.upload.file` con `file` y `visibility=public`.
  2. Guarda el `uri` relativo de la respuesta (o la `url` si falta) como la meta `avatar` del usuario, con `api.app.user.update`. Se guarda el `uri` y no la `url` porque sigue valiendo si cambia el dominio.
- **Quitar la foto** envía `avatar: ''`, que borra la meta.
- **Archivos huérfanos.** Ni cambiar ni quitar la foto borra la subida anterior, así que esas filas y sus archivos se quedan en el disco.

Ver [Acceso y usuarios](/app-base/acceso).

## Actualizar

### De 2.0 a 2.1

- **La subida se valida** y responde 422 en lugar de 500. `file` es obligatorio, con tamaño máximo y tipos permitidos, y `visibility` sólo acepta `public` o `private`.
- **`UploadPolicy` cambia.** Borrar y restaurar, sólo el dueño o un administrador; borrar definitivamente, sólo un administrador. Antes cualquier usuario autenticado borraba lo de cualquiera.
- **`force-delete`** ya no responde siempre 403 y ahora borra también el archivo del disco.
- **El archivo se guarda con la visibilidad pedida.** Antes quedaba siempre `public`.
- **Claves nuevas:** `max_size` y `allowed_mimes`. `disk` se lee de `LARAVEL_UPLOADS_DISK` y sigue siendo `s3` por omisión.
- **`innoboxrr/traits` e `intervention/image`** pasan a `require`.

### De 2.1.0 a 2.1.1

Arreglos de los proveedores: la aplicación ya no registra sus rutas dos veces, el correo de verificación ya no sale repetido y `UploadPolicy` se registra de verdad. URIs, nombres, middleware y respuestas no cambian.

## Problemas frecuentes

- **Toda subida falla en una aplicación nueva.** El disco por omisión es `s3`. Pon `LARAVEL_UPLOADS_DISK=public` o `local`.
- **422 con un archivo que parece válido.** Es SVG, supera `max_size`, o supera los límites de PHP (`upload_max_filesize`, `post_max_size`): un archivo que PHP rechaza llega inválido.
- **Un archivo `private` se descarga igual.** `display` no comprueba la visibilidad.
- **`delete` sin `upload_id` responde 404, no 422.** La subida se busca antes de validar.
- **`url` apunta a otro dominio.** Se construye con el host de la petición; guarda `uri`.
- **En staging los archivos van a `test/`.** `development_dir` se usa en todo entorno que no sea `production`.
- **Las imágenes no se comprimen.** Falta GD o Imagick, o `compress_images` es `false`.
