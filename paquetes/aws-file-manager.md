# aws-file-manager

`innoboxrr/aws-file-manager` **2.0.0** da a cada usuario autenticado una carpeta privada en un bucket de S3, con una API JSON para navegarla, subir archivos, crear carpetas, borrar archivos y cambiar su visibilidad. No tiene fachada: se usa por HTTP, o con `S3Service` desde el contenedor.

::: warning En la aplicación base está instalado y no tiene interfaz
El README del paquete dice que es el backend del gestor de archivos del administrador que instala laravel-setup. **Ese gestor no existe:** ninguna pantalla de Vue ni de React llama a sus rutas y el menú no lo enlaza. Aun así, las rutas se registran y aparecen en `routes.json`. Lee [En la aplicación base](#en-la-aplicacion-base) antes de configurar S3.
:::

## Instalar

```bash
composer require innoboxrr/aws-file-manager
```

Requiere PHP `^8.3`, `laravel/framework ^13.0`, `laravel/sanctum ^4.3`, `aws/aws-sdk-php ^3.316` y `league/flysystem-aws-s3-v3 ^3.28`, además de un bucket de S3. Los proveedores se descubren solos.

## Configuración

La configuración se carga sin publicarla, en `aws-file-manager`.

| Clave | Variable | Por omisión | Qué decide |
|---|---|---|---|
| `root` | — | `file-manager` | Prefijo que contiene una carpeta por usuario |
| `bucket` | `AWS_BUCKET` | — | Obligatoria |
| `region` | `AWS_DEFAULT_REGION` | — | Obligatoria |
| `url` | `AWS_URL` | — | Base del campo `source` del índice |
| `credentials.key` | `AWS_ACCESS_KEY_ID` | — | Opcional: vacía, usa la cadena de credenciales del SDK (entorno, perfil, rol de la instancia) |
| `credentials.secret` | `AWS_SECRET_ACCESS_KEY` | — | Igual que la anterior |
| `use_acl` | `AWS_FILE_MANAGER_USE_ACL` | `false` | Si la visibilidad se maneja con ACL de objeto |

Hasta que existan `AWS_BUCKET` y `AWS_DEFAULT_REGION`, todas las rutas responden **503** con `{"message": "The file manager is not configured. Set AWS_BUCKET and AWS_DEFAULT_REGION."}`.

### ACL y visibilidad

Los buckets creados desde abril de 2023 traen los ACL desactivados (Object Ownership: *Bucket owner enforced*) y rechazan cualquier petición que lleve un `ACL`, incluso `private`. Por eso `use_acl` está apagado por omisión.

| | `use_acl = false` (buckets nuevos) | `use_acl = true` (buckets con ACL) |
|---|---|---|
| Subir | Sin ACL: el archivo queda privado. Pedir `public` responde 422 antes de subir nada | Con `private` o `public-read` |
| Cambiar visibilidad | 422, explicando que los ACL están desactivados | Cambia el ACL del objeto |
| `information.visibility` en el índice | Siempre `private`: lo público lo decide la política del bucket | Se lee del ACL |

Con los ACL desactivados, los archivos se hacen públicos con una política del bucket o con CloudFront. Si `use_acl` está encendido y el bucket rechaza los ACL, responde 422 diciéndolo en lugar de un error de AWS. Los dos endpoints aceptan `private`, `public` y `public-read`; `public` y `public-read` significan lo mismo.

## Variables de entorno

```dotenv
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=mi-bucket
AWS_URL=https://mi-bucket.s3.amazonaws.com
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_FILE_MANAGER_USE_ACL=false
```

Son las mismas variables que usa el disco `s3` de Laravel: configurar S3 para otra cosa activa también este paquete.

## Publicar

| Tag | Qué copia |
|---|---|
| `config` | `config/aws-file-manager.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\AwsFileManager\Providers\AppServiceProvider" --tag=config
```

## Migraciones

No trae migraciones: los archivos viven en S3.

## Comandos

No registra comandos.

## Rutas HTTP

En el grupo `web` (sesión y CSRF) y con `auth:sanctum` en el controlador. Un POST sin `X-XSRF-TOKEN` responde 419; un invitado que pide JSON, 401.

| Método | URI | Nombre | Campos | Respuesta |
|---|---|---|---|---|
| GET | `/afm/file_manager/index` | `afm.file_manager.index` | `directory` (opcional) | `{ files: [...], currentFile }` |
| POST | `/afm/file_manager/upload` | `afm.file_manager.upload` | `files[]` (obligatorio), `directory`, `visibility` | `[{ message, file }]`, uno por archivo |
| POST | `/afm/file_manager/create-directory` | `afm.file_manager.create-directory` | `directory` (obligatorio) | `{ message, directory }`. 400 si ya existe |
| POST | `/afm/file/delete` | `afm.file.delete` | `file` (obligatorio) | `{ message }` |
| POST | `/afm/file/change-visibility` | `afm.file.change-visibility` | `file`, `visibility` (obligatorios) | `{ message }`. 404 si el archivo no existe; 422 con los ACL apagados |

Los errores de validación responden 422 con `message` y `errors`.

**La carpeta de cada usuario.** Cada usuario trabaja dentro de `file-manager/{id}/` y no alcanza nada más:

- **`directory`** (índice, subida, crear carpeta) es relativo a su carpeta: `docs` es `file-manager/1/docs/`.
- **`file`** (borrar, cambiar visibilidad) puede ser la clave completa, como la devuelven la subida (`file`) y el índice (`key`), o una ruta relativa a su carpeta.
- **Lo que queda fuera** responde 403 con `{"message": "Access to this path is denied."}`: la clave de otro usuario, `file-manager/10/...` para el usuario 1, y cualquier ruta con segmentos `..`.

**El índice.**

- **Carpeta.** Crea la carpeta pedida si no existe.
- **Orden.** Pone primero las carpetas y después los archivos. `currentFile` es el primer archivo, marcado con `"current": true`.
- **Cada archivo** trae `name`, `key`, `size` (texto legible), `source` (`AWS_URL` + clave), `signedUrl` (válida 20 minutos), `url` e `information` (`type`, `created_at`, `updated_at`, `visibility`).
- **La subida** guarda el `Content-Type` del archivo, para que el navegador muestre imágenes y PDF en lugar de descargarlos.

## Políticas y gates

No hay políticas ni habilidades. La única barrera es la carpeta del usuario: **cualquier usuario con sesión** puede usar las cinco rutas sobre la suya.

## Puntos de extensión

`S3Service` se registra como singleton y se puede sustituir:

```php
use Innoboxrr\AwsFileManager\Services\S3Service;

$s3 = app(S3Service::class);
$bucket = config('aws-file-manager.bucket');

$s3->putObject($bucket, 'file-manager/1/report.pdf', fopen($path, 'r'), 'private', 'application/pdf');
$url = $s3->getSignedUrl($bucket, 'file-manager/1/report.pdf');
$s3->deleteObject($bucket, 'file-manager/1/report.pdf');

// Tu propio cliente, por ejemplo en un proveedor de la aplicación:
$this->app->instance(S3Service::class, new S3Service($s3Client));
```

También expone `listObjects`, `getObjectMetadata`, `getObjectAcl`, `putObjectAcl`, `directoryExists`, `createDirectory`, `userRoot`, `userFileKey`, `validateUserPath`, `usesAcl` y `getObjectUrl`.

## En la aplicación base

- **Instalación.** `app:setup` pide `innoboxrr/aws-file-manager ^2.0` y `league/flysystem-aws-s3-v3 ^3.0`, pero no escribe ninguna variable `AWS_*` ni enlaza el gestor en el menú.
- **Sin configurar.** Mientras no configures S3, las rutas `afm.*` responden 503 a quien las llame.
- **Configurado.** En cuanto pongas `AWS_BUCKET` y `AWS_DEFAULT_REGION`, aunque sea para otra cosa como guardar las subidas de laravel-uploads en S3, cualquier usuario registrado puede crear carpetas y subir archivos a tu bucket por esta API.

::: warning Las subidas no tienen límite de tipo ni de tamaño
`upload` sólo valida que cada elemento de `files[]` sea un archivo. No hay lista de tipos ni tamaño máximo más allá de los límites de PHP. Si configuras S3 en la aplicación base y no vas a usar el gestor, restringe estas rutas (por ejemplo, exigiendo administrador) o quita el paquete de `composer.json`.
:::

## Actualizar

### De 1.x a 2.0

- **ACL.** Si tu bucket admite ACL de objeto y quieres seguir subiendo archivos públicos o cambiando su visibilidad, pon `AWS_FILE_MANAGER_USE_ACL=true`. Sin esa variable, las subidas quedan privadas y pedir `public` o cambiar la visibilidad responde 422.
- **Carpeta del usuario.** Borrar y cambiar la visibilidad ya no alcanzan claves fuera de `file-manager/{id}/`: responden 403.
- **Añadidos:** `key` en cada entrada del índice, rutas relativas en borrar y cambiar visibilidad, `S3Service::deleteObject()` y el 503 cuando faltan bucket o región.
- **Otros cambios:**
  - sin llaves se usa la cadena de credenciales del SDK;
  - cambiar la visibilidad de un archivo inexistente responde 404;
  - `composer.json` requiere `laravel/framework ^13.0` y `laravel/sanctum ^4.3`.
- **Corregido:** borrar respondía siempre 500, y en un bucket nuevo no se podía subir nada.

## Problemas frecuentes

- **Todo responde 503.** Faltan `AWS_BUCKET` o `AWS_DEFAULT_REGION`, o la configuración está cacheada: `php artisan config:clear`.
- **422 al subir como público o al cambiar la visibilidad.** Los ACL están apagados (`use_acl=false`), o el bucket los rechaza.
- **403 al borrar.** La clave no está en la carpeta del usuario, o lleva `..`.
- **Subir un archivo con el mismo nombre lo sustituye.** La clave es la carpeta más el nombre original, sin aviso.
- **`source` sale sin dominio.** Falta `AWS_URL`.
- **`signedUrl` deja de funcionar.** Caduca a los 20 minutos: vuelve a pedir el índice.
- **419 en un POST.** Las rutas están en el grupo `web` y necesitan el token CSRF.
