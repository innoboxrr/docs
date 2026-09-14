# Todos los paquetes de Laravel

La aplicación base y el código que genera LaraPack se apoyan en doce paquetes de Composer del ecosistema. Esta página dice para qué sirve cada uno, qué versión está vigente, quién lo instala y si la aplicación base lo usa de verdad o sólo lo deja instalado. Cada paquete tiene su página con la configuración, las rutas y los problemas conocidos.

## De un vistazo

| Paquete | Versión | Para qué sirve | Quién lo instala | La aplicación base |
|---|---|---|---|---|
| [laravel-auth](/paquetes/laravel-auth) | 6.1.0 | Acceso en JSON bajo `/auth`: sesión, registro, contraseñas, verificación, tokens de Sanctum, login social y suplantación | `app:setup` | Sí: login, registro, recuperar contraseña, cambio de contraseña en el perfil, aviso de verificación y volver de una suplantación |
| [laravel-options](/paquetes/laravel-options) | 2.1.0 | Ajustes del negocio guardados en la base de datos, con lectura pública | `app:setup` | Sí: el sitio público y su editor leen y escriben las opciones `site_name`, `site_description` y `theme` |
| [laravel-notifications](/paquetes/laravel-notifications) | 2.1.0 | API HTTP sobre las notificaciones de base de datos de Laravel | `app:setup` | Sí: la campana del administrador |
| [laravel-uploads](/paquetes/laravel-uploads) | 2.1.1 | Modelo `Upload` y API para subir, mostrar y borrar archivos | `app:setup` | Sí: la foto del perfil |
| [laravel-audit](/paquetes/laravel-audit) | 2.1.1 | Registro explícito de cambios y de intentos de acceso, con una API de consulta | `app:setup` | **Instalado, sin interfaz.** Crea sus tablas y nada escribe en ellas |
| [laravel-env-editor](/paquetes/laravel-env-editor) | 2.1.1 | Interfaz y fachada para editar el `.env` y sus copias | `app:setup` | Sí: enlace «Entorno» del menú, sólo para administradores |
| [aws-file-manager](/paquetes/aws-file-manager) | 2.0.0 | Una carpeta privada en S3 por usuario, con API para navegarla | `app:setup` | **Instalado, sin interfaz.** Sus rutas existen y responden 503 hasta configurar S3 |
| [routes-to-json](/paquetes/routes-to-json) | 2.1.0 | `route:json`: exporta las rutas con nombre a un JSON que lee el front | `app:setup` | Sí: genera `resources/<ui>/routes.json`, del que salen todas las URLs del front |
| [locale-generator](/paquetes/locale-generator) | 2.1.0 | `locale:generate` y `locale:translate` para los `<idioma>.json` de Laravel | `app:setup` | Instalado; ningún paso de la instalación lo ejecuta |
| [support](/paquetes/support-traits-search#support) | 2.1.1 | `RequestFormater::flatten` y utilidades compartidas | `app:setup` y `larapack:new` | Sí, a través del usuario generado: aplana los datos del formulario antes de guardar metas |
| [traits](/paquetes/support-traits-search#traits) | 2.1.0 | `MetaOperations` (metas y `payload`) y otros traits | `app:setup` y `larapack:new` | Sí, a través del usuario generado: guarda la meta `avatar` |
| [search-surge](/paquetes/support-traits-search#search-surge) | 3.0.3 | Filtrado, orden y paginación de modelos Eloquent | `app:setup` y `larapack:new` | Sí: los listados del administrador y la carga de opciones |

«Quién lo instala» quiere decir quién lo escribe en `composer.json`. `app:setup` añade los doce a la aplicación (y `app:install` ejecuta `composer update`). `larapack:new` declara `support`, `traits` y `search-surge` en el paquete nuevo porque el código que genera LaraPack los usa. Ver [Instalar la aplicación base](/app-base/instalar).

::: tip Instalado no es lo mismo que usado
`laravel-audit` y `aws-file-manager` llegan con la aplicación base, pero ninguna pantalla los llama. `laravel-audit` deja sus tablas vacías hasta que tu código llame a `log()`. `aws-file-manager` registra rutas que cualquier usuario con sesión puede llamar en cuanto configures un bucket. Lee sus páginas antes de configurar S3.
:::

La aplicación base también instala paquetes de terceros que no se documentan aquí: `opcodesio/log-viewer` (el enlace «Registros» del menú, detrás de la habilidad `viewLogViewer` para administradores), `laravel/sanctum`, `maatwebsite/excel`, `league/flysystem-aws-s3-v3`, `algolia/scout-extended`, `google/recaptcha`, `staudenmeir/belongs-to-through` y `staudenmeir/eloquent-has-many-deep`.

## Qué pide cada uno

| Paquete | PHP | Laravel | Otras dependencias en `require` |
|---|---|---|---|
| laravel-auth | `^8.3` | `illuminate/support ^13.0` | `laravel/sanctum ^4.0`, `laravel/socialite ^5.16` |
| laravel-options | `^8.3` | `illuminate/support ^13.0` | `innoboxrr/search-surge ^3.0`, `innoboxrr/traits ^2.1`. Sugiere Sanctum y `maatwebsite/excel` |
| laravel-notifications | `^8.3` | `laravel/framework ^13.0` | `laravel/sanctum ^4.3` |
| laravel-uploads | `^8.3` | `illuminate/support ^13.0` | `innoboxrr/traits ^2.1`, `intervention/image ^3.11`, `intervention/image-laravel ^1.2` |
| laravel-audit | `^8.3` | `illuminate/support ^13.0` | `innoboxrr/search-surge ^3.0`, `innoboxrr/traits ^2.1`. Sugiere `maatwebsite/excel` |
| laravel-env-editor | `^8.3` | `laravel/framework ^13.0` | — |
| aws-file-manager | `^8.3` | `laravel/framework ^13.0` | `laravel/sanctum ^4.3`, `aws/aws-sdk-php ^3.316`, `league/flysystem-aws-s3-v3 ^3.28` |
| routes-to-json | `^8.3` | `illuminate/support ^13.0` | — |
| locale-generator | `^8.3` | `illuminate/support ^13.0` | `guzzlehttp/guzzle ^7.7` |
| support | `^8.3` | `illuminate/support ^13.0` | `giggsey/libphonenumber-for-php ^9.0` |
| traits | `^8.2` | `illuminate/* ^12.0 \|\| ^13.0` | — |
| search-surge | `^8.2` | `illuminate/* ^12.0\|^13.0` | — |

La línea base del ecosistema es PHP `^8.3` y Laravel `^13.0`. `traits` y `search-surge` admiten además PHP 8.2 y Laravel 12. `larapack:audit` lo marca como aviso, no como error: una restricción que admite la línea base y algo más no rompe nada, pero obliga a que la CI pruebe también lo de más. Ver [Versiones y compatibilidad](/ayuda/versiones).

## Cómo se apoyan unos en otros

**Tres paquetes son la base de los demás.** `traits`, `support` y `search-surge` no exponen rutas ni pantallas: los usa el código.

- El modelo que genera LaraPack usa `MetaOperations` de `traits` cuando declara `metas`.
- Su trait de `Storage` aplana el formulario con `RequestFormater::flatten` de `support` antes de guardar las metas.
- Sus `IndexRequest`, sus filtros y su exportación usan `search-surge`.
- `laravel-options` y `laravel-audit` requieren `traits` y `search-surge`; `laravel-uploads` requiere `traits`.

**Sanctum es el guard de todas las rutas con sesión.** `laravel-auth`, `laravel-notifications` y `aws-file-manager` lo declaran. `laravel-options` sólo lo sugiere. `laravel-uploads` y `laravel-audit` usan `auth:sanctum` sin declararlo. La aplicación que los instala tiene que tener Sanctum y llamar a `statefulApi()`, para que la SPA use la cookie de sesión. La aplicación base lo hace.

**Administrar lo decide `isAdmin()` en el modelo de usuario.** Ningún paquete define quién es administrador: todos preguntan al usuario si tiene el método `isAdmin()` y qué responde.

| Quién pregunta | Qué protege |
|---|---|
| La habilidad `laravel-auth.impersonate` | Suplantar a otro usuario |
| `OptionPolicy` | Escribir opciones |
| `UploadPolicy` | Borrar archivos ajenos y el borrado definitivo |
| Las políticas de `laravel-audit` | Toda su API |
| El middleware `admin` y la habilidad `viewLogViewer` | `/env-editor` y `/log-viewer` en la aplicación base |

En la aplicación base, `isAdmin()` compara el correo con `config('auth.admins')`, que sale de `ADMIN_EMAILS` en el `.env`. Sin ese método nadie administra y las escrituras responden 403. Ver [Acceso y usuarios](/app-base/acceso).

**`routes-to-json` une el backend con el front.** `php artisan route:json` escribe las rutas con nombre; el front las carga con `setRoutes()` y pide cada URL con `route('nombre')`, así que ninguna URL del backend se escribe a mano. Ver [Peticiones, rutas e idiomas](/interfaz/http-rutas-i18n).

## Lo que comparten las versiones de septiembre de 2026

Las versiones de esta tabla se publicaron para una aplicación Laravel 13 recién creada y corrigen los mismos tres problemas en todos los paquetes. Si vienes de una versión anterior, esto es lo que cambia en tu aplicación:

- **Los proveedores heredan de `Illuminate\Support\ServiceProvider`.** Heredar del `RouteServiceProvider` o del `EventServiceProvider` de Foundation hacía que la aplicación registrara sus propias rutas otra vez por cada paquete y enviara el correo de verificación repetido.
- **Ningún proveedor lee la caché al arrancar.** Con `CACHE_STORE=database`, el valor por defecto de Laravel, `php artisan migrate` fallaba en una aplicación nueva porque la tabla `cache` todavía no existía.
- **Las rutas de los paquetes respetan `route:cache`.** Con las rutas cacheadas no se vuelven a registrar.

::: warning El tag `config` es genérico
Once de estos paquetes publican su configuración con el tag `config`. `php artisan vendor:publish --tag=config` sin `--provider` copia la configuración de **todos** ellos a la vez. Pasa siempre el proveedor, como se indica en cada página. `search-surge` usa `search-surge-config`, y `laravel-auth` y `laravel-audit` tienen además un tag propio.
:::
