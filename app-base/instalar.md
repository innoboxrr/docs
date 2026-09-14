# Instalar la aplicación base

La instalación va en dos comandos a propósito. `app:setup` **escribe** archivos y no instala nada, así que puedes revisar con `git diff` lo que cambió. `app:install` **instala**: dependencias, tablas, sitio de ejemplo e interfaz compilada. `app:init` hace las dos cosas seguidas.

## Requisitos

- PHP 8.3 o superior y Composer.
- Node 20 o superior y npm 10.
- Una aplicación Laravel 13 **recién creada** con `laravel new` o `composer create-project laravel/laravel`, con su base de datos configurada en `.env`.

::: warning `APP_URL` tiene que ser la dirección con la que abres la aplicación
Incluye el puerto. El administrador llama a la API con la cookie de sesión, y Sanctum sólo la acepta desde los dominios de `SANCTUM_STATEFUL_DOMAINS`: por omisión `localhost`, `127.0.0.1:8000` y el host de `APP_URL`. Con otra dirección, el login funciona pero cada tabla del administrador responde 401 y te devuelve al login.
:::

## En resumen

::: code-group

```bash [Vue]
composer create-project laravel/laravel mi-app
cd mi-app
# Configura la base de datos y APP_URL en .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup
git status && git diff

# Pon tu correo en ADMIN_EMAILS, en .env
php artisan app:install
composer run dev
```

```bash [React]
composer create-project laravel/laravel mi-app
cd mi-app
# Configura la base de datos y APP_URL en .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup --react
git status && git diff

# Pon tu correo en ADMIN_EMAILS, en .env
php artisan app:install
composer run dev
```

:::

Regístrate en `/auth/register` con un correo de `ADMIN_EMAILS` y entra en `/admin`.

## `app:setup`

```bash
php artisan app:setup [--react] [--force]
```

| Opción | Qué hace |
|---|---|
| `--react` | Monta la interfaz en React. Sin ella, Vue. |
| `--force` | Configura aunque la aplicación no parezca recién creada. |

### Cuándo se niega

`app:setup` sustituye archivos que una aplicación en uso ya habrá cambiado, así que sólo corre si la aplicación parece nueva. Lo es cuando se cumplen las cuatro condiciones:

- existe `resources/views/welcome.blade.php`;
- no existe `laraimport.json` en la raíz;
- no existe `resources/vue/app`;
- no existe `resources/react/app`.

Si no, termina con error: «La aplicación ya no parece recién creada…».

### Las siete tareas

Corren en este orden. Cada una aparece como una línea de progreso.

#### 1. Dependencias de Composer

Edita `composer.json`, sin instalar nada:

- Quita `lab404/laravel-impersonate` de `require` y de `require-dev`.
- Añade o sube en `require` la lista de [Qué trae](/app-base/): laravel-auth `^6.1.0`, laravel-options, laravel-notifications, laravel-uploads, laravel-env-editor, laravel-audit, aws-file-manager, locale-generator, routes-to-json, search-surge, support, traits, `laravel/sanctum ^4.3`, `maatwebsite/excel ^4.0`, `opcodesio/log-viewer ^3.24`, `league/flysystem-aws-s3-v3 ^3.0`, `algolia/scout-extended ^5.0`, `google/recaptcha ^1.3` y los dos paquetes de staudenmeir.
- Añade en `require-dev` `innoboxrr/larapack-generator ^7.10.2`.

Una dependencia que ya estaba con otra versión se reemplaza, y si estaba en la otra sección se mueve. Las secciones se ordenan como con `sort-packages`: `php` primero, luego las `ext-*`, luego por nombre. El archivo se reescribe con sangría de cuatro espacios.

#### 2. Variables de entorno

Edita `.env.example` y `.env`, cada uno si existe. Hay dos grupos:

| Clave | Valor | Cuándo |
|---|---|---|
| `APP_LOCALE` | `es` | **Siempre**, aunque ya tuviera otro valor |
| `APP_FALLBACK_LOCALE` | `en` | **Siempre** |
| `APP_FAKER_LOCALE` | `es_MX` | **Siempre** |
| `SESSION_DRIVER` | `database` | **Siempre** |
| `ADMIN_EMAILS` | vacío | Sólo si falta |
| `LARAVEL_UPLOADS_DISK` | `public` | Sólo si falta |
| `LARAVEL_OPTIONS_EXPORT_DISK` | `local` | Sólo si falta |
| `LARAVEL_AUDIT_EXPORT_DISK` | `local` | Sólo si falta |
| `VITE_APP_NAME` | `${APP_NAME}` | Sólo si falta |
| `VITE_GOOGLE_LOGIN` | `false` | Sólo si falta |
| `VITE_FACEBOOK_LOGIN` | `false` | Sólo si falta |
| `VITE_MICROSOFT_LOGIN` | `false` | Sólo si falta |

Un valor con espacios, `#` o comillas se escribe entre comillas dobles, y una referencia como `${APP_NAME}` se deja tal cual.

::: warning Las variables `VITE_*` no las lee nadie
Ninguna de las dos interfaces lee variables `VITE_*`. Las tres de login social se escriben, pero **el login social no está conectado en las interfaces**: no hay botones ni pantallas. Ver [Acceso y usuarios](/app-base/acceso).
:::

#### 3. Administradores en `config/auth.php`

Añade al final del arreglo la clave que lee `isAdmin()` en el usuario generado:

```php
'admins' => array_values(array_filter(array_map('trim', explode(',', (string) env('ADMIN_EMAILS', ''))))),
```

Si el archivo ya contiene el texto `'admins'` en cualquier sitio, no lo toca.

#### 4. Backend

Copia `stubs/app/common` sobre la raíz de la aplicación, **sobrescribiendo** lo que exista: `bootstrap/app.php`, `bootstrap/providers.php`, `routes/web.php`, `app/Providers/AppServiceProvider.php`, `app/Http/Middleware/EnsureUserIsAdmin.php`, `config/env-editor.php`, la migración `0001_01_01_000010_add_payload_and_soft_deletes_to_users_table.php`, `database/seeders/SiteOptionsSeeder.php` y `laraimport.json`. Qué hace cada uno está en [Qué trae](/app-base/).

Después **borra** `resources/views/welcome.blade.php`, `resources/js/` y `resources/css/`.

#### 5. Interfaz

Copia `stubs/app/vue` o `stubs/app/react` sobre la raíz, sobrescribiendo: `package.json`, `vite.config.js`, `resources/views/app.blade.php`, `resources/<ui>/app/**` y un `resources/<ui>/routes.json` provisional que `php artisan route:json` reescribe.

#### 6. Rutas para el front

Escribe `config/routes-to-json.php` para que `route:json` deje las rutas donde las lee la interfaz:

```php
return [
    'path' => env('JSON_ROUTES_FILE', resource_path('vue/routes.json')), // o react/routes.json
];
```

#### 7. Usuarios, con LaraPack

1. Borra `app/Models/User.php`.
2. Ejecuta `larapack:import laraimport.json --vue` (o `--react`) con `--root` en la aplicación. Genera el modelo `User` con `authenticatable`, su API, políticas, factory, tests y el módulo de la interfaz en `resources/<ui>/index.js` y `resources/<ui>/src/`.
3. Ejecuta `larapack:route-service-provider` y `larapack:event-service-provider`, que `bootstrap/providers.php` ya registra.
4. Copia `stubs/app/overrides`: una `app/Policies/UserPolicy.php` que deja a cada persona ver y editar su propia cuenta. La política que genera LaraPack nace cerrada y la pantalla de perfil no funcionaría.

Si LaraPack termina con error, `app:setup` se detiene con «`<comando>` terminó con error:» seguido de la salida de LaraPack, en vez de decir que todo fue bien.

Al terminar escribe: «Listo. Revisa los cambios y ejecuta: php artisan app:install».

### Lo que reemplaza, borra y genera

| Efecto | Archivos |
|---|---|
| Modifica | `composer.json`, `.env`, `.env.example`, `config/auth.php` |
| Sobrescribe | `bootstrap/app.php`, `bootstrap/providers.php`, `routes/web.php`, `app/Providers/AppServiceProvider.php`, `app/Http/Middleware/EnsureUserIsAdmin.php`, `config/env-editor.php`, `config/routes-to-json.php`, `database/seeders/SiteOptionsSeeder.php`, `laraimport.json`, `package.json`, `vite.config.js`, `resources/views/app.blade.php`, `resources/<ui>/app/**`, `resources/<ui>/routes.json`, `app/Policies/UserPolicy.php` |
| Borra | `resources/views/welcome.blade.php`, `resources/js/`, `resources/css/`, `app/Models/User.php` |
| Genera (LaraPack) | `app/Models/User.php` y el resto de archivos del usuario, sus rutas en `routes/api/models/`, `RouteServiceProvider`, `EventServiceProvider`, `resources/<ui>/index.js`, `resources/<ui>/src/**`, `.larapack/manifest.json` |

::: danger `--force` sobre una aplicación en uso
Las copias sobrescriben sin preguntar. Con `--force` sobre una aplicación que ya trabajaste pierdes tu `laraimport.json` (vuelve a tener sólo el usuario), tus cambios en `resources/<ui>/app`, el seeder, el middleware y los archivos de `bootstrap/`, y `app/Models/User.php` se borra y se regenera. Usa `--force` sólo para repetir la instalación sobre una aplicación nueva, con todo confirmado en git.
:::

## Revisar y nombrar administradores

```bash
git status
git diff
```

Después pon en `.env` los correos de quienes administran, separados por comas. La comparación no distingue mayúsculas:

```ini
ADMIN_EMAILS=tu@correo.com,otra@correo.com
```

Qué cambia ser administrador está en [Acceso y usuarios](/app-base/acceso).

## `app:install`

```bash
php artisan app:install [--pretend] [--without-build] [--composer=composer] [--npm=npm]
```

| Opción | Por omisión | Qué hace |
|---|---|---|
| `--pretend` | — | Escribe cada paso como `etiqueta: comando` y no ejecuta nada. |
| `--without-build` | — | Se salta `npm install` y `npm run build`. |
| `--composer` | `composer` | El ejecutable de Composer. Si termina en `.phar`, se lanza con el mismo PHP que corre artisan. |
| `--npm` | `npm` | El ejecutable de npm; se llama con `install` y con `run build`. |

Los pasos, en orden:

| # | Etiqueta | Comando |
|---|---|---|
| 1 | Dependencias de Composer | `composer update --no-interaction` |
| 2 | Tabla de tokens de Sanctum | `php artisan vendor:publish --tag=sanctum-migrations` |
| 3 | Tabla de notificaciones | `php artisan notifications:install` |
| 4 | Base de datos | `php artisan migrate --force` |
| 5 | Sitio de ejemplo | `php artisan db:seed --class=Database\Seeders\SiteOptionsSeeder --force` |
| 6 | Enlace público del almacenamiento | `php artisan storage:link` |
| 7 | Rutas para la interfaz | `php artisan route:json` |
| 8 | Dependencias de npm | `npm install` |
| 9 | Compilación de la interfaz | `npm run build` |

Cosas que conviene saber:

- **Es `composer update`, no `composer install`.** `app:setup` cambió las restricciones de `composer.json`, así que el `composer.lock` tiene que resolverse de nuevo.
- **Cada paso es un proceso aparte.** Después de `composer update`, los proveedores de los paquetes nuevos sólo existen para un artisan que arranque de nuevo.
- **Para en el primer fallo** con «Falló «etiqueta»: comando» y sale con error. Los pasos anteriores ya quedaron hechos.
- No tiene límite de tiempo. Fuera de Windows usa TTY si la terminal lo admite.
- **No ejecuta `install:api`.** La aplicación base no usa `routes/api.php`. La SPA entra con la sesión gracias a `statefulApi()`, las rutas de la API las carga el `RouteServiceProvider` de LaraPack, y la tabla de tokens de Sanctum sale del paso 2.

::: tip Composer en Windows
Si el `composer` del PATH corre con un PHP anterior a 8.3, como pasa con el de Laragon, no puede resolver paquetes que piden PHP 8.3. Pasa un `composer.phar`: se ejecuta con el PHP de `php artisan`.

```bash
php artisan app:install --composer=C:/ruta/a/composer.phar
```
:::

Cuando termina: «La aplicación está lista. Regístrate con un correo de ADMIN_EMAILS para entrar al administrador.»

```bash
composer run dev
```

## `app:init`

`app:setup` y `app:install` de una vez, para quien no necesita revisar los cambios antes de instalar.

```bash
php artisan app:init [dominio] [--react] [--force] [--without-build]
```

| Argumento u opción | Qué hace |
|---|---|
| `dominio` | Opcional. Al terminar la instalación, llama a `configure:domain` con él. Lee antes sus advertencias, más abajo. |
| `--react` | Se pasa a `app:setup`. |
| `--force` | Se pasa a `app:setup`. |
| `--without-build` | Se pasa a `app:install`. |

Si un paso sale con error, `app:init` se detiene y devuelve ese código.

::: warning `app:init` no acepta `--composer` ni `--npm`
`app:install` corre siempre con `composer` y `npm` del PATH. Si necesitas un `composer.phar`, ejecuta `app:setup` y `app:install --composer=…` por separado.
:::

## `configure:domain`

```bash
php artisan configure:domain mi-app.test
```

::: danger No recomendado
Es un comando heredado, sólo para **Windows con Laragon instalado en `C:\laragon`**, y la configuración que escribe no es segura. Configura el dominio con las herramientas de tu entorno y ajusta `APP_URL` en `.env` a mano.
:::

Lo que hace, en orden:

1. **`hosts`.** Escribe `update_hosts.bat` en la raíz del proyecto y lo ejecuta con `start /wait`. El `.bat` pide permisos de administrador con PowerShell (`RunAs`) y añade `127.0.0.1 <dominio> # Add by Laravel Setup` a `C:\Windows\System32\drivers\etc\hosts`. Si el proceso devuelve 0, borra el `.bat`.
2. **nginx.** Escribe `C:\laragon\etc\nginx\sites-enabled\<dominio>.conf`: escucha en 80 y en 443 con SSL, `root` en el `public/` de la aplicación, `allow 127.0.0.1; deny all;` y el certificado `C:/laragon/etc/ssl/laragon.crt`.
3. **`.env`.** Cambia `APP_URL=` por `https://<dominio>` y `SESSION_DOMAIN=` por `.<dominio>`, sólo en las líneas que ya existen.
4. **Reiniciar nginx.** Sólo escribe «Reinicia el servidor Nginx…»: **no lo reinicia**.

Problemas conocidos:

- Las rutas están escritas a mano. Con Laragon en otra unidad (por ejemplo `D:\laragon`) no puede escribir la configuración de nginx.
- `ssl_protocols TLSv1 TLSv1.1 TLSv1.2` y `ssl_ciphers ALL:!ADH:!EXPORT56:RC4+RSA:+HIGH:+MEDIUM:+LOW:+SSLv3:+EXP` admiten protocolos y cifrados inseguros.
- El certificado de Laragon no está emitido para tu dominio: el navegador avisará.
- `allow 127.0.0.1; deny all;` sólo deja entrar por IPv4 local.
- El dominio no se valida y se escribe dentro de un `.bat` que corre con permisos de administrador.
- Termina con «configurado correctamente» y código 0 aunque un paso haya fallado.
- No toca `SANCTUM_STATEFUL_DOMAINS`. Con `APP_URL` en `https://<dominio>`, el dominio entra por la regla por omisión de Sanctum, pero si definiste esa variable a mano tendrás que añadirlo.

## Variables de entorno que importan

| Clave | Quién la lee | Qué decide |
|---|---|---|
| `APP_URL` | Laravel y Sanctum | La dirección desde la que la sesión vale. Tiene que coincidir con la del navegador, puerto incluido. |
| `SANCTUM_STATEFUL_DOMAINS` | Sanctum | Dominios desde los que la SPA usa la cookie. Si no la defines, se usa la lista por omisión, que incluye el host de `APP_URL`. |
| `SESSION_DOMAIN` | Laravel | El dominio de la cookie de sesión. |
| `SESSION_DRIVER` | Laravel | `app:setup` la fija en `database`. |
| `APP_LOCALE` | Laravel y la interfaz | `app:setup` la fija en `es`. Es el `lang` de `<html>` y, con él, el idioma de la interfaz. |
| `ADMIN_EMAILS` | `config('auth.admins')` | Quién administra. |
| `LARAVEL_UPLOADS_DISK` | laravel-uploads | Disco de las subidas. El paquete usa `s3` por omisión; la aplicación base pone `public`. |
| `LARAVEL_OPTIONS_EXPORT_DISK`, `LARAVEL_AUDIT_EXPORT_DISK` | laravel-options, laravel-audit | Disco de sus exportaciones. |
| `ENV_EDITOR_ENABLED` | `config/env-editor.php` | Si existe el editor del `.env` en `/env-editor`. Por omisión `true`. |
| `JSON_ROUTES_FILE` | `config/routes-to-json.php` | Otra ruta para `routes.json`. Si la cambias, la interfaz tiene que importarlo desde ahí. |
| `VITE_APP_NAME`, `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN`, `VITE_MICROSOFT_LOGIN` | Nadie | Se escriben, pero las interfaces no los leen. |

## Problemas frecuentes

**Entras, pero cada tabla responde 401 y vuelves al login.** El navegador no está en la dirección de `APP_URL` (host o puerto), o `SANCTUM_STATEFUL_DOMAINS` o `SESSION_DOMAIN` no la cubren. La interfaz en Vue lo detecta tras el login y escribe «Entraste, pero la sesión no se conservó. Revisa los dominios de la sesión y de Sanctum.»; la de React vuelve al login.

**Dos aplicaciones se cierran la sesión una a otra.** Las cookies de `127.0.0.1` se comparten entre puertos. Sirve la segunda en `localhost`.

**«La aplicación ya no parece recién creada».** Si `app:setup` falló a medias, ya borró `welcome.blade.php`. Corrige la causa y repite con `--force` sobre la misma aplicación nueva.

**«larapack:import terminó con error:».** Lo que sigue es la salida de LaraPack. Suele ser `laraimport.json`: valídalo con `php artisan larapack:validate laraimport.json --vue` (o `--react`). Ver [Comandos de LaraPack](/larapack/comandos).

**«Unknown backend route "…". Run php artisan route:json.»** (Vue). La ruta no está en `routes.json`. Ejecuta `php artisan route:json` después de añadir o generar endpoints, y vuelve a compilar.

**No aparece el grupo «Administración».** `ADMIN_EMAILS` no incluye tu correo, o la configuración está en caché (`php artisan config:clear`). La interfaz lee la sesión al arrancar: recarga la página.

**Los textos de los modelos generados salen en inglés.** Es a propósito: LaraPack deja sus traducciones al español vacías. Tradúcelas como se explica en [El administrador](/app-base/administrador).

**Una aplicación creada con laravel-setup 6.x.** No hay migración automática: la 7 es para aplicaciones nuevas.
