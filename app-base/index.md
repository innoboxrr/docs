# Qué trae la aplicación base

`innoboxrr/laravel-setup` convierte una aplicación Laravel 13 **recién creada** en la aplicación base del ecosistema, con la interfaz en Vue o en React. Es un paquete de desarrollo: se instala con `--dev`, escribe los archivos y a partir de ahí todo lo que queda en la aplicación es tuyo.

```bash
composer require --dev innoboxrr/laravel-setup
php artisan app:setup            # Vue
php artisan app:setup --react    # React
php artisan app:install
```

El detalle de cada paso está en [Instalar](/app-base/instalar).

## Lo que ves en el navegador

| Parte | Rutas | Qué hace |
|---|---|---|
| Sitio público | `/`, `/privacy`, `/terms`, `/contact`, `/join` | Cinco páginas pintadas desde la opción `theme` de laravel-options, con 13 secciones y un sitio de ejemplo completo. Se editan desde el administrador. |
| Acceso | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password/:token/:email` | Iniciar sesión, registro, recuperar la contraseña, aviso de verificación del correo y volver de una suplantación, con [laravel-auth](/paquetes/laravel-auth). |
| Administrador | `/admin`, `/admin/profile`, `/admin/site` y las rutas de los módulos | Menú que se construye desde los módulos de LaraPack, tarjetas de inicio, campana de notificaciones, modo oscuro, perfil con foto y contraseña, editor del sitio y enlaces a los registros y al editor del `.env`. |
| Usuarios | Módulo generado, sólo para administradores | El modelo `User` lo genera LaraPack desde `laraimport.json`, con su API, políticas, tests y pantallas, igual que cualquier otro modelo. |

Las páginas de cada parte: [El sitio y su editor](/app-base/sitio), [Acceso y usuarios](/app-base/acceso), [El administrador](/app-base/administrador).

## Lo que queda en el backend

`app:setup` copia estos archivos a la aplicación (desde `stubs/app/common` del paquete):

| Archivo | Para qué |
|---|---|
| `bootstrap/app.php` | `statefulApi()` para que la SPA use la sesión de Sanctum; `redirectGuestsTo('/auth/login')`, porque la ruta `login` de Laravel no existe; alias `admin` para `EnsureUserIsAdmin`; errores en JSON para `api/*` y para peticiones que piden JSON. |
| `bootstrap/providers.php` | `AppServiceProvider`, `EventServiceProvider` y `RouteServiceProvider`. Los dos últimos los genera LaraPack: sin el de rutas no se cargan `routes/api/models/*.php`, y sin el de eventos una exportación no avisa. |
| `routes/web.php` | `/` sirve la vista `app` y un `fallback` sirve la SPA en cualquier otra ruta. Una petición a `api/*` o que pide JSON y no existe responde 404. |
| `app/Providers/AppServiceProvider.php` | `JsonResource::withoutWrapping()`, porque las tablas leen `data`, `meta` y `links` en la raíz; y la puerta `viewLogViewer`, sólo para administradores. |
| `app/Http/Middleware/EnsureUserIsAdmin.php` | El middleware `admin`: 403 si el usuario no responde `true` a `isAdmin()`. |
| `config/env-editor.php` | El editor del `.env` activado (`ENV_EDITOR_ENABLED`, por omisión `true`) detrás de `web`, `auth` y `admin`. |
| `database/migrations/0001_01_01_000010_add_payload_and_soft_deletes_to_users_table.php` | Añade `payload` y `deleted_at` a `users`. LaraPack no altera esa tabla porque su migración la escribió Laravel. |
| `database/seeders/SiteOptionsSeeder.php` | El sitio de ejemplo: `site_name`, `site_description` y `theme`. |
| `laraimport.json` | La declaración del usuario. Lo que añadas después va aquí. |

Además escribe `config/routes-to-json.php`, añade `admins` a `config/auth.php`, genera el usuario con LaraPack y copia una `UserPolicy` que deja a cada persona ver y editar su propia cuenta.

## Los paquetes que instala

`app:setup` los escribe en `composer.json` y `app:install` los instala. La columna de la derecha dice qué los usa de verdad:

| Paquete | Versión | Lo usa |
|---|---|---|
| `innoboxrr/laravel-auth` | `^6.1.0` | Acceso, sesión, verificación y suplantación. La 6.1 es la mínima porque volver de una suplantación es POST. |
| `innoboxrr/laravel-options` | `^2.1` | El sitio y su editor. |
| `innoboxrr/laravel-notifications` | `^2.1` | La campana del administrador. |
| `innoboxrr/laravel-uploads` | `^2.1` | La foto del perfil. |
| `innoboxrr/laravel-env-editor` | `^2.1` | El enlace «Entorno» del administrador. |
| `opcodesio/log-viewer` | `^3.24` | El enlace «Registros» del administrador. |
| `innoboxrr/routes-to-json` | `^2.1` | `php artisan route:json`, que escribe el `routes.json` de la interfaz. |
| `innoboxrr/search-surge`, `innoboxrr/support`, `innoboxrr/traits` | `^3.0`, `^2.1`, `^2.1` | El código que genera LaraPack: filtros y paginación, metas y `payload`. |
| `maatwebsite/excel` | `^4.0` | Las exportaciones que genera LaraPack. |
| `laravel/sanctum` | `^4.3` | La sesión de la SPA contra la API. |
| `innoboxrr/locale-generator` | `^2.1` | Los comandos `locale:generate` y `locale:translate`. |
| `league/flysystem-aws-s3-v3` | `^3.0` | El driver S3 de Flysystem, para quien use un disco S3. |
| `staudenmeir/belongs-to-through`, `staudenmeir/eloquent-has-many-deep` | `^2.18`, `^1.22` | La aplicación base no los usa directamente. |
| `innoboxrr/laravel-audit` | `^2.1` | **Instalado sin interfaz.** Su API existe; ninguna pantalla la usa. |
| `innoboxrr/aws-file-manager` | `^2.0` | **Instalado sin interfaz.** Su API existe y responde 503 hasta configurar S3; ninguna pantalla la usa. |
| `algolia/scout-extended` | `^5.0` | **Instalado sin configuración ni uso.** |
| `google/recaptcha` | `^1.3` | **Instalado sin uso.** Ningún formulario lleva reCAPTCHA. |
| `innoboxrr/larapack-generator` (dev) | `^7.10.2` | Generar modelos. |

También **quita** `lab404/laravel-impersonate`: la suplantación la hace laravel-auth.

::: warning Lo que no está conectado
- **Login social.** `app:setup` escribe `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN` y `VITE_MICROSOFT_LOGIN`, pero ninguna de las dos interfaces lee variables `VITE_*`. laravel-auth tiene las rutas de Socialite; las pantallas no tienen botones.
- **Empezar una suplantación.** Las interfaces sólo traen «Volver a mi cuenta». No hay botón para entrar como otro usuario; ver [Acceso y usuarios](/app-base/acceso).
- **Auditoría, gestor de archivos S3, Scout y reCAPTCHA.** Instalados, sin pantallas ni configuración.
- **Tests de la interfaz en tu aplicación.** Los tests de Vue y React viven en el paquete, no se copian.
:::

## Vue o React

Las dos interfaces son la misma aplicación: mismas rutas, mismas pantallas, mismo JSON del sitio y mismas llamadas al backend. Lo fija [El contrato de las interfaces](/app-base/contrato). Cambia la pila y dónde se ajustan algunas cosas:

| | Vue | React |
|---|---|---|
| Entrada | `resources/vue/app/main.js` | `resources/react/app/main.jsx` |
| Router | vue-router 4, guardas con `beforeEach` | React Router 7 (data router), una guarda en el `loader` de cada ruta |
| Estado | Pinia 3 | Zustand 5 |
| Componentes | `innoboxrr-form-elements` | `innoboxrr-react-form-elements` |
| Tablas | `innoboxrr-vue-datatable` | `innoboxrr-react-datatable` |
| Ajustes | `config.js` sólo exporta `adminOnly`; lo demás está escrito en su archivo | `config.js` exporta `adminOnly`, `adminBase`, `userUpdateRoute`, `adminTools`, `notificationsInterval` y `sitePages` |

Cada una tiene su página: [Con Vue](/app-base/vue) y [Con React](/app-base/react). Las diferencias de comportamiento están en [Personalizar y ampliar](/app-base/personalizar).

## De quién es cada archivo

| Dónde | Qué | De quién |
|---|---|---|
| `resources/<ui>/app/` | Sitio, acceso, administrador, estado y rutas | Tuyo desde que se instala: laravel-setup no lo vuelve a tocar. |
| `resources/<ui>/index.js`, `resources/<ui>/src/` | Los módulos generados (usuarios y lo que generes) | De LaraPack: se regeneran. La aplicación base los importa y nunca los edita. |
| `laraimport.json` | La declaración del usuario y de tus modelos | Tuyo |
| `database/seeders/SiteOptionsSeeder.php` | El sitio de ejemplo | Tuyo |
| `app/Http/Middleware/EnsureUserIsAdmin.php` | El middleware `admin` | Tuyo |
| `config/auth.php` → `admins` | Quién administra (`ADMIN_EMAILS`) | Tuyo |

`<ui>` es `vue` o `react`.

::: tip Siguiente paso
[Instalar](/app-base/instalar) la aplicación base, o seguir la guía completa de [Una aplicación nueva](/empezar/app-nueva).
:::
