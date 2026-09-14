# laravel-auth

`innoboxrr/laravel-auth` **6.1.0** resuelve el acceso de una aplicación Laravel 13 con una SPA delante. Cubre:

- iniciar y cerrar sesión, y registrarse;
- recuperar y cambiar la contraseña, y verificar el correo;
- tokens de Sanctum para integraciones;
- login social con Socialite;
- suplantar a otro usuario.

Cada ruta responde JSON cuando la petición lo pide (`Accept: application/json`) y redirige cuando no, así que sirve igual a una SPA que a un formulario de Blade.

Es el backend de las pantallas de acceso de la aplicación base, en Vue y en React.

::: warning Desde la 6.1, volver de una suplantación es POST
`auth.revert.impersonate` ya no acepta GET: un GET cambiaba la cuenta de la sesión y otro sitio podía dispararlo con un `<img>`, sin pasar por el token CSRF. Ver [Actualizar](#actualizar).
:::

## Instalar

```bash
composer require innoboxrr/laravel-auth
php artisan install:api
```

Requiere PHP `^8.3`, `illuminate/support ^13.0`, `laravel/sanctum ^4.0` y `laravel/socialite ^5.16`.

Las rutas se registran solas bajo `/auth`, en el grupo `web`, con nombres `auth.*`. Lo que el paquete espera de la aplicación:

- **Sanctum en modo SPA.** `$middleware->statefulApi()` en `bootstrap/app.php`, para que la SPA use la cookie de sesión. `install:api` usa el `composer` del PATH y, si falla, no lo dice: compruébalo con `composer show laravel/sanctum`.
- **Un usuario con `HasApiTokens` y `Notifiable`.** Si implementa `MustVerifyEmail`, se le envía el correo de verificación al registrarse. Si define `isAdmin()`, puede suplantar a otros.
- **Las tablas de Laravel.** `users` y `password_reset_tokens` (las crea la migración inicial de Laravel) y `personal_access_tokens` de Sanctum si usas tokens.

::: tip La aplicación base no ejecuta install:api
`app:install` sólo publica las migraciones de Sanctum (`vendor:publish --tag=sanctum-migrations`) y `bootstrap/app.php` ya llama a `statefulApi()`. No hace falta `routes/api.php`.
:::

## Configuración

Se publica en `config/laravel-auth.php`.

| Clave | Por omisión | Qué decide |
|---|---|---|
| `user-class` | `App\Models\User` | El modelo que usan registro, tokens, login social y suplantación |
| `allow-registration` | `true` | Con `false`, `register` responde 403 |
| `allow-impersonate` | `true` | Con `false`, las tres rutas de suplantación responden 403. Aun en `true`, sólo suplanta quien pasa la habilidad `laravel-auth.impersonate` |
| `password.length` | `8` | Longitud mínima de una contraseña nueva |
| `password.uppercase` | `false` | Exigir una mayúscula |
| `password.number` | `false` | Exigir un número |
| `frontend.reset-password` | `auth/reset-password/{token}/{email}` | La pantalla de la aplicación a la que enlaza el correo de restablecer. El correo va codificado para URL |
| `routes.active` | `true` | Con `false` no se registra ninguna ruta |
| `routes.as` | `auth.` | Prefijo de los nombres |
| `routes.prefix` | `auth` | Prefijo de las URIs |
| `routes.uris.*` | ver [Rutas HTTP](#rutas-http) | La URI de cada acción |
| `routes.names.*` | ver [Rutas HTTP](#rutas-http) | El nombre de cada acción, sin el prefijo |
| `routes.middlewares.*` | ver [Rutas HTTP](#rutas-http) | El middleware de cada acción |
| `routes.redirects.*` | ver abajo | A dónde redirige cada acción cuando la petición no pide JSON |

Las reglas de contraseña se aplican al registrarse, al restablecer y al cambiar la contraseña, y el mensaje dice la regla que falla. Una configuración publicada antes de la 6.0 que todavía las tenga en `routes.password` se sigue respetando.

::: details Redirecciones por omisión (`routes.redirects`)
| Acción | Destino |
|---|---|
| `login`, `register`, `update-password`, `email-verification-notification`, `verification-verify`, `socialite-callback`, `impersonate-token`, `revert-impersonate` | `/admin` |
| `reset-password` | `/auth/login` |
| `logout`, `get-auth`, `create-token`, `tokens`, `revoke-token`, `flush-tokens`, `impersonate` | `/` |
| `socialite-redirect` | `/` (en la práctica redirige Socialite al proveedor) |

`forgot-password` y `flush-tokens` sin JSON vuelven a la página anterior con el mensaje en la sesión. `impersonate` responde JSON siempre.
:::

## Variables de entorno

El paquete no lee variables propias. Le afectan:

| Variable | Dónde se lee | Por qué importa |
|---|---|---|
| `APP_URL` | `url()` en los correos | Los enlaces de restablecer y verificar se construyen con ella |
| `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN` | Sanctum y la sesión | Si el dominio de la SPA no está, el login funciona pero la sesión no llega a la siguiente petición |
| Las credenciales de cada proveedor social | `config/services.php` | Un proveedor sin entrada ahí responde 404 |

La caducidad del enlace de verificación es `auth.verification.expire` de `config/auth.php` (60 minutos por omisión).

## Publicar

| Tag | Qué copia |
|---|---|
| `laravel-auth-config` (o `config`) | `config/laravel-auth.php` |

```bash
php artisan vendor:publish --tag=laravel-auth-config
```

Las traducciones no se publican: los mensajes son claves en inglés y el paquete trae `lang/es.json`. Para cambiar uno, añade la clave en el `lang/<idioma>.json` de la aplicación.

## Migraciones

El paquete no trae migraciones. Usa `users`, `password_reset_tokens` y, para los tokens, `personal_access_tokens` de Sanctum.

## Comandos

No registra comandos.

## Rutas HTTP

Todas van en el grupo `web` (sesión y CSRF), con prefijo `/auth` y nombres `auth.*`. Un POST sin token CSRF responde 419. Los errores de validación llegan como en cualquier FormRequest: 422 con `{ message, errors }`.

| Método | URI | Nombre | Middleware | Campos | Respuesta JSON |
|---|---|---|---|---|---|
| POST | `/auth/login` | `auth.login` | `guest` | `email`, `password`, `remember` (opcional, booleano) | `{ success, user }`. 422 en `email` con credenciales malas, y tras 5 intentos por correo e IP |
| POST | `/auth/register` | `auth.register` | `guest` | `name` (máx. 255), `email` (único en la tabla del usuario), `password`, `password_confirmation` | `{ success, user }`. 403 si `allow-registration` es `false` |
| POST | `/auth/logout` | `auth.logout` | `auth:sanctum` | — | `{ success }` |
| GET | `/auth/get-auth` | `auth.get.auth` | — | — | `{ user, authenticated, is_admin, verified, impersonating }` |
| POST | `/auth/forgot-password` | `auth.forgot.password` | `guest` | `email` | `{ success, message }`, igual exista o no la cuenta |
| POST | `/auth/reset-password` | `auth.reset.password` | `guest` | `token`, `email`, `password`, `password_confirmation` | `{ success, message }`. 422 en `email` con token inválido |
| POST | `/auth/update-password` | `auth.update.password` | `auth:sanctum` | `old_password`, `password`, `password_confirmation` | `{ success, message }`. 422 en `old_password` si no es la actual |
| POST | `/auth/email-verification-notification` | `auth.email.verification.notification` | `auth:sanctum`, `throttle:6,1` | — | `{ success, status }` con `verification-link-sent` o `already-verified` |
| GET | `/auth/email/verify/{id}/{hash}` | `auth.verification.verify` | `auth:sanctum`, `signed`, `throttle:6,1` | — | `{ verified }` |
| POST | `/auth/create-token` | `auth.create.token` | `throttle:6,1` | `email`, `password`, `name` (máx. 255), `abilities` (lista, opcional), `expires_at` o `expiration_date` (fecha futura, opcional) | `{ token }`. 422 en `email` con credenciales malas |
| POST | `/auth/tokens` | `auth.tokens` | `auth:sanctum` | — | `{ tokens }` |
| POST | `/auth/revoke-token` | `auth.revoke.token` | `auth:sanctum` | `token_id` | `{ revoked }`: sólo revoca tokens propios |
| POST | `/auth/flush-tokens` | `auth.flush.tokens` | `auth:sanctum` | — | `{ success, message }` |
| GET | `/auth/social/{provider}/redirect` | `auth.socialite.redirect` | `guest` | — | Redirige al proveedor. 404 si no está en `config/services.php` |
| GET | `/auth/social/{provider}/callback` | `auth.socialite.callback` | `guest` | — | Entra en la cuenta del correo del proveedor o la crea, y redirige |
| POST | `/auth/impersonate` | `auth.impersonate` | `auth:sanctum` | `target_user_id` (tiene que existir) | `{ token, url }` |
| GET | `/auth/impersonate/{token}` | `auth.impersonate.token` | `auth:sanctum` | — | `{ success, user }` o redirige |
| POST | `/auth/revert-impersonate` | `auth.revert.impersonate` | `auth:sanctum` | — | `{ success, user }` o redirige |

Detalles que cambian el comportamiento:

- **`login` y `register` regeneran la sesión.** Por eso la SPA pide `GET /sanctum/csrf-cookie` antes del POST. `register` guarda lo que llega salvo `password_confirmation`, `_token`, `remember` y `redirect`: el `$fillable` del modelo decide qué acepta. Cifra la contraseña una vez, lanza `Registered` y entra.
- **`get-auth` usa el guard de Sanctum**, que acepta la sesión y también un token. `verified` es `true` para un usuario cuyo modelo no implementa `MustVerifyEmail`.
- **`update-password` renueva la huella de la contraseña en la sesión.** Sin eso, `AuthenticateSession` cerraba la sesión en la siguiente petición. Lanza `PasswordReset`, igual que `reset-password`.
- **`create-token` no inicia sesión.** El token se usa como `Authorization: Bearer <token>` en las rutas con `auth:sanctum`. Sin `abilities` se crea con `['*']`.
- **El enlace de verificación es una ruta firmada y temporal** que exige sesión: quien lo abre en otro navegador tiene que entrar primero.

### Suplantar a un usuario

1. `POST /auth/impersonate` con `target_user_id` devuelve `{ token, url }`. El token cifra quién lo pidió, a quién y cuándo.
2. Navegar a `url` inicia sesión como el usuario. El token sólo sirve a quien lo pidió, durante 120 segundos y si todavía puede suplantar a ese usuario; si no, 403. La sesión guarda `impersonate_token` y `get-auth` responde `impersonating: true`.
3. `POST /auth/revert-impersonate`, con el token CSRF, vuelve a la cuenta original. Si pasaron más de 7200 segundos (dos horas) desde que se pidió el token, o la cuenta original ya no existe, cierra la sesión y responde `{ success: false, user: null }`. Sin `impersonate_token` en la sesión responde 403.

```js
// axios envía X-XSRF-TOKEN desde la cookie XSRF-TOKEN
axios.defaults.withXSRFToken = true

await axios.post('/auth/revert-impersonate')
```

```blade
<form method="POST" action="{{ route('auth.revert.impersonate') }}">
    @csrf
    <button>Volver a mi cuenta</button>
</form>
```

## Políticas y gates

El paquete define una habilidad: **`laravel-auth.impersonate`**, con la firma `($user, ?$target = null)`. Por omisión deja pasar cuando:

- el usuario tiene `isAdmin()` y responde `true`;
- sin destino, basta con eso;
- con destino, el destino no es él mismo ni otro administrador.

Sólo se define si la aplicación no la definió antes. Para otra regla, redefínela desde un proveedor de la aplicación, por ejemplo en `AppServiceProvider::boot()`:

```php
Gate::define('laravel-auth.impersonate', fn ($user, $target = null) => $user->hasRole('soporte'));
```

## Puntos de extensión

```php
use Innoboxrr\LaravelAuth\Http\Requests\Auth\GetAuthRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Auth\RegisterRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Impersonate\ImpersonateRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Impersonate\ImpersonateTokenRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Socialite\CallbackRequest;

// Sustituye las reglas del registro. Son todas: incluye email y password.
RegisterRequest::setCustomRulesCallback(fn (RegisterRequest $request) => [/* ... */]);

// Sustituye la respuesta completa de get-auth. Recibe el usuario de Sanctum o null.
GetAuthRequest::$customGetAuthCallback = fn ($user) => response()->json([/* ... */]);

// Login social: tú inicias sesión y respondes.
CallbackRequest::$customLoginCallback = fn ($user, string $provider, $providerUser) => /* ... */;
CallbackRequest::$customRegisterCallback = fn ($providerUser, string $provider) => /* ... */;

// Sustituye por completo quién puede pedir un token de suplantación.
ImpersonateRequest::authorizeUsing(fn (ImpersonateRequest $request) => /* bool */);
ImpersonateRequest::setCustomRulesCallback(fn (ImpersonateRequest $request) => [/* ... */]);

// Sustituye la comprobación de la habilidad al usar el token.
// La caducidad y que lo use quien lo pidió se siguen comprobando.
ImpersonateTokenRequest::authorizeUsing(fn (ImpersonateTokenRequest $request) => /* bool */);
```

Registra estos callbacks en el `boot()` de un proveedor de la aplicación. `allow-impersonate` en `false` y la falta de sesión siguen cerrando la suplantación aunque definas `authorizeUsing`.

Además, el paquete lanza los eventos de Laravel `Registered`, `PasswordReset`, `Verified` y `Lockout`: escúchalos para lo que tenga que pasar después de cada flujo.

Para el login social, declara el proveedor en `config/services.php`:

```php
'github' => [
    'client_id' => env('GITHUB_CLIENT_ID'),
    'client_secret' => env('GITHUB_CLIENT_SECRET'),
    'redirect' => '/auth/social/github/callback',
],
```

## En la aplicación base

La aplicación base pide `innoboxrr/laravel-auth ^6.1.0`. En Vue (Pinia) y en React (Zustand), `stores/auth.js` resuelve cada llamada por nombre de ruta:

| Pantalla o acción | Ruta |
|---|---|
| Arranque, y después de entrar, registrarse o volver de una suplantación | `auth.get.auth` |
| `/auth/login` | `GET /sanctum/csrf-cookie` y luego `auth.login` |
| `/auth/register` | cookie CSRF y luego `auth.register` |
| Menú de usuario, «Cerrar sesión» | `auth.logout` |
| `/auth/forgot-password` | `auth.forgot.password` |
| `/auth/reset-password/:token/:email`, la URL de `frontend.reset-password` | `auth.reset.password` |
| `/admin/profile`, tarjeta de contraseña | `auth.update.password` |
| Aviso de verificación, cuando `verified === false` | `auth.email.verification.notification` |
| Aviso de suplantación, «Volver a mi cuenta» | `auth.revert.impersonate` con POST |

- **Quién administra.** `ADMIN_EMAILS` llena `config('auth.admins')`. El `isAdmin()` del usuario que genera LaraPack lo lee, y de ahí salen `is_admin` en `get-auth` y la habilidad de suplantar.
- **Invitados.** `bootstrap/app.php` manda a `/auth/login` a quien no tiene sesión (`redirectGuestsTo`), porque la aplicación no tiene una ruta `login` de Laravel.
- **Lo que las interfaces no usan:**
  - **Tokens.** Ninguna pantalla los pide.
  - **Login social.** `app:setup` escribe `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN` y `VITE_MICROSOFT_LOGIN` en el `.env`, pero ningún archivo de las interfaces las lee: no hay botones.
  - **Empezar una suplantación.** El aviso y «Volver a mi cuenta» existen, pero ninguna pantalla llama a `auth.impersonate`. Si la quieres, añade tú la acción, por ejemplo en la fila de un usuario.

Ver [Acceso y usuarios](/app-base/acceso).

## Actualizar

### De 6.0 a 6.1

- **`revert-impersonate` sólo acepta POST.** Cambia cada llamada de GET a POST con el token CSRF. Un enlace `<a href="/auth/revert-impersonate">` tiene que pasar a ser un formulario o un botón que haga el POST.
- El nombre `auth.revert.impersonate`, la URI, el middleware y las respuestas no cambian.
- Un GET que quede sin cambiar ya no vuelve a la cuenta original y la sesión sigue como estaba. Responde 405, o lo atiende el fallback de la aplicación si tiene uno. En la aplicación base lo atiende el fallback: 404 si la petición pide JSON y la vista de la SPA si no.
- Si usas la aplicación base, laravel-setup 7.0.1 ya llama con POST y pide `^6.1.0`.

### De 5.x a 6.0

- Las rutas de suplantación piden sesión, y sólo suplanta quien pasa `laravel-auth.impersonate`. Entrar con el token responde JSON o redirige; ya no hay vista `laravel-auth::impersonate`.
- Las reglas de contraseña van en `password`, en la raíz de la configuración (antes `routes.password`, donde nunca se leían).
- `forgot-password` responde lo mismo exista o no la cuenta.
- `reset-password` con token inválido responde 422.
- `update-password` con la contraseña actual equivocada responde un error de validación en `old_password`, no `{ error }`.
- `email-verification-notification` responde `{ success, status }`.
- `create-token` no inicia sesión, responde 422 con credenciales inválidas y admite seis intentos por minuto.
- `revoke-token` dice en `revoked` si se revocó algo.
- Las redirecciones por omisión van a `/admin`, `/auth/login` y `/`.

Si publicaste la configuración, compárala con la del paquete.

## Problemas frecuentes

- **El login responde bien, pero la siguiente petición da 401.** El dominio o el puerto con el que navegas no coincide con `APP_URL`, `SANCTUM_STATEFUL_DOMAINS` o `SESSION_DOMAIN`, o falta `statefulApi()`. Ver [Solución de problemas](/ayuda/).
- **419 en un POST.** Falta la cookie `XSRF-TOKEN`: pide `GET /sanctum/csrf-cookie` antes y configura axios con `withXSRFToken`.
- **El enlace del correo de restablecer apunta a otro dominio.** Se construye con `APP_URL`, también cuando el correo sale desde una cola.
- **Registrarse guarda campos que no esperabas.** `register` pasa al modelo todo lo que llega salvo cuatro claves. Revisa que el `$fillable` del usuario no incluya columnas que no deba escribir un visitante.
- **Nadie puede suplantar.** El modelo no tiene `isAdmin()`, responde `false`, o el destino es otro administrador.
- **El token de suplantación responde 403.** Pasaron más de dos minutos, lo usa otra sesión, o la habilidad ya no lo permite.
- **El login social entra en una cuenta existente por el correo.** Actívalo sólo con proveedores que verifiquen el correo de sus usuarios, o decide tú con `$customLoginCallback`.
- **Cambiaste URIs o nombres y no se ven.** Con las rutas cacheadas, vuelve a ejecutar `php artisan route:cache`, y regenera `routes.json` con `php artisan route:json`.
- **Cambiar la contraseña cerraba la sesión** (antes de 6.0.3), y **el aviso de verificación salía a usuarios sin `MustVerifyEmail`** (antes de 6.0.2). Actualiza.
