# Requisitos

## Software

| Qué | Versión | Por qué |
|---|---|---|
| PHP | 8.3 o superior | Lo piden Laravel 13 y todos los paquetes del ecosistema. |
| Laravel | 13 | El código generado usa lo de Laravel 13: `casts()`, atributos `#[UsePolicy]`, controladores con `HasMiddleware`. |
| Composer | 2 | |
| Node | 20.19 o superior en la rama 20, o 22.12 o superior | Lo que exige Vite. |
| npm | 10 o superior | |
| Base de datos | La que uses con Laravel | La aplicación base guarda la sesión en la base de datos (`SESSION_DRIVER=database`). |

Para correr tests con SQLite en memoria (los de un paquete generado lo hacen) PHP necesita las extensiones `pdo_sqlite` y `sqlite3`. Sin ellas los tests fallan con «could not find driver».

## Las versiones del ecosistema

Una aplicación creada hoy con la aplicación base pide estas versiones. Si montas el ecosistema a mano, usa las mismas.

::: details Paquetes de Composer
| Paquete | Restricción |
|---|---|
| `innoboxrr/larapack-generator` (desarrollo) | `^7.10` |
| `innoboxrr/laravel-setup` (desarrollo) | `^7.0` |
| `innoboxrr/laravel-auth` | `^6.1.0` |
| `innoboxrr/laravel-options` | `^2.1` |
| `innoboxrr/laravel-notifications` | `^2.1` |
| `innoboxrr/laravel-uploads` | `^2.1` |
| `innoboxrr/laravel-audit` | `^2.1` |
| `innoboxrr/laravel-env-editor` | `^2.1` |
| `innoboxrr/aws-file-manager` | `^2.0` |
| `innoboxrr/locale-generator` | `^2.1` |
| `innoboxrr/routes-to-json` | `^2.1` |
| `innoboxrr/search-surge` | `^3.0` |
| `innoboxrr/support` | `^2.1` |
| `innoboxrr/traits` | `^2.1` |
| `laravel/sanctum` | `^4.3` |
| `maatwebsite/excel` | `^4.0` |
| `opcodesio/log-viewer` | `^3.24` |
:::

::: details Paquetes de npm
| Paquete | Vue | React |
|---|---|---|
| Framework | `vue ^3.5` | `react ^19`, `react-dom ^19` |
| Router | `vue-router ^4.5` | `react-router-dom ^7` |
| Estado | `pinia ^3` | `zustand ^5` |
| Componentes de formulario | `innoboxrr-form-elements ^6.7` | `innoboxrr-react-form-elements ^3.7` |
| Tabla | `innoboxrr-vue-datatable ^3.1` | `innoboxrr-react-datatable ^3.1` |
| Tema, avisos, iconos | `innoboxrr-form-core ^2.8` | `innoboxrr-form-core ^2.8` |
| Peticiones | `innoboxrr-http-request ^2.0` | igual |
| Rutas por nombre | `innoboxrr-route-resolver ^2.0` | igual |
| Traducciones | `innoboxrr-i18n ^1.2` | igual |
| Validación | `innoboxrr-js-validator ^2.0` | igual |
| Compilación | `vite ^8`, `@vitejs/plugin-vue ^6` | `vite ^8`, `@vitejs/plugin-react ^6` |
:::

::: warning Instala el router y el estado con su versión
`npm install vue-router pinia` sin versión instala hoy majors que el módulo generado no acepta. Escribe `vue-router@4 pinia@3`, o `react-router-dom@7 zustand@5`.
:::

## `APP_URL`, Sanctum y las cookies

El administrador llama a la API con la cookie de sesión de Laravel, a través de Sanctum. Sanctum sólo trata como sesión las peticiones que llegan desde un dominio de `SANCTUM_STATEFUL_DOMAINS`. Si no defines esa variable, la lista es:

```
localhost, localhost:3000, 127.0.0.1, 127.0.0.1:8000, ::1, y el host de APP_URL con su puerto
```

::: danger APP_URL tiene que ser la dirección con la que abres la aplicación
Con el host **y el puerto**. Si abres la aplicación desde una dirección que no está en la lista, el login responde bien pero cada tabla del administrador responde 401 y te devuelve al login.
:::

| Cómo abres la aplicación | `APP_URL` |
|---|---|
| `composer run dev` o `php artisan serve` | `http://127.0.0.1:8000` |
| Un host local de Laragon o Valet | `http://mi-app.test` |
| Otro puerto | `http://127.0.0.1:8001`, con el puerto |

Dos cosas más:

- **`SESSION_DOMAIN`**: en local déjalo en `null`. Un dominio que no coincide con el que abres hace que la cookie no se guarde: el login parece funcionar y la sesión no llega.
- **Dos aplicaciones en `127.0.0.1` con puertos distintos comparten cookies** y se cierran la sesión una a otra. Abre la segunda en `localhost`.

## Correo

Recuperar la contraseña envía un correo, y la exportación a Excel avisa por correo con un enlace firmado. En local, `MAIL_MAILER=log` (el valor de una aplicación recién creada) los escribe en `storage/logs/laravel.log`.

## Windows y Laragon

- **El `composer` del PATH puede correr con otro PHP.** El de Laragon puede ser PHP 8.2, que no resuelve paquetes que piden 8.3. Usa un `composer.phar` con el PHP correcto:

  ```bash
  php composer.phar update
  php artisan app:install --composer=C:/ruta/a/composer.phar
  ```

  `app:install` lanza un `.phar` con el mismo PHP que ejecuta artisan.
- **`php artisan install:api` usa el `composer` del PATH y, si falla, no lo dice.** Compruébalo después:

  ```bash
  composer show laravel/sanctum
  ```

## Para un agente de IA

El agente necesita una terminal donde ejecutar `php artisan`, `composer` y `npm`, y acceso de escritura al proyecto. Cada paso del ciclo devuelve un código de salida, y `validate`, `import` y `verify` aceptan `--format=json`. Ver [Preparar el proyecto](/ia/preparar).
