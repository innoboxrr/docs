# Una aplicación nueva

`innoboxrr/laravel-setup` convierte una aplicación Laravel 13 **recién creada** en la aplicación base del ecosistema:

- **Sitio público** editable desde el administrador: inicio, únete, contacto, aviso de privacidad y términos, con un sitio de ejemplo completo.
- **Acceso** con `innoboxrr/laravel-auth`: registro, iniciar sesión, recuperar la contraseña, verificación de correo y suplantación para administradores.
- **Administrador** con menú que se construye solo, notificaciones, perfil con avatar y contraseña, editor del sitio y enlaces a los registros y al editor del `.env`.
- **Usuarios generados con LaraPack**, con la misma arquitectura que cualquier modelo que añadas después.

Se instala en dos pasos a propósito: `app:setup` **escribe** los archivos y `app:install` **instala**. Entre uno y otro puedes revisar con `git diff` qué cambió.

Antes de empezar, revisa los [requisitos](/empezar/requisitos).

## 1. Crea la aplicación Laravel

```bash
laravel new mi-app
cd mi-app
```

O con Composer:

```bash
composer create-project laravel/laravel mi-app
cd mi-app
```

Configura la base de datos en `.env`. Si el instalador no creó el repositorio, créalo ahora: así el paso 5 te enseña exactamente qué cambió.

```bash
git init
git add -A
git commit -m "Laravel recién creado"
```

## 2. Ajusta `APP_URL`

Pon en `.env` la dirección con la que vas a abrir la aplicación, **con su puerto**:

```dotenv
# con composer run dev o php artisan serve
APP_URL=http://127.0.0.1:8000

# con un host de Laragon
APP_URL=http://mi-app.test
```

::: warning Por qué importa
El administrador llama a la API con la cookie de sesión, y Sanctum sólo la acepta desde los dominios de `SANCTUM_STATEFUL_DOMAINS`: por omisión `localhost`, `127.0.0.1:8000` y el de `APP_URL`, entre otros. Con otra dirección el login responde bien, pero cada tabla del administrador responde 401 y te devuelve al login. Ver [Requisitos](/empezar/requisitos#app-url-sanctum-y-las-cookies).
:::

## 3. Instala laravel-setup

```bash
composer require --dev innoboxrr/laravel-setup
```

## 4. Configura con `app:setup`

::: code-group

```bash [Vue]
php artisan app:setup
```

```bash [React]
php artisan app:setup --react
```

:::

`app:setup` sólo corre sobre una aplicación que parezca recién creada: tiene que existir `resources/views/welcome.blade.php` y no pueden existir `laraimport.json`, `resources/vue/app` ni `resources/react/app`. En cualquier otro caso se niega. `--force` lo obliga, pero piensa antes lo que reemplaza.

**No instala nada.** Hace siete cosas:

| Paso | Qué hace |
|---|---|
| Dependencias de Composer | Escribe en `composer.json` los paquetes del ecosistema y LaraPack en `require-dev`. Quita `lab404/laravel-impersonate`, que sustituye laravel-auth. |
| Variables de entorno | Escribe en `.env` y `.env.example` las claves de la tabla de abajo. |
| Administradores | Añade `admins` a `config/auth.php`, leído de `ADMIN_EMAILS`. |
| Backend | Copia `bootstrap/app.php`, `bootstrap/providers.php`, `routes/web.php`, `AppServiceProvider`, el middleware `admin`, la configuración del editor del `.env`, una migración que añade `payload` y borrado lógico a `users`, `SiteOptionsSeeder` y `laraimport.json`. |
| Interfaz | Copia `package.json`, `vite.config.js`, `resources/views/app.blade.php`, `resources/<ui>/app/**` y un `resources/<ui>/routes.json` provisional. |
| Rutas para el front | Escribe `config/routes-to-json.php` para que `route:json` exporte a `resources/<ui>/routes.json`. |
| Usuarios, con LaraPack | Borra `app/Models/User.php`, genera el usuario desde `laraimport.json` con `larapack:import`, crea el `RouteServiceProvider` y el `EventServiceProvider`, y copia una `UserPolicy` que deja a cada quien ver y editar su propia cuenta. |

Si LaraPack rechaza algo, `app:setup` termina con error y enseña su salida.

::: danger Lo que reemplaza y lo que borra
- **Reemplaza** `bootstrap/app.php`, `bootstrap/providers.php`, `routes/web.php`, `app/Providers/AppServiceProvider.php` y `package.json`.
- **Borra** `resources/views/welcome.blade.php`, `resources/js`, `resources/css` y `app/Models/User.php`.

Por eso sólo corre sobre una aplicación nueva.
:::

::: details Variables de entorno que escribe
Estas se escriben siempre, aunque ya tuvieran un valor:

| Clave | Valor |
|---|---|
| `APP_LOCALE` | `es` |
| `APP_FALLBACK_LOCALE` | `en` |
| `APP_FAKER_LOCALE` | `es_MX` |
| `SESSION_DRIVER` | `database` |

Estas sólo se añaden si faltan:

| Clave | Valor | Para qué |
|---|---|---|
| `ADMIN_EMAILS` | vacío | Quién administra. |
| `LARAVEL_UPLOADS_DISK` | `public` | Dónde se guardan las subidas, como el avatar. |
| `LARAVEL_OPTIONS_EXPORT_DISK` | `local` | Exportaciones de laravel-options. |
| `LARAVEL_AUDIT_EXPORT_DISK` | `local` | Exportaciones de laravel-audit. |
| `VITE_APP_NAME` | `${APP_NAME}` | |
| `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN`, `VITE_MICROSOFT_LOGIN` | `false` | Ninguna interfaz las lee todavía: ver [Problemas frecuentes](#problemas-frecuentes). |
:::

## 5. Revisa y nombra al administrador

```bash
git status
git diff
```

Después pon tu correo en `ADMIN_EMAILS`, en `.env`. Admite varios, separados por comas, y no distingue mayúsculas:

```dotenv
ADMIN_EMAILS=tu@correo.com,otra@correo.com
```

Es lo que responde `isAdmin()` en el usuario generado: las políticas le dejan pasar, el middleware `admin` le deja entrar y puede suplantar a otros usuarios.

## 6. Instala con `app:install`

```bash
php artisan app:install
```

Cada paso corre en un proceso aparte, porque los proveedores de los paquetes recién instalados sólo existen para un artisan que arranca de nuevo. En este orden:

1. `composer update --no-interaction`. Es `update`, no `install`: cambia `composer.lock`.
2. `php artisan vendor:publish --tag=sanctum-migrations`
3. `php artisan notifications:install`
4. `php artisan migrate --force`
5. `php artisan db:seed --class=Database\Seeders\SiteOptionsSeeder --force`
6. `php artisan storage:link`
7. `php artisan route:json`
8. `npm install`
9. `npm run build`

Si un paso falla, se detiene y dice cuál.

| Opción | Qué hace |
|---|---|
| `--pretend` | Enseña los pasos sin ejecutarlos. |
| `--without-build` | No ejecuta `npm install` ni `npm run build`. |
| `--composer=composer` | El ejecutable de Composer. Un `.phar` se lanza con el mismo PHP que artisan. |
| `--npm=npm` | El ejecutable de npm. |

En Windows, si el `composer` del PATH corre con un PHP antiguo:

```bash
php artisan app:install --composer=C:/ruta/a/composer.phar
```

## 7. Arranca

```bash
composer run dev
```

Es el script de desarrollo que trae Laravel: arranca el servidor en `http://127.0.0.1:8000` y Vite, entre otros procesos. Si sirves la aplicación con Laragon, basta con `npm run dev` o con el `npm run build` que ya hizo `app:install`.

## 8. Entra como administrador

1. Abre `/auth/register` y regístrate con un correo de `ADMIN_EMAILS`. La contraseña pide al menos 8 caracteres.
2. Entra en `/admin`.

Verás:

- **Inicio**, con una tarjeta por cada entrada del menú.
- El grupo **Administración**, sólo para administradores: **Usuarios**, **Sitio** (el editor del sitio público), **Registros** (`/log-viewer`) y **Entorno** (`/env-editor`), estos dos en otra pestaña.
- La campana de notificaciones, el modo oscuro y el menú de usuario con tu perfil.

El sitio público está en `/`, con el contenido de ejemplo de `SiteOptionsSeeder`.

## Todo de una vez: `app:init`

Si no necesitas revisar entre pasos, `app:init` ejecuta `app:setup` y `app:install` seguidos:

::: code-group

```bash [Vue]
php artisan app:init
```

```bash [React]
php artisan app:init --react
```

:::

| Argumento u opción | Qué hace |
|---|---|
| `domain` (opcional) | Al terminar, ejecuta `configure:domain` con ese dominio. Lee el aviso de abajo. |
| `--react` | Interfaz en React. |
| `--force` | Configura aunque la aplicación no parezca recién creada. |
| `--without-build` | No instala ni compila la interfaz. |

::: tip Pon ADMIN_EMAILS antes
`app:setup` sólo añade `ADMIN_EMAILS` si falta. Si ya lo escribiste en `.env` antes de `app:init`, se respeta y al terminar ya puedes registrarte como administrador.
:::

::: warning El argumento `domain` sólo sirve en Laragon, y con reservas
`configure:domain` está pensado para Windows con Laragon instalado en `C:\laragon`, con esa ruta escrita en el código. Añade el dominio al archivo `hosts` pidiendo permisos de administrador y escribe una configuración de Nginx que sólo acepta conexiones desde `127.0.0.1`, con protocolos TLS antiguos. Cambia `APP_URL` a `https://<dominio>` y `SESSION_DOMAIN` a `.<dominio>`, y **no reinicia Nginx**: sólo te lo recuerda.

Si Laragon está en otra unidad, o no usas Laragon, crea el dominio con tu herramienta y ajusta `APP_URL` a mano.
:::

## Qué queda en la aplicación

| Dónde | Qué | De quién |
|---|---|---|
| `resources/<ui>/app/` | Sitio, acceso, administrador, estado y rutas del front | Tuyo desde que se instala |
| `resources/<ui>/index.js`, `resources/<ui>/src/` | Los módulos generados | De LaraPack: se regeneran |
| `laraimport.json` | La declaración del usuario y de lo que añadas | Tuyo |
| `database/seeders/SiteOptionsSeeder.php` | El sitio de ejemplo | Tuyo |
| `app/Http/Middleware/EnsureUserIsAdmin.php` | El middleware `admin` | Tuyo |
| `config/auth.php` → `admins` | Quién administra, desde `ADMIN_EMAILS` | Tuyo |
| `.larapack/manifest.json` | Lo que generó LaraPack y su hash | Versiónalo |

## Vue o React

Las dos interfaces son la misma aplicación: mismas rutas, mismas pantallas, mismo JSON del sitio y mismas llamadas al backend. Cambia dónde está cada cosa:

| | Vue | React |
|---|---|---|
| Entrada | `resources/vue/app/main.js` | `resources/react/app/main.jsx` |
| `resources/<ui>/app/config.js` | Sólo `adminOnly`, con **nombres** de ruta | `adminOnly` con **ids** de ruta, más `adminBase`, `adminTools`, `notificationsInterval`, `sitePages` y `userUpdateRoute` |
| Estado | Pinia | Zustand |

Para un módulo generado, el nombre (Vue) y el id (React) de una ruta son la misma cadena, por ejemplo `AdminUsers`. Más en [Con Vue](/app-base/vue) y [Con React](/app-base/react).

## Problemas frecuentes

**Cada tabla del administrador responde 401 y vuelve al login.** `APP_URL` no coincide con la dirección que abres, en host o en puerto. Revisa también `SANCTUM_STATEFUL_DOMAINS` si lo definiste.

**«Iniciaste sesión, pero la sesión no se guardó».** El login respondió bien y la cookie no llegó. Casi siempre es `SESSION_DOMAIN` o `SANCTUM_STATEFUL_DOMAINS`.

**Dos aplicaciones se cierran la sesión una a otra.** Comparten cookies en `127.0.0.1` aunque usen puertos distintos. Abre una en `localhost`.

**No veo el grupo Administración.** Tu correo no está en `ADMIN_EMAILS`, o la configuración está cacheada: `php artisan config:clear`.

**Los nombres de los modelos salen en inglés.** Es a propósito: LaraPack no sabe cómo se dice tu modelo en español y deja la traducción vacía en `resources/<ui>/src/locales/es.json`. Tradúcela ahí o en `resources/<ui>/app/lang/es.json`.

**No hay botones de Google, Facebook o Microsoft.** `app:setup` escribe `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN` y `VITE_MICROSOFT_LOGIN`, pero ninguna de las dos interfaces lee esas variables: el acceso social no está conectado en la aplicación base. El backend sí lo soporta en [laravel-auth](/paquetes/laravel-auth).

**Hay paquetes instalados sin pantalla.** `innoboxrr/laravel-audit`, `innoboxrr/aws-file-manager`, `algolia/scout-extended` y `google/recaptcha` se instalan, pero la aplicación base no tiene interfaz ni configuración para ellos.

::: danger El editor del `.env` está activado
La aplicación base activa `/env-editor` para administradores (`ENV_EDITOR_ENABLED`, por omisión `true`). Desde ahí se puede leer y cambiar el `.env`, secretos incluidos. Si no lo quieres en producción:

```dotenv
ENV_EDITOR_ENABLED=false
```
:::

Más casos en [Solución de problemas](/ayuda/).

## Siguiente paso

[Tu primer modelo](/empezar/primer-modelo): declara un modelo, genéralo y míralo aparecer en el menú.
