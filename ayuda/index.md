# Solución de problemas

Cada problema, con su síntoma, su causa y cómo se arregla. Muchos se deben a una
versión antigua de un paquete: las versiones actuales están en
[Versiones y compatibilidad](/ayuda/versiones).

[[toc]]

## Sesión y acceso

### Cada tabla del administrador responde 401 después de iniciar sesión

**Síntoma.** El login funciona, pero cada tabla del administrador responde 401 y te
devuelve a la pantalla de acceso.

**Causa.** Sanctum no reconoce las peticiones como de la propia SPA y no acepta la
cookie de sesión. Pasa cuando:

- `APP_URL` no es la dirección con la que abres la aplicación, con su puerto;
- la dirección no está en `SANCTUM_STATEFUL_DOMAINS`, que por omisión cubre
  `localhost`, `127.0.0.1:8000` y el host de `APP_URL`;
- `SESSION_DOMAIN` no corresponde a esa dirección;
- falta `$middleware->statefulApi()` en `bootstrap/app.php`.

**Solución.**

```ini
# .env: la dirección exacta del navegador, con su puerto
APP_URL=http://127.0.0.1:8000
```

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})
```

```bash
php artisan config:clear
```

La aplicación base ya trae `statefulApi()`. En una aplicación propia, compruébalo.

### Dos aplicaciones en local se cierran la sesión una a otra

**Síntoma.** Iniciar sesión en una aplicación cierra la sesión de la otra.

**Causa.** Las dos corren en `127.0.0.1` con puertos distintos y comparten las
cookies.

**Solución.** Sirve la segunda en `localhost`, y pon esa dirección en su `APP_URL`:

```bash
php artisan serve --host=localhost --port=8001
```

### Las peticiones responden 419

**Síntoma.** Un POST, un PUT o un DELETE responde 419.

**Causa.** Falta la cookie CSRF o caducó. Desde axios 1.6, además, la cabecera
`X-XSRF-TOKEN` no se envía sin `withXSRFToken`, ni siquiera al mismo origen.

**Solución.** La interfaz de la aplicación base pide otra cookie a
`/sanctum/csrf-cookie` y repite la petición una vez. En un front propio:

```js
axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true

await axios.get('/sanctum/csrf-cookie')   // antes de iniciar sesión
```

Si sigue fallando, revisa `SESSION_DOMAIN` y `SANCTUM_STATEFUL_DOMAINS`: son la
razón habitual de que la sesión «no se quede».

### "Volver a mi cuenta" responde 405

**Síntoma.** Durante una suplantación, el botón para volver a la cuenta original
responde 405, o no hace nada y la sesión sigue suplantada.

**Causa.** laravel-auth 6.1.0 sólo acepta POST en `auth.revert.impersonate`: por GET,
otro sitio podía terminar la suplantación de un administrador con un `<img>`. Tu
interfaz sigue llamando con GET. Pasa en las aplicaciones creadas con laravel-setup
7.0.0 y en cualquier front propio.

**Solución.** Llama con POST y el token CSRF. La interfaz de la aplicación es tuya
desde que se instaló, así que actualizar laravel-setup no la cambia: edita el store
de sesión.

::: code-group

```js [Vue: stores/auth.js]
const revertImpersonation = async () => {
    await http.post(apiUrl(AUTH_ROUTES.revertImpersonation))
    // …
}
```

```js [React: stores/auth.js]
revertImpersonation: async () => {
    const { data } = await http.post(resolve('auth.revert.impersonate'))
    // …
},
```

```blade [Blade]
<form method="POST" action="{{ route('auth.revert.impersonate') }}">
    @csrf
    <button type="submit">Volver a mi cuenta</button>
</form>
```

:::

Ver [laravel-auth](/paquetes/laravel-auth).

### Cambiar la contraseña cierra la sesión

**Síntoma.** Después de cambiar la contraseña, la siguiente petición a la API responde
401.

**Causa.** laravel-auth anterior a 6.0.3 no renovaba la huella de la contraseña en la
sesión, y `AuthenticateSession` la daba por inválida.

**Solución.** `composer update innoboxrr/laravel-auth` a la 6.0.3 o posterior.

### Aparece el aviso de verificar el correo a quien no puede verificarlo

**Síntoma.** La interfaz pide verificar el correo a usuarios cuyo modelo no
implementa `MustVerifyEmail`.

**Causa.** laravel-auth anterior a 6.0.2 respondía `verified: false` a todo usuario
sin correo verificado.

**Solución.** Actualiza laravel-auth a la 6.0.2 o posterior.

### El administrador no ve la administración, o recibe 403

**Síntoma.** Con tu cuenta no aparece el grupo de administración del menú, una
pantalla responde 403, o un modelo nuevo no sale en el menú.

**Causa.** Alguna de estas:

- `ADMIN_EMAILS` está vacío o no tiene tu correo, así que `isAdmin()` devuelve
  `false`;
- la configuración está en caché y el cambio del `.env` no se ha leído;
- la ruta del modelo no tiene título, o tiene parámetros: el menú sólo lista las rutas
  de primer nivel con título y sin parámetros;
- la interfaz no se ha vuelto a compilar.

**Solución.**

```ini
# .env: separados por coma
ADMIN_EMAILS=tu@correo.com,otra@correo.com
```

```bash
php artisan config:clear
php artisan route:json
npm run build
```

Para restringir un modelo a los administradores, añade su ruta a `adminOnly`: el
nombre en Vue, el id en React. Ver [El administrador](/app-base/administrador).

### Un administrador recibe 403 al guardar las opciones del sitio

**Síntoma.** El editor del sitio no guarda: cada escritura responde 403.

**Causa.** laravel-options anterior a 2.1.0 nunca registraba su política.

**Solución.** Actualiza `innoboxrr/laravel-options` a la 2.1.0 o posterior.

### El editor del `.env` falla con "Route [login] not defined"

**Síntoma.** Abrir `/env-editor` sin sesión lanza «Route [login] not defined».

**Causa.** El middleware `auth` redirige a los invitados a una ruta llamada `login`, y
la aplicación no la tiene.

**Solución.** Di dónde está el acceso, como hace la aplicación base:

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->redirectGuestsTo('/auth/login');
})
```

## Rutas e interfaz

### La tabla sale vacía aunque la API devuelve datos

**Síntoma.** La petición del índice responde 200 con registros y la tabla no pinta
ninguno.

**Causa.** La tabla espera `data`, `meta` y `links` en la raíz de la respuesta. Sin
`JsonResource::withoutWrapping()` llega un `data` de más.

**Solución.**

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

### "Unknown backend route" o una petición a la página actual

**Síntoma.** La consola muestra
`Unknown backend route "x". Run php artisan route:json.`, o una petición va a la URL
de la página en la que estás.

**Causa.** La ruta no está en `routes.json`: se añadió un endpoint y no se volvió a
exportar, o `routes-to-json` escribe el archivo en otro sitio del que lee la
interfaz.

**Solución.**

```bash
php artisan route:json
npm run build
```

Comprueba `path` en `config/routes-to-json.php` (o `JSON_ROUTES_FILE`). La aplicación
base usa `resources/<ui>/routes.json`; el valor por omisión del paquete es
`resources/vue/assets/json/routes.json`. Para no olvidarlo:

```json
"build": "php artisan route:json && vite build"
```

### El administrador sale sin estilos

**Síntoma.** El módulo generado se ve sin ningún estilo.

**Causa.** En un módulo de paquete generado antes de LaraPack 7.7.1, `sideEffects` de
`resources/<ui>/package.json` no incluye `src/theme.js`, y Vite descarta el import
del tema y con él la hoja de estilos.

**Solución.**

::: code-group

```json [Vue]
"sideEffects": ["*.css", "*.vue", "src/theme.js"]
```

```json [React]
"sideEffects": ["*.css", "src/theme.js"]
```

:::

### El módulo falla con vue-router, Pinia o React Router

**Síntoma.** Errores de inyección, dos routers o stores vacíos al montar un módulo.

**Causa.** `npm install vue-router pinia` sin versión instala majors que el módulo no
declara (vue-router 5, Pinia 4). Y un módulo instalado desde una carpeta puede traer
su propia copia de cada uno.

**Solución.**

::: code-group

```bash [Vue]
npm install vue vue-router@4 pinia@3 @vitejs/plugin-vue
```

```bash [React]
npm install react react-dom react-router-dom@7 zustand@5 @vitejs/plugin-react
```

:::

```js
// vite.config.js
resolve: { dedupe: ['vue', 'vue-router', 'pinia'] },
```

### Los nombres del modelo y de sus campos salen en inglés

**Síntoma.** Los textos de LaraPack están en español, pero «Price», «Status» o
«Products» salen tal cual.

**Causa.** Es a propósito. LaraPack no puede saber cómo se llaman tu modelo y tus
campos en español: los deja con `""` en `src/locales/es.json`, y mientras lo estén se
ve la clave.

**Solución.** Tradúcelos en `resources/<ui>/src/locales/es.json` del módulo o en el
archivo de idioma de la aplicación (`resources/<ui>/app/lang/es.json` en la aplicación
base). Regenerar suma las claves que falten y nunca pisa una traducción escrita.

## Arranque, migraciones y caché

### `php artisan migrate` falla en una aplicación nueva con `CACHE_STORE=database`

**Síntoma.** En una aplicación Laravel 13 recién creada, `migrate` falla antes de
crear la tabla de la caché.

**Causa.** Varios proveedores leían la caché al arrancar, y con `CACHE_STORE=database`
—lo que trae Laravel 13— la tabla aún no existe. Además compartían las claves
`auth_policies` y `events_and_observers`, así que un paquete recibía los listeners de
otro.

**Solución.** Actualiza laravel-options 2.1.0, laravel-notifications 2.1.0,
laravel-uploads 2.1.x, laravel-audit 2.1.x, aws-file-manager 2.0.0 y support 2.1.1, y
regenera el proveedor de eventos de LaraPack (7.10 o posterior):

```bash
php vendor/bin/builder larapack:event-service-provider --dry-run
php vendor/bin/builder larapack:event-service-provider --force
```

Si lo editaste, `--force` lo conserva: quita a mano el
`Cache::remember('events_and_listeners', ...)` y recorre `discoverEvents()`
directamente.

### Las rutas de la aplicación se cargan dos veces, o los correos de verificación llegan duplicados

**Síntoma.** Rutas registradas dos veces, o dos correos de verificación por registro.

**Causa.** Versiones antiguas de los paquetes tenían proveedores que heredaban de los
`RouteServiceProvider` y `EventServiceProvider` de Laravel, y volvían a cargar las
rutas y los eventos de la aplicación.

**Solución.** Actualiza a las versiones para Laravel 13: laravel-options,
laravel-notifications, laravel-uploads, laravel-audit y laravel-env-editor 2.1.x,
aws-file-manager 2.0.0, locale-generator y routes-to-json 2.1.0, support 2.1.1 y
laravel-auth 6.0.1 o posterior.

### "Table already exists", o la misma migración de creación dos veces

**Síntoma.** `migrate` falla porque la tabla ya existe, y hay dos
`create_<tabla>_table` con horas distintas.

**Causa.** Antes de LaraPack 7.7.1, volver a importar duplicaba las migraciones de
creación.

**Solución.** Borra la más nueva y su entrada en `.larapack/manifest.json`, y actualiza
LaraPack: ya reutiliza las migraciones de creación, de metas y de pivotes.

### Cambié columnas en el JSON y no se escribió la migración de alteración

**Síntoma.** Reimportas tras cambiar una columna y no aparece
`<fecha>_alter_<tabla>_table.php`.

**Causa.** Alguna de estas:

- la migración de creación se editó a mano, y LaraPack no adivina lo escrito fuera
  del laraimport;
- el cambio es de una clave foránea, que sería quitarla y crearla con sus datos;
- la migración de creación no la generó LaraPack, como la de `users` de Laravel, y se
  omite;
- en una versión anterior regeneraste con `--force` la migración de creación de una
  tabla ya migrada: esa diferencia nunca llegó a la base y LaraPack ya no la ve.

**Solución.** Escribe esa migración a mano, una vez:

```bash
php artisan make:migration alter_products_table
```

La aplicación base ya añade `payload` y `softDeletes` a `users` con su propia
migración. Ver [Migraciones y cambios de esquema](/larapack/migraciones).

## Generación

### `larapack:verify` falla con `route-not-declared`

**Síntoma.** Después de quitar a mano acciones que sobraban, `verify` falla y la CI
también.

**Causa.** Existe una ruta, un método, una request o una vista de una acción que el
modelo no declara, o al revés: se borró a mano lo que el JSON sigue declarando.

**Solución.** Declara la forma real en `laraimport.json` y regenera:

```json
{ "name": "AuditEvent", "immutable": true, "routes": { "only": ["policies", "index", "show"] } }
```

```bash
php vendor/bin/builder larapack:import --dry-run
php vendor/bin/builder larapack:import --force
```

### La salida de `larapack:import --format=json` no se puede decodificar

**Síntoma.** Un agente o un script falla al leer el informe de la importación.

**Causa.** Antes de LaraPack 7.10.3, `larapack:import --format=json` escribía líneas de
progreso («Processing model: …») delante del documento.

**Solución.** Actualiza LaraPack a la 7.10.3 o posterior. Desde entonces la salida es
un único documento, también cuando algo falla.

### Lo generado queda sin formatear

**Síntoma.** `pint --test` falla en la CI sobre archivos que nadie editó.

**Causa.** El proyecto no tiene Pint en `vendor/laravel/pint` (o `LARAPACK_PINT`
apunta a un archivo que no existe): la importación lo avisa en texto y en JSON
`formatted` vale `null`. Un fallo del propio Pint no detiene la generación ni se
informa.

**Solución.**

```bash
composer require --dev laravel/pint
vendor/bin/pint
```

### `--force` no aplicó el cambio a un archivo

**Síntoma.** Regeneras con `--force` y un archivo sigue como estaba.

**Causa.** `--force` nunca sobrescribe un archivo editado a mano: lo conserva y lo
dice (`preserved`). Además, los traits `Relations`, `Storage` y `Operations` sólo se
crean si faltan, y los tests generados no se sobrescriben nunca.

**Solución.** Lleva el cambio a mano a cada archivo conservado. Si la edición no te
interesa, borra el archivo y vuelve a importar.

### En una aplicación, los tests generados fallan por namespaces o con 404

**Síntoma.** En una aplicación generada con LaraPack 7.10.0 fallan casi todos los
tests generados.

**Causa.** Las factories se generaban en `App\Database\Factories` y los tests en
`App\Tests`, que la aplicación no carga, y los tests llamaban a URIs sin `app/` y sin
sesión.

**Solución.**

1. Factories y modelos: `larapack:import --dry-run` y después
   `larapack:import --force`. En los editados, cambia `App\Database\Factories` por
   `Database\Factories`.
2. Tests: si no los tocaste, borra `tests/Feature/Models/<Modelo>EndpointsTest.php` y
   vuelve a importar. Si los editaste, cambia `App\Tests` por `Tests`, llama a
   `route('api.app.<modelo>.<acción>')` e inicia sesión antes de cada llamada.
3. Si LaraPack 7.10.0 creó `tests/TestCase.php` extendiendo
   `Orchestra\Testbench\TestCase`, bórralo y vuelve a importar.
4. Registra el `EventServiceProvider` en `bootstrap/providers.php`.

Ver la [guía de actualización](/larapack/actualizar).

## Exportaciones y archivos

### La exportación falla con «No hint path defined for [app]»

**Síntoma.** En una aplicación generada con LaraPack 7.10.0 o 7.10.1, cada exportación
falla al renderizar.

**Causa.** Pedía la vista `app::excel.<modelo>`, que nadie registra, y leía
`app.notification_via` y `app.export_disk` de la configuración de Laravel.

**Solución.** Regenera la exportación y su notificación:

```bash
php artisan larapack:import --dry-run
php artisan larapack:import --force
```

Si las editaste, cambia `config('app.excel_view', 'app::excel.')` por
`config('larapack.excel_view', 'excel.')`, y `app.notification_via` y
`app.export_disk` por `larapack.notification_via` y `larapack.export_disk`. Lleva esas
claves de `config/app.php` a `config/larapack.php` (`larapack:config` lo crea).

### La exportación termina pero nadie recibe el aviso

**Síntoma.** La exportación no da error y el archivo nunca llega.

**Causa.** Alguna de estas:

- en una aplicación, el `EventServiceProvider` no está en `bootstrap/providers.php`;
- `notification_via` incluye `database` y no existe la tabla de notificaciones;
- con `notification_via` en `['mail']`, el valor por omisión, el aviso va por correo:
  la aplicación tiene que poder enviarlo.

**Solución.**

```bash
php artisan larapack:event-service-provider   # y regístralo en bootstrap/providers.php
php artisan make:notifications-table
php artisan migrate
```

Y añade `database` a `notification_via` en `config/larapack.php` (o en la
configuración del paquete) si quieres el aviso en la campana.

### Subir un archivo responde 422 o falla

**Síntoma.** Subir un avatar u otro archivo responde 422, o falla al guardar.

**Causa.**

- El tipo no está permitido: laravel-uploads no admite SVG.
- Supera `max_size` (`LARAVEL_UPLOADS_MAX_SIZE`, 10240 KB por omisión).
- El disco por omisión de laravel-uploads es `s3`, y S3 no está configurado.

**Solución.** Sube un tipo permitido, ajusta el límite o el disco:

```ini
LARAVEL_UPLOADS_DISK=public
LARAVEL_UPLOADS_MAX_SIZE=10240
```

La aplicación base ya pone `LARAVEL_UPLOADS_DISK=public`.

### aws-file-manager responde 503 o 422

**Síntoma.** La API del gestor de archivos responde 503 siempre, o 422 al hacer
público un archivo.

**Causa.** Responde 503 hasta que el bucket y la región están configurados, y 422 al
pedir visibilidad pública en un bucket sin ACL (`AWS_FILE_MANAGER_USE_ACL=false`).

**Solución.**

```ini
AWS_BUCKET=mi-bucket
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
AWS_FILE_MANAGER_USE_ACL=false
```

## Windows y Composer

### Composer no resuelve paquetes para PHP 8.3, o resuelve distinto que la CI

**Síntoma.** En local, Composer no instala paquetes que piden PHP 8.3, o instala
versiones que la CI rechaza.

**Causa.** El `composer` del PATH de Laragon corre con PHP 8.2 y es Composer 2.8.x: no
instala paquetes sólo para PHP 8.3 y no bloquea los avisos de seguridad como la CI.

**Solución.** Ejecuta un `composer.phar` actualizado con el PHP 8.4:

```bash
"C:/laragon/bin/php/php-8.4/php.exe" composer.phar self-update
"C:/laragon/bin/php/php-8.4/php.exe" composer.phar update
```

(ajusta la ruta a tu instalación). En la aplicación base, pásaselo a `app:install`: un
`.phar` se ejecuta con el mismo PHP que Artisan.

```bash
php artisan app:install --composer=C:/ruta/composer.phar
```

### `install:api` no instaló Sanctum

**Síntoma.** Las rutas generadas fallan porque `auth:sanctum` no existe, aunque
ejecutaste `php artisan install:api`.

**Causa.** `install:api` usa el `composer` del PATH y, si falla, no lo dice.

**Solución.**

```bash
composer show laravel/sanctum     # ¿está?
composer require laravel/sanctum  # con el Composer y el PHP correctos
```

La aplicación base no usa `install:api`: publica las migraciones de Sanctum en
`app:install` y trabaja con `statefulApi()`.

### La suite falla en local con «could not find driver»

**Síntoma.** Los tests que usan la base de datos fallan en local y pasan en la CI.

**Causa.** El PHP local no tiene `pdo_sqlite`. La CI sí.

**Solución.** Sin tocar el `php.ini`:

```bash
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit
```

### Otros tropiezos en local

- **Con poca memoria**, `composer update` y PHPUnit de varios paquetes en paralelo se
  cortan. Ejecútalos de uno en uno.
- **Los heredocs de bash** estropean `\\` en los namespaces de PHP. Escribe los scripts
  PHP en un archivo con el editor.
- **`gh api` imprime el cuerpo de un 404** en la salida estándar. Comprueba el código de
  salida, no la salida.

## CI

### El workflow Release no arranca y no deja log

**Síntoma.** `Release` aparece como `startup_failure`, sin ningún paso ni log.

**Causa.** El `release.yml` no declara `permissions: contents: write`, y el permiso por
defecto del repositorio es de sólo lectura.

**Solución.**

```yaml
jobs:
    release:
        permissions:
            contents: write

        uses: innoboxrr/.github/.github/workflows/php-release.yml@main
```

### La CI no puede instalar `orchestra/testbench ^9`

**Síntoma.** `composer update` falla en la CI y en local funciona.

**Causa.** El Composer de la CI bloquea por omisión los paquetes con avisos de
seguridad, y todas las versiones de Laravel 11 los tienen. El Composer local es más
antiguo y resuelve.

**Solución.** Amplía la restricción:

```json
"orchestra/testbench": "^9.0 || ^10.0 || ^11.0"
```

Reprodúcelo con el log del job de la CI, no en local.

### Tests falla en la auditoría y no se publica

**Síntoma.** El paso «Auditar contra la línea base del ecosistema» falla, y `Release` no
publica.

**Causa.** Un hallazgo de nivel error: una restricción estrecha (`^7.10.2` frente a
`^7.10`), `version` en `composer.json`, falta un workflow o no hay tests.

**Solución.** Reprodúcelo en local y corrige:

```bash
php vendor/innoboxrr/larapack-generator/builder larapack:audit .
```

Para pedir un mínimo por encima de la línea base, usa
[`conflict`](/ci/#pedir-un-minimo-por-encima-de-la-linea-base-conflict).

### Arreglé el workflow compartido y la CI sigue fallando igual

**Síntoma.** Corregiste algo en `innoboxrr/.github`, relanzas la ejecución y falla con
el error de antes.

**Causa.** `gh run rerun` reutiliza la versión del workflow reutilizable de la
ejecución original.

**Solución.** Lanza una ejecución nueva: un push, o `workflow_dispatch` en los workflows
que lo tienen, como `Release`.

### `gh run view --log-failed` no muestra nada

**Síntoma.** El job falló y el comando no imprime log.

**Causa.** Los jobs de un workflow reutilizable anidado no salen en `--log-failed`.

**Solución.** Pide el log del job por la API:

```bash
gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion == "failure") | .databaseId'
gh api repos/<owner>/<repo>/actions/jobs/<job-id>/logs
```

### Un paquete con dependencias privadas no instala en la CI

**Síntoma.** `composer update` no encuentra un paquete privado.

**Causa.** Hace falta `COMPOSER_AUTH`, y `secrets: inherit` no cruza organizaciones: un
repositorio de otra organización que llama a un workflow de `innoboxrr` no le pasa el
secreto. Además, Composer necesita cada repositorio privado declarado como `vcs` en la
raíz, también los transitivos.

**Solución.**

```yaml
jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main
        secrets:
            COMPOSER_AUTH: ${{ secrets.COMPOSER_AUTH }}
```

### Faltan `tests/` o `.gitattributes` en un paquete extraído

**Síntoma.** Un paquete extraído de otro repositorio llega sin tests.

**Causa.** `git archive` respeta `export-ignore` y deja fuera, sin avisar, lo que el
`.gitattributes` marca.

**Solución.** No extraigas con `git archive`: copia el árbol de trabajo.

### Dos paquetes de dominio forman un ciclo de instalación

**Síntoma.** Composer no puede instalar dos paquetes que se nombran el uno al otro.

**Causa.** Los dos se declaran en `require` mutuamente.

**Solución.** En `require` sólo va lo que hace falta para cargar una clase: un trait, una
clase padre, una interfaz, una migración o un proveedor. Un modelo que sólo aparece en
una relación o en un servicio va en `suggest`.

### `npm publish` pide un código de un solo uso

**Síntoma.** El release de npm falla pidiendo OTP, justo después de firmar la
provenance.

**Causa.** Alguna de estas:

- hay un `NODE_AUTH_TOKEN` y npm se autentica con él en vez de con OIDC;
- el npm es anterior al soporte de OIDC;
- el trusted publisher no está configurado en npmjs.com para ese repositorio y
  `release.yml`;
- falta `id-token: write`.

**Solución.** Quita el token, usa `node-release.yml` (ya actualiza npm y declara
`id-token: write`) y configura el trusted publisher. Ver
[Publicar una versión](/ci/publicar#paquetes-npm).

### `npm install` falla en la CI con Vitest 4 y Vite 8.3

**Síntoma.** `npm install` revienta en Node 20 y 22 y funciona en Node 24.

**Causa.** Vitest 4 con Vite 8.3 no se instala con npm 10, el que traen Node 20 y 22.

**Solución.** Pasa a Vitest 5 y quita Node 20 de la matriz, como hicieron los paquetes
del ecosistema desde LaraPack 9.0: `vite ^8`, `vitest ^5`, `engines.node >=22.12` y
`node-versions: '["22", "24"]'`. Ver
[La cadena de pruebas de los paquetes npm](/ci/workflows#node).

### El release de npm terminó y `npm view` muestra la versión anterior

**Síntoma.** `Release` está en verde y el registro no lista la versión nueva.

**Causa.** El registro de npm puede tardar en listarla.

**Solución.** Espera, y comprueba en el log que el publish salió con provenance y que
existe el tag `v<versión>`. No vuelvas a publicar la misma versión.

## Pruebas

### Los tests de jsdom se quedan colgados al abrir un menú

**Síntoma.** Un test que abre un menú de `MenuComponent` o de un datatable no termina.

**Causa.** `@floating-ui/dom` real se cuelga en jsdom.

**Solución.** Simúlalo, como hacen los propios paquetes:

```js
vi.mock('@floating-ui/dom', () => ({
    autoUpdate: vi.fn((reference, floating, update) => {
        update()

        return () => {}
    }),
    computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
    flip: vi.fn(),
    offset: vi.fn(),
    shift: vi.fn(),
}))
```

### Un diálogo o un menú no se comporta igual en jsdom

**Síntoma.** En los tests, un diálogo no queda por encima o un popover no se abre como
en el navegador.

**Causa.** jsdom no tiene `showModal()` ni la Popover API. Los componentes caen en los
atributos `open` y `hidden`.

**Solución.** Comprueba esos atributos en los tests y el comportamiento real en un
navegador.

### Pruebas automatizadas en un navegador real

- **Los elementos de un menú popover oculto no responden a clics lanzados por script.**
  Usa clics reales del ratón.
- **Varias tandas de acciones lanzadas a la vez pierden pulsaciones de teclado.** Lánzalas
  de una en una.
