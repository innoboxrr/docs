# laravel-auth

`innoboxrr/laravel-auth` **6.1.0** handles authentication for a Laravel 13 application with a SPA in front:

- signing in and out, and registering;
- password recovery and change, and email verification;
- Sanctum tokens for integrations;
- social login through Socialite;
- impersonating another user.

Every route answers JSON when the request asks for it (`Accept: application/json`) and redirects when it doesn't, so it serves a SPA and a Blade form equally well.

It is the backend behind the base application's authentication screens, in Vue and in React.

::: warning Since 6.1, leaving an impersonation is a POST
`auth.revert.impersonate` no longer accepts GET. A GET changed the session's account, and another site could trigger it with an `<img>` without going through the CSRF token. See [Upgrading](#upgrading).
:::

## Install

```bash
composer require innoboxrr/laravel-auth
php artisan install:api
```

It requires PHP `^8.3`, `illuminate/support ^13.0`, `laravel/sanctum ^4.0` and `laravel/socialite ^5.16`.

Routes register themselves under `/auth`, in the `web` group, with `auth.*` names. What the package expects from the application:

- **Sanctum in SPA mode.** Call `$middleware->statefulApi()` in `bootstrap/app.php` so the SPA uses the session cookie. `install:api` uses the `composer` on your PATH and fails silently, so check with `composer show laravel/sanctum`.
- **A user with `HasApiTokens` and `Notifiable`.** If it implements `MustVerifyEmail`, the verification email is sent on registration. If it defines `isAdmin()`, that user can impersonate others.
- **Laravel's tables.** The package needs `users` and `password_reset_tokens`, which Laravel's initial migration creates. If you use tokens, it also needs Sanctum's `personal_access_tokens`.

::: tip The base application does not run install:api
`app:install` only publishes Sanctum's migrations (`vendor:publish --tag=sanctum-migrations`), and `bootstrap/app.php` already calls `statefulApi()`. No `routes/api.php` is needed.
:::

## Configuration

Published to `config/laravel-auth.php`.

| Key | Default | What it decides |
|---|---|---|
| `user-class` | `App\Models\User` | The model used by registration, tokens, social login and impersonation |
| `allow-registration` | `true` | With `false`, `register` answers 403 |
| `allow-impersonate` | `true` | With `false`, the three impersonation routes answer 403. Even when `true`, only users who pass the `laravel-auth.impersonate` ability can impersonate |
| `password.length` | `8` | Minimum length of a new password |
| `password.uppercase` | `false` | Require an uppercase letter |
| `password.number` | `false` | Require a digit |
| `frontend.reset-password` | `auth/reset-password/{token}/{email}` | The application screen the reset email links to. The email is URL-encoded |
| `routes.active` | `true` | With `false`, no route is registered |
| `routes.as` | `auth.` | Route name prefix |
| `routes.prefix` | `auth` | URI prefix |
| `routes.uris.*` | see [HTTP routes](#http-routes) | The URI of each action |
| `routes.names.*` | see [HTTP routes](#http-routes) | The name of each action, without the prefix |
| `routes.middlewares.*` | see [HTTP routes](#http-routes) | The middleware of each action |
| `routes.redirects.*` | see below | Where each action redirects when the request doesn't ask for JSON |

Password rules apply when registering, resetting and changing a password, and the message names the rule that failed. A configuration published before 6.0 that still keeps them under `routes.password` is still honoured.

::: details Default redirects (`routes.redirects`)
| Action | Target |
|---|---|
| `login`, `register`, `update-password`, `email-verification-notification`, `verification-verify`, `socialite-callback`, `impersonate-token`, `revert-impersonate` | `/admin` |
| `reset-password` | `/auth/login` |
| `logout`, `get-auth`, `create-token`, `tokens`, `revoke-token`, `flush-tokens`, `impersonate` | `/` |
| `socialite-redirect` | `/` (in practice Socialite redirects to the provider) |

Without JSON, `forgot-password` and `flush-tokens` go back to the previous page with the message in the session. `impersonate` always answers JSON.
:::

## Environment variables

The package reads no variables of its own. These affect it:

| Variable | Read by | Why it matters |
|---|---|---|
| `APP_URL` | `url()` in the emails | Reset and verification links are built from it |
| `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN` | Sanctum and the session | If the SPA's domain is missing, login succeeds but the session doesn't reach the next request |
| Each social provider's credentials | `config/services.php` | A provider without an entry there answers 404 |

The verification link lifetime is `auth.verification.expire` in `config/auth.php` (60 minutes by default).

## Publishing

| Tag | What it copies |
|---|---|
| `laravel-auth-config` (or `config`) | `config/laravel-auth.php` |

```bash
php artisan vendor:publish --tag=laravel-auth-config
```

Translations are not published. Messages are English keys and the package ships `lang/es.json`. To change one, add the key to the application's `lang/<locale>.json`.

## Migrations

The package ships no migrations. It uses `users`, `password_reset_tokens` and, for tokens, Sanctum's `personal_access_tokens`.

## Commands

It registers no commands.

## HTTP routes

All routes live in the `web` group (session and CSRF), under the `/auth` prefix, with `auth.*` names. A POST without a CSRF token answers 419. Validation errors look like any FormRequest's: 422 with `{ message, errors }`.

| Method | URI | Name | Middleware | Fields | JSON response |
|---|---|---|---|---|---|
| POST | `/auth/login` | `auth.login` | `guest` | `email`, `password`, `remember` (optional boolean) | `{ success, user }`. 422 on `email` for bad credentials, and after 5 attempts per email and IP |
| POST | `/auth/register` | `auth.register` | `guest` | `name` (max 255), `email` (unique in the user table), `password`, `password_confirmation` | `{ success, user }`. 403 when `allow-registration` is `false` |
| POST | `/auth/logout` | `auth.logout` | `auth:sanctum` | — | `{ success }` |
| GET | `/auth/get-auth` | `auth.get.auth` | — | — | `{ user, authenticated, is_admin, verified, impersonating }` |
| POST | `/auth/forgot-password` | `auth.forgot.password` | `guest` | `email` | `{ success, message }`, whether or not the account exists |
| POST | `/auth/reset-password` | `auth.reset.password` | `guest` | `token`, `email`, `password`, `password_confirmation` | `{ success, message }`. 422 on `email` for an invalid token |
| POST | `/auth/update-password` | `auth.update.password` | `auth:sanctum` | `old_password`, `password`, `password_confirmation` | `{ success, message }`. 422 on `old_password` when it isn't the current one |
| POST | `/auth/email-verification-notification` | `auth.email.verification.notification` | `auth:sanctum`, `throttle:6,1` | — | `{ success, status }` with `verification-link-sent` or `already-verified` |
| GET | `/auth/email/verify/{id}/{hash}` | `auth.verification.verify` | `auth:sanctum`, `signed`, `throttle:6,1` | — | `{ verified }` |
| POST | `/auth/create-token` | `auth.create.token` | `throttle:6,1` | `email`, `password`, `name` (max 255), `abilities` (optional list), `expires_at` or `expiration_date` (optional future date) | `{ token }`. 422 on `email` for bad credentials |
| POST | `/auth/tokens` | `auth.tokens` | `auth:sanctum` | — | `{ tokens }` |
| POST | `/auth/revoke-token` | `auth.revoke.token` | `auth:sanctum` | `token_id` | `{ revoked }`: only revokes your own tokens |
| POST | `/auth/flush-tokens` | `auth.flush.tokens` | `auth:sanctum` | — | `{ success, message }` |
| GET | `/auth/social/{provider}/redirect` | `auth.socialite.redirect` | `guest` | — | Redirects to the provider. 404 if it isn't in `config/services.php` |
| GET | `/auth/social/{provider}/callback` | `auth.socialite.callback` | `guest` | — | Signs into the account matching the provider's email, or creates it, and redirects |
| POST | `/auth/impersonate` | `auth.impersonate` | `auth:sanctum` | `target_user_id` (must exist) | `{ token, url }` |
| GET | `/auth/impersonate/{token}` | `auth.impersonate.token` | `auth:sanctum` | — | `{ success, user }` or a redirect |
| POST | `/auth/revert-impersonate` | `auth.revert.impersonate` | `auth:sanctum` | — | `{ success, user }` or a redirect |

Details that change behaviour:

- **`login` and `register` regenerate the session.** That is why the SPA requests `GET /sanctum/csrf-cookie` before the POST. `register` stores everything it receives except `password_confirmation`, `_token`, `remember` and `redirect`: the model's `$fillable` decides what it accepts. It hashes the password once, fires `Registered` and signs the user in.
- **`get-auth` uses the Sanctum guard**, which accepts both the session and a token. `verified` is `true` for a user whose model does not implement `MustVerifyEmail`.
- **`update-password` refreshes the password hash stored in the session.** Without that, `AuthenticateSession` signed the user out on the next request. It fires `PasswordReset`, like `reset-password`.
- **`create-token` does not sign in.** Use the token as `Authorization: Bearer <token>` on `auth:sanctum` routes. Without `abilities` it is created with `['*']`.
- **The verification link is a temporary signed route** that requires a session, so whoever opens it in another browser has to sign in first.

### Impersonating a user

1. `POST /auth/impersonate` with `target_user_id` returns `{ token, url }`. The token encrypts who asked, for whom, and when.
2. Visiting `url` signs in as that user. The token only works for whoever requested it, for 120 seconds, and only if they can still impersonate that user; otherwise it answers 403. The session stores `impersonate_token`, and `get-auth` answers `impersonating: true`.
3. `POST /auth/revert-impersonate`, with the CSRF token, returns to the original account. It signs the user out and answers `{ success: false, user: null }` in either of these cases:
   - more than 7200 seconds (two hours) have passed since the token was requested;
   - the original account no longer exists.

   Without `impersonate_token` in the session it answers 403.

```js
// axios sends X-XSRF-TOKEN from the XSRF-TOKEN cookie
axios.defaults.withXSRFToken = true

await axios.post('/auth/revert-impersonate')
```

```blade
<form method="POST" action="{{ route('auth.revert.impersonate') }}">
    @csrf
    <button>Back to my account</button>
</form>
```

## Policies and gates

The package defines one ability: **`laravel-auth.impersonate`**, with the signature `($user, ?$target = null)`. By default it allows impersonation when:
- the user has `isAdmin()` and it returns `true`;
- with no target, that is enough;
- with a target, the target is neither the user themselves nor another admin.

It is only defined if the application hasn't defined it first. For a different rule, redefine it from an application provider, for example in `AppServiceProvider::boot()`:

```php
Gate::define('laravel-auth.impersonate', fn ($user, $target = null) => $user->hasRole('support'));
```

## Extension points

```php
use Innoboxrr\LaravelAuth\Http\Requests\Auth\GetAuthRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Auth\RegisterRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Impersonate\ImpersonateRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Impersonate\ImpersonateTokenRequest;
use Innoboxrr\LaravelAuth\Http\Requests\Socialite\CallbackRequest;

// Replaces the registration rules. It replaces all of them: include email and password.
RegisterRequest::setCustomRulesCallback(fn (RegisterRequest $request) => [/* ... */]);

// Replaces the whole get-auth response. Receives the Sanctum user or null.
GetAuthRequest::$customGetAuthCallback = fn ($user) => response()->json([/* ... */]);

// Social login: you sign the user in and respond.
CallbackRequest::$customLoginCallback = fn ($user, string $provider, $providerUser) => /* ... */;
CallbackRequest::$customRegisterCallback = fn ($providerUser, string $provider) => /* ... */;

// Replaces entirely who may request an impersonation token.
ImpersonateRequest::authorizeUsing(fn (ImpersonateRequest $request) => /* bool */);
ImpersonateRequest::setCustomRulesCallback(fn (ImpersonateRequest $request) => [/* ... */]);

// Replaces the ability check when the token is used.
// Expiry and "used by whoever requested it" are still checked.
ImpersonateTokenRequest::authorizeUsing(fn (ImpersonateTokenRequest $request) => /* bool */);
```

Register these callbacks in an application provider's `boot()`. Impersonation stays closed when `allow-impersonate` is `false` or there is no session, even if you define `authorizeUsing`.

The package also fires Laravel's `Registered`, `PasswordReset`, `Verified` and `Lockout` events. Listen to them for anything that should happen after each flow.

For social login, declare the provider in `config/services.php`:

```php
'github' => [
    'client_id' => env('GITHUB_CLIENT_ID'),
    'client_secret' => env('GITHUB_CLIENT_SECRET'),
    'redirect' => '/auth/social/github/callback',
],
```

## In the base application

The base application requires `innoboxrr/laravel-auth ^6.1.0`. In Vue (Pinia) and in React (Zustand), `stores/auth.js` resolves every call by route name:

| Screen or action | Route |
|---|---|
| Boot, and after signing in, registering or leaving an impersonation | `auth.get.auth` |
| `/auth/login` | `GET /sanctum/csrf-cookie`, then `auth.login` |
| `/auth/register` | CSRF cookie, then `auth.register` |
| User menu, "Sign out" | `auth.logout` |
| `/auth/forgot-password` | `auth.forgot.password` |
| `/auth/reset-password/:token/:email`, the `frontend.reset-password` URL | `auth.reset.password` |
| `/admin/profile`, password card | `auth.update.password` |
| Verification banner, when `verified === false` | `auth.email.verification.notification` |
| Impersonation banner, "Back to my account" | `auth.revert.impersonate` via POST |

- **Who is an admin.** `ADMIN_EMAILS` fills `config('auth.admins')`. The `isAdmin()` on the user LaraPack generates reads it, and that drives both `is_admin` in `get-auth` and the impersonation ability.
- **Guests.** `bootstrap/app.php` sends users without a session to `/auth/login` (`redirectGuestsTo`), because the application has no Laravel `login` route.
- **Not used by the interfaces:**
  - **Tokens.** No screen requests them.
  - **Social login.** `app:setup` writes `VITE_GOOGLE_LOGIN`, `VITE_FACEBOOK_LOGIN` and `VITE_MICROSOFT_LOGIN` to `.env`, but no interface file reads them, so there are no buttons.
  - **Starting an impersonation.** The banner and "Back to my account" exist, but no screen calls `auth.impersonate`. If you want it, add the action yourself, for example on a user row.

See [Authentication and users](/en/app-base/auth).

## Upgrading

### From 6.0 to 6.1

- **`revert-impersonate` only accepts POST.** Change every call from GET to POST with the CSRF token. An `<a href="/auth/revert-impersonate">` link has to become a form or a button that sends the POST.
- The `auth.revert.impersonate` name, the URI, the middleware and the responses are unchanged.
- A GET you missed no longer returns to the original account, and the session stays as it was. It answers 405, or the application's fallback route handles it if there is one. In the base application the fallback handles it: 404 when the request asks for JSON, and the SPA view otherwise.
- If you use the base application, laravel-setup 7.0.1 already calls it with POST and requires `^6.1.0`.

### From 5.x to 6.0

- Impersonation routes require a session, and only users who pass `laravel-auth.impersonate` can impersonate. Signing in with the token answers JSON or redirects; the `laravel-auth::impersonate` view is gone.
- Password rules live under `password`, at the root of the configuration. Before, they were under `routes.password`, where they were never read.
- `forgot-password` answers the same whether or not the account exists.
- `reset-password` with an invalid token answers 422.
- `update-password` with the wrong current password answers a validation error on `old_password`, not `{ error }`.
- `email-verification-notification` answers `{ success, status }`.
- `create-token` doesn't sign in, answers 422 on bad credentials, and allows six attempts per minute.
- `revoke-token` reports in `revoked` whether anything was revoked.
- Default redirects go to `/admin`, `/auth/login` and `/`.

If you published the configuration, compare it with the package's.

## Pitfalls

- **Login succeeds, but the next request gets 401.** The host or port you browse doesn't match `APP_URL`, `SANCTUM_STATEFUL_DOMAINS` or `SESSION_DOMAIN`, or `statefulApi()` is missing. See [Troubleshooting](/en/help/).
- **419 on a POST.** The `XSRF-TOKEN` cookie is missing. Request `GET /sanctum/csrf-cookie` first, and configure axios with `withXSRFToken`.
- **The reset email links to the wrong domain.** Links are built from `APP_URL`, including when the email is sent from a queue.
- **Registration stores fields you didn't expect.** `register` passes everything it receives to the model except four keys. Make sure the user's `$fillable` doesn't include columns a visitor shouldn't write.
- **Nobody can impersonate.** Either the model has no `isAdmin()`, it returns `false`, or the target is another admin.
- **The impersonation token answers 403.** More than two minutes have passed, another session is using it, or the ability no longer allows it.
- **Social login signs into an existing account by email.** Enable it only with providers that verify their users' email addresses, or decide yourself with `$customLoginCallback`.
- **You changed URIs or names and nothing happens.** If routes are cached, run `php artisan route:cache` again, then regenerate `routes.json` with `php artisan route:json`.
- **Changing the password signed the user out** before 6.0.3, and **the verification banner showed for users without `MustVerifyEmail`** before 6.0.2. Upgrade.
