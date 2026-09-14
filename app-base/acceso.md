# Acceso y usuarios

El acceso lo resuelve [laravel-auth](/paquetes/laravel-auth) 6.1, que responde JSON bajo `/auth` en el grupo `web`. Las pantallas de la SPA son sólo la cara. El usuario es un modelo generado por LaraPack, y quién administra lo decide `ADMIN_EMAILS`.

## La sesión

La SPA no usa tokens: entra con la cookie de sesión de Sanctum.

- `bootstrap/app.php` llama a `statefulApi()`.
- axios envía `withCredentials` y `withXSRFToken` (desde axios 1.6, sin esto no se envía `X-XSRF-TOKEN`).
- Antes de un POST que regenera la sesión (entrar, registrarse) se pide `GET /sanctum/csrf-cookie`.
- Un **419** (token CSRF caducado) pide otra cookie y repite la petición una vez.
- Un **401** fuera de la carga de la sesión limpia la sesión y lleva a `/auth/login?redirect=<ruta>`.

Al arrancar, la interfaz pide `auth.get.auth` y guarda:

```json
{
    "user": { "id": 1, "name": "Ana", "email": "ana@example.com", "payload": { "avatar": "/lu/upload/…" } },
    "authenticated": true,
    "is_admin": true,
    "verified": true,
    "impersonating": false
}
```

| Campo | De dónde sale |
|---|---|
| `authenticated` | Hay usuario con el guard de Sanctum |
| `is_admin` | `$user->isAdmin()` |
| `verified` | `true` si el usuario no implementa `MustVerifyEmail` o ya verificó su correo |
| `impersonating` | La sesión tiene `impersonate_token` |

::: warning `APP_URL` y los dominios de la sesión
Si la cookie no llega, el login responde bien pero `get-auth` dice que no hay sesión. Revisa [los problemas frecuentes de Instalar](/app-base/instalar).
:::

## Los flujos

### Iniciar sesión

`/auth/login` (sólo invitados).

1. GET de la cookie CSRF.
2. POST `auth.login` con `{ email, password, remember }`.
3. `load()` de la sesión.
4. Navega a `?redirect=` si es una ruta interna (empieza por `/` y no por `//` ni `/\`). Si no, a `/admin`.

Un 422 se pinta bajo cada campo. Un 429 dice «Demasiados intentos». En Vue, si el POST fue bien pero la sesión no llegó, avisa «Entraste, pero la sesión no se conservó. Revisa los dominios de la sesión y de Sanctum.». En React, la guarda de `/admin` devuelve al login.

### Registrarse

`/auth/register` (sólo invitados). Envía `{ name, email, password, password_confirmation }` a `auth.register` tras pedir la cookie CSRF, y carga la sesión. Después navega a `?redirect=` o a `/admin`.

- Con `allow-registration` en `false` en `config/laravel-auth.php`, laravel-auth responde 403 y la pantalla dice «Ahora mismo no se admiten cuentas nuevas.».
- Las reglas de la contraseña están en `password` de esa configuración: `length` (8), `uppercase` (`false`) y `number` (`false`).

### Cerrar sesión

POST `auth.logout`. La sesión local se limpia aunque la petición falle.

### Recuperar la contraseña

1. `/auth/forgot-password` envía `{ email }` a `auth.forgot.password`. laravel-auth responde lo mismo exista o no la cuenta, y la pantalla enseña ese mensaje.
2. El correo enlaza a `frontend.reset-password` de laravel-auth: `auth/reset-password/{token}/{email}`, con el correo codificado para URL. Es la ruta `/auth/reset-password/:token/:email` de la SPA.
3. Esa pantalla envía `{ token, email, password, password_confirmation }` a `auth.reset.password` y lleva al login con un aviso.

En Vue el correo sale de la URL y no se edita. En React se puede editar. React además pide la cookie CSRF antes de los dos POST.

### Verificar el correo

- Con la sesión abierta y `verified === false`, el administrador enseña un aviso con «Reenviar el correo», que llama a `auth.email.verification.notification` (máximo 6 por minuto).
- Si responde `status: 'already-verified'`, la interfaz recarga la sesión.
- El enlace del correo va a la ruta de laravel-auth `auth/email/verify/{id}/{hash}` (firmada, con sesión), que redirige a `/admin`.

::: tip Por omisión no se pide verificar
El `User` que genera LaraPack no implementa `MustVerifyEmail`, así que `verified` siempre es `true` y el aviso no sale. Para exigir la verificación, implementa `Illuminate\Contracts\Auth\MustVerifyEmail` en `app/Models/User.php`. LaraPack conserva el archivo al regenerar con `--force`, porque su hash ya no coincide.
:::

### Cambiar la contraseña

Desde el perfil: POST `auth.update.password` con `{ old_password, password, password_confirmation }`. Con laravel-auth 6.0.3 o posterior, cambiarla no saca del administrador.

## Suplantación

Un administrador puede entrar como otro usuario para ver lo que ve.

**Quién puede.** La habilidad de Gate `laravel-auth.impersonate`. Por omisión: un usuario con `isAdmin()`, nunca sobre sí mismo ni sobre otro administrador. Se apaga entera con `allow-impersonate` en `false`, y se redefine en tu `AuthServiceProvider` o con `ImpersonateRequest::authorizeUsing()`.

**El flujo:**

1. POST `auth.impersonate` con `{ target_user_id }` → `{ token, url }`. El token cifra quién lo pidió, a quién y cuándo.
2. GET de `url` (`auth/impersonate/{token}`): entra como el usuario, regenera la sesión y guarda `impersonate_token`. Si la petición no pide JSON, redirige a `/admin`. El token vale **dos minutos** y sólo para quien lo pidió.
3. `get-auth` responde `impersonating: true` y el administrador enseña «Estás viendo la cuenta de `<nombre>`» con **«Volver a mi cuenta»**.
4. «Volver a mi cuenta» hace **POST** `auth.revert.impersonate` y recarga la sesión. Vue lleva a `/admin`, o al login si la sesión se cerró; React lleva a `/admin`.
5. Una suplantación dura **como mucho dos horas**. Pasado ese tiempo, volver cierra la sesión en lugar de devolver la cuenta original.

::: warning Volver es POST desde laravel-auth 6.1
Por GET, otro sitio podía terminar la suplantación con un `<img>`, sin token CSRF. laravel-auth 6.1.0 sólo acepta POST y laravel-setup 7.0.1 lo usa en las dos interfaces. Por eso la aplicación pide `innoboxrr/laravel-auth ^6.1.0`: con la 6.0 ese POST respondería 405.
:::

:::: info No hay botón para empezar
Las interfaces sólo traen el aviso y «Volver a mi cuenta». Para empezar una suplantación, llama tú al endpoint, por ejemplo desde una acción en la tabla de usuarios:

::: code-group

```js [Vue]
import { apiUrl, http } from '@app/http.js'

const { data } = await http.post(apiUrl('auth.impersonate'), { target_user_id: 42 })

// Navegación completa: laravel-auth entra como el usuario y redirige a /admin.
window.location.assign(data.url)
```

```js [React]
import axios from 'axios'
import route from 'innoboxrr-route-resolver'

const { data } = await axios.post(route('auth.impersonate'), { target_user_id: 42 })

// Navegación completa: laravel-auth entra como el usuario y redirige a /admin.
window.location.assign(data.url)
```

:::
::::

## Quién administra: `ADMIN_EMAILS`

```text
.env                ADMIN_EMAILS=ana@example.com,luis@example.com
  ↓
config/auth.php     'admins' => array_values(array_filter(array_map('trim', explode(',', (string) env('ADMIN_EMAILS', '')))))
  ↓
User::isAdmin()     compara el correo, sin distinguir mayúsculas
```

El `isAdmin()` que genera LaraPack con `authenticatable`:

```php
public function isAdmin(): bool
{
    $admins = array_map('strtolower', (array) config('auth.admins', []));

    return in_array(strtolower((string) $this->email), $admins, true);
}
```

Quién lo lee:

| Dónde | Qué decide |
|---|---|
| `auth.get.auth` → `is_admin` | El grupo «Administración», `adminOnly` y `/admin/site` en la interfaz |
| `before()` de las políticas que genera LaraPack | Un administrador pasa todo menos `forceDelete` |
| `UserPolicy` de la aplicación base | Igual |
| Política de laravel-options | Sólo un administrador escribe opciones (el sitio) |
| Middleware `admin` (`EnsureUserIsAdmin`) | `/env-editor` |
| Puerta `viewLogViewer` | `/log-viewer` |
| Puerta `laravel-auth.impersonate` | Quién puede suplantar |

- Con la configuración en caché (`php artisan config:cache`), un cambio en `ADMIN_EMAILS` no se ve hasta `php artisan config:clear`, o hasta volver a cachearla.
- La interfaz lee `is_admin` al arrancar: recarga la página.
- `ADMIN_EMAILS` es un punto de partida. Para roles, cambia `isAdmin()` en `app/Models/User.php`: todo lo de la tabla sigue funcionando.

## El usuario generado

`laraimport.json`, tal como lo deja `app:setup`:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        {
            "name": "User",
            "authenticatable": true,
            "metas": true,
            "editable_metas": ["avatar"],
            "routes": { "except": ["create"] },
            "props": [
                { "name": "name", "type": "string", "datatable": true, "form": true, "form_component": "TextInputComponent", "form_submit": true },
                { "name": "email", "type": "string", "datatable": true, "form": true, "form_component": "TextInputComponent", "form_submit": true },
                { "name": "email_verified_at", "type": "timestamp", "nullable": true, "fillable": false, "creatable": false, "updatable": false, "datatable": true },
                { "name": "password", "type": "string", "updatable": false, "exports_cols": false }
            ],
            "requests": [
                {
                    "name": "Update",
                    "rules": {
                        "user_id": "required|numeric",
                        "name": "sometimes|required|string|max:255",
                        "email": "sometimes|required|email|max:255"
                    }
                }
            ]
        }
    ]
}
```

| Declaración | Lo que genera |
|---|---|
| `authenticatable: true` | El modelo extiende `Illuminate\Foundation\Auth\User` con `Notifiable` y `HasApiTokens`; oculta `password` y `remember_token`; `email_verified_at` como fecha y `password` como `hashed`; e `isAdmin()`. |
| `metas: true`, `editable_metas: ["avatar"]` | La tabla de metas del usuario, su modelo `UserMeta`, la relación `metas()` y la copia en `payload`. El formulario sólo escribe la meta `avatar`. |
| `routes.except: ["create"]` | Sin endpoint ni formulario de creación: las cuentas nacen en el registro. Quedan index, show, update, delete, restore, forceDelete, export y las acciones en lote. |
| `requests` | Las reglas del update: el perfil manda `name` y `email` por separado de `avatar`, de ahí los `sometimes`. |

- La API vive en `routes/api/models/` con nombres `api.app.user.*`.
- El módulo de la interfaz tiene la ruta `AdminUsers`, que está en `adminOnly`.
- La tabla `users` la crea Laravel, así que LaraPack no la altera. La migración `0001_01_01_000010_add_payload_and_soft_deletes_to_users_table.php` de la aplicación base añade `payload` y `deleted_at`.

Cómo se declara y regenera un modelo está en [El contrato: laraimport.json](/larapack/laraimport).

### La `UserPolicy` de la aplicación base

La política que genera LaraPack nace cerrada: sólo pasa el administrador. El perfil necesita que cada persona vea y edite su propia cuenta, así que `app:setup` copia esta política encima:

| Habilidad | Administrador | El propio usuario | Otro usuario |
|---|---|---|---|
| `index`, `viewAny` | Sí | No | No |
| `view` | Sí | Sí | No |
| `update` | Sí | Sí | No |
| `create` | Sí | No | No |
| `delete`, `restore`, `export` | Sí | No | No |
| `forceDelete` | **No** | No | No |

`forceDelete` está en `$exceptAbilities` de `before()`: el borrado permanente nace apagado también para el administrador. LaraPack la conserva al regenerar con `--force`, porque su hash no coincide con el del manifiesto, y `larapack:verify` la informa como `customised`.

## El perfil

`/admin/profile`, para cualquier usuario con sesión.

| Tarjeta | Petición |
|---|---|
| **Cuenta** (nombre y correo) | PUT `api.app.user.update` con `{ user_id, name, email }` y recarga la sesión |
| **Foto**: subir | POST `lu.upload.file` (multipart con `file` y `visibility=public`); después PUT `api.app.user.update` con `{ user_id, avatar: <uri> }` |
| **Foto**: quitar | PUT `api.app.user.update` con `{ user_id, avatar: '' }`. Una meta vacía se borra. |
| **Contraseña** | POST `auth.update.password` con `{ old_password, password, password_confirmation }` |

- **Qué se guarda.** El `uri` **relativo** de la subida (la ruta pública `lu.upload.display`), no la `url` absoluta: sigue valiendo si cambia el dominio.
- **Cómo se lee.** Como `payload.avatar`, venga `payload` como objeto o como texto JSON. Sin foto, o si no carga en React, se ven las iniciales.
- **Qué archivos.** Sólo imágenes (`accept="image/*"`, comprobado antes de subir). Los límites de tamaño y tipo son los de [laravel-uploads](/paquetes/laravel-uploads), que no admite SVG. El disco es `LARAVEL_UPLOADS_DISK`, que la aplicación base pone en `public`.
- **Por qué no `AvatarInputComponent`.** En Vue la subida va por axios porque ese componente usa `fetch` sin la cabecera XSRF, y la ruta de laravel-uploads la exige con la sesión.
- **Dónde está el código.** En Vue, las llamadas están en `admin/ProfileView.vue`. En React, en el estado de sesión: `updateProfile`, `updateAvatar` y `removeAvatar`.

## Login social

::: warning No está conectado en las interfaces
`app:setup` escribe `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN` y `VITE_MICROSOFT_LOGIN`, pero ni la interfaz de Vue ni la de React leen variables `VITE_*`, y ninguna pantalla tiene botones de proveedores.

laravel-auth sí trae las rutas de Socialite: `auth.socialite.redirect` (`auth/social/{provider}/redirect`) y `auth.socialite.callback`, que redirige a `/admin`. Los proveedores se configuran en `config/services.php`. Conectarlo es añadir tú los botones en las pantallas de acceso; ver [laravel-auth](/paquetes/laravel-auth).
:::
