# Los workflows

La definición de cómo se prueba y se publica un paquete vive **una sola vez**, en
los workflows reutilizables de `innoboxrr/.github`, y cada repositorio los llama.
Antes ese archivo estaba copiado en cada repositorio, y copiar no es compartir:
cuando había que corregir algo, o se tocaban los quince, o quedaban quince
variantes.

| Repositorio | `tests.yml` llama a | `release.yml` llama a |
|---|---|---|
| Paquete Composer | `php-tests.yml` | `php-release.yml` |
| Paquete npm | `node-tests.yml` | `node-release.yml` |

Todos se referencian con `@main`:
`uses: innoboxrr/.github/.github/workflows/php-tests.yml@main`.

## `php-tests.yml`

```yaml
# .github/workflows/tests.yml
name: Tests

on:
    push:
        branches: [main, master]
    pull_request:

jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main
```

El `name: Tests` importa: `release.yml` espera a un workflow que se llame así.

### Entradas

| Entrada | Tipo | Por omisión | Qué hace |
|---|---|---|---|
| `php-versions` | string (array JSON) | `'["8.3", "8.4"]'` | Versiones de PHP de la matriz |
| `audit` | boolean | `true` | Ejecutar `larapack:audit` contra el paquete |
| `extensions` | string | `''` | Extensiones de PHP adicionales, separadas por coma |
| `tests-required` | boolean | `true` | Fallar si no hay una suite ejecutable. En `false`, un paquete sin tests pasa con instalar y compilar |
| `COMPOSER_AUTH` (secreto) | opcional | — | JSON de autenticación de Composer, para dependencias privadas declaradas como repositorio `vcs` |

```yaml
jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main
        with:
            php-versions: '["8.3", "8.4", "8.5"]'
            extensions: 'pdo_sqlite, sqlite3'
        secrets:
            COMPOSER_AUTH: ${{ secrets.COMPOSER_AUTH }}
```

### Qué hace, en orden

Una ejecución por versión de PHP (`fail-fast: false`):

1. **Instala** con `composer update --prefer-dist --no-interaction --no-progress`.
   `update` y no `install`: los paquetes son librerías y no versionan el lockfile,
   así que la suite corre contra lo que de verdad resolverá quien los instale.
2. **Sintaxis:** `php -l` sobre cada archivo de `src/`. Es la puerta mínima que les
   queda a los paquetes sin suite.
3. **Versiones resueltas** de `illuminate/support` y `phpunit/phpunit`, para el log.
4. **Auditoría** (si `audit` es `true`):
   - con LaraPack 7 o posterior en `vendor/`, ejecuta
     `php vendor/innoboxrr/larapack-generator/builder larapack:audit .`;
   - con un LaraPack anterior, sin `larapack:audit`, avisa y no audita;
   - en el propio LaraPack, ejecuta `php builder larapack:audit .`;
   - sin LaraPack, avisa y no audita.
5. **Tests:** `vendor/bin/phpunit` si hay PHPUnit, su configuración y al menos un
   `*Test.php`. Si no, falla, o sólo avisa con `tests-required: false`.

::: warning Atención
**La auditoría sólo corre si LaraPack está instalado en `vendor/`**, en `require` o
en `require-dev`. Y sólo en los repositorios cuyo `tests.yml` llama a
`php-tests.yml`: `innoboxrr/traits` e `innoboxrr/search-surge` tienen su propia
matriz y hoy no pasan por la auditoría en la CI.
:::

## `php-release.yml`

```yaml
# .github/workflows/release.yml
name: Release

on:
    workflow_run:
        workflows: ['Tests']
        types: [completed]
        branches: [main, master]
    workflow_dispatch:

jobs:
    release:
        permissions:
            contents: write

        uses: innoboxrr/.github/.github/workflows/php-release.yml@main
```

| Entrada | Por omisión | Qué hace |
|---|---|---|
| `php-version` | `'8.4'` | PHP con el que corre el job |

Qué hace:

1. **Sólo corre** si se lanzó a mano (`workflow_dispatch`) o si `Tests` terminó con
   éxito.
2. Hace checkout del commit que probó `Tests` (`workflow_run.head_sha`) con todo el
   historial.
3. **Lee la versión de `VERSION`**, sin espacios ni saltos de línea. Sólo si no hay
   `VERSION` la busca en la clave `version` de `composer.json`; si no hay ninguna,
   falla.
4. **Si el tag ya existe, no hace nada.**
5. Crea el tag **sin prefijo `v`** (`7.10.3`) y lo empuja. Packagist publica al
   recibirlo.

::: danger Peligro
**`permissions: contents: write` va en el `release.yml` de cada repositorio.** El
reutilizable necesita ese permiso para empujar el tag, y un repositorio cuyo
permiso por defecto sea de sólo lectura no puede concedérselo. Eso no hace fallar
el job: hace fallar el arranque del workflow entero (`startup_failure`), sin log y
sin explicación.
:::

::: info Nota
El comentario de cabecera de `php-release.yml` dice que «la versión la declara
composer.json». No es así: manda `VERSION`, y la clave `version` de `composer.json`
es sólo un último recurso que `larapack:audit` marca como error
(`composer-version`). Usa `VERSION`.
:::

## `node-tests.yml`

```yaml
# .github/workflows/tests.yml
name: Tests

on:
    push:
        branches: [master]
    pull_request:

jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/node-tests.yml@main
```

| Entrada | Por omisión | Qué hace |
|---|---|---|
| `node-versions` | `'["20", "22", "24"]'` | Versiones de Node de la matriz. Los paquetes del ecosistema pasan `'["22", "24"]'`: ver [la cadena de pruebas](#node) |
| `working-directory` | `'.'` | Directorio del paquete, si no es la raíz |

Por cada versión de Node: checkout, `npm install --no-audit --no-fund` (sin lockfile,
por el mismo motivo que Composer) y `npm test`.

## `node-release.yml`

```yaml
# .github/workflows/release.yml
name: Release

on:
    workflow_run:
        workflows: ['Tests']
        types: [completed]
        branches: [master]
    workflow_dispatch:

jobs:
    release:
        uses: innoboxrr/.github/.github/workflows/node-release.yml@main
        secrets: inherit
```

| Entrada | Por omisión | Qué hace |
|---|---|---|
| `working-directory` | `'.'` | Directorio del paquete |

Qué hace, con `permissions: contents: write` e `id-token: write`:

1. Sólo corre tras un `Tests` en verde o a mano.
2. Node 22 con el registro de npm, y **`npm install -g npm@latest`**: el npm que trae
   Node 22 es anterior al soporte de OIDC.
3. Lee la versión de `package.json`. Si el tag `v<versión>` ya existe, no hace nada.
4. `npm install`, `npm test`, y **`npm publish --provenance --access public` sin
   `NODE_AUTH_TOKEN`**.
5. Crea y empuja el tag `v<versión>`.

La publicación usa trusted publishing; los requisitos están en
[Publicar una versión](/ci/publicar#paquetes-npm).

## Trabajos que añade cada repositorio

### `quality`: Pint y Larastan

Los paquetes que crea `larapack:new`, y el propio LaraPack, añaden a `tests.yml` un
trabajo que comprueba formato y tipos. No depende de la versión de PHP, así que
corre una vez:

```yaml
jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/php-tests.yml@main

    quality:
        name: Pint y Larastan
        runs-on: ubuntu-latest

        steps:
            - uses: actions/checkout@v5

            - uses: shivammathur/setup-php@v2
              with:
                  php-version: '8.4'
                  coverage: none

            - name: Instalar dependencias
              run: composer update --prefer-dist --no-interaction --no-progress

            - name: Formato
              run: vendor/bin/pint --test

            - name: Análisis estático
              run: vendor/bin/phpstan analyse --no-progress --memory-limit=1G
```

Con su configuración:

::: code-group

```json [pint.json]
{
    "preset": "laravel"
}
```

```yaml [phpstan.neon.dist]
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    level: 5
    paths:
        - src
        - database
    # Larastan conoce las columnas de cada modelo leyendo sus migraciones.
    databaseMigrationsPath:
        - database/migrations
    # Los casts van en el método casts(); sin esto Larastan no sabe que payload es un array.
    parseModelCastsMethod: true
```

:::

Lo que genera LaraPack sale formateado y pasa ese análisis, así que **un fallo aquí
es algo escrito a mano**: `vendor/bin/pint` lo formatea.

Para añadirlo a un paquete que ya existe:

```bash
composer require --dev laravel/pint larastan/larastan
# copia pint.json, phpstan.neon.dist y el trabajo quality de un paquete recién creado
vendor/bin/pint
git commit -am "Formatear con Pint"
```

Formatear todo de una vez, en su propio commit, deja limpio el historial del resto
de cambios.

LaraPack prueba además PHP 8.5 (`php-versions: '["8.3", "8.4", "8.5"]'`): en 8.3 se
resuelve `symfony/console` 7.4 y en 8.4 o superior la 8.x, con firmas distintas en
`Command::configure()`.

### `verify`: LaraPack verify {#verify}

Desde LaraPack 9.1, los paquetes que crea `larapack:new` traen en `tests.yml` un
tercer trabajo que corre el contrato de LaraPack con `--strict`:

```yaml
    verify:
        name: LaraPack verify
        runs-on: ubuntu-latest

        steps:
            - uses: actions/checkout@v5

            - uses: shivammathur/setup-php@v2
              with:
                  php-version: '8.4'
                  coverage: none

            - name: Instalar dependencias
              run: composer update --prefer-dist --no-interaction --no-progress

            - name: Contrato de LaraPack
              run: php vendor/bin/builder larapack:verify --strict --format=json
```

**El nombre del job es el nombre del check** que exige la protección de la rama:
si cambia, la protección espera un check que ya no llega y bloquea todo. `--strict`
cuenta los avisos como fallos, así que una excepción `#[HandRolled]` sin aprobar
no entra.

En un proyecto que ya existe —una aplicación o un paquete creado antes de 9.1—,
`larapack:ci` escribe el mismo job en `.github/workflows/larapack.yml`: en una
aplicación con `php artisan`, con el PHP de `config.platform.php` o el mínimo con
el que se instala `composer.lock`, y con `pull_request` y `push` a la rama por
defecto. Con `--owner` añade CODEOWNERS, e imprime la orden que protege la rama
para que la corra el dueño, con `enforce_admins=true` salvo `--no-enforce-admins`.
Si el workflow ya existe y difiere, no escribe nada sin `--force`. `larapack:audit`
avisa con `verify-job` a un paquete que usa LaraPack sin este trabajo. El porqué y
los pasos están en [En la CI](/larapack/verificar#ci).

Si el proyecto corre sus workflows en runners propios, `larapack:ci --runs-on`
(repetible, o una lista JSON) pone el job ahí; sin ella va a `ubuntu-latest`. Un
job que no arranca deja el check exigido sin llegar, y nada se fusiona.

En un monorepo basta el job de la raíz: su `verify` recorre `packages/*` con un
solo candado, y los paquetes de `packages/` no necesitan el suyo.

### `frontend`: las interfaces de la aplicación base

`innoboxrr/laravel-setup` copia sus interfaces tal cual a cada aplicación nueva: si
sus tests fallan, no se publica.

```yaml
    frontend:
        runs-on: ubuntu-latest

        strategy:
            fail-fast: false
            matrix:
                ui: [vue, react]

        name: Interfaz ${{ matrix.ui }}

        defaults:
            run:
                working-directory: tests/Frontend/${{ matrix.ui }}

        steps:
            - uses: actions/checkout@v5

            - uses: actions/setup-node@v5
              with:
                  node-version: 22

            - run: npm install --no-audit --no-fund

            - run: npx vitest run
```

## La cadena de pruebas de los paquetes npm {#node}

Desde LaraPack 9.0, los paquetes npm del ecosistema prueban con **Vite 8 y Vitest
5**, sobre **Node 22 y 24**, y declaran `engines.node >=22.12`. Es lo que fija la
línea base (`js.vite: ^8.0.0`, `js.vitest: ^5.0.0`, `node.engines: >=22.12`), y lo
que comprueba `larapack:audit`.

Vitest 5 exige Node `^22.12 || >=24`, y Node 20 es EOL desde el 30 de abril de
2026. La entrada `node-versions` de `node-tests.yml` sigue valiendo
`'["20", "22", "24"]'` por omisión, así que **cada paquete la pasa** en su
`tests.yml`:

```yaml
jobs:
    tests:
        uses: innoboxrr/.github/.github/workflows/node-tests.yml@main
        # Sin Node 20: es EOL desde 2026-04-30 y Vitest 5 exige ^22.12 || >=24.
        with:
            node-versions: '["22", "24"]'
```

Hasta 8.x los satélites se quedaban en Vite 7 y Vitest 3, porque Vitest 4 con Vite
8.3 hacía fallar `npm install` con el npm 10 de Node 20 y 22. Con Vitest 5 y sin
Node 20 en la matriz, ese bloqueo desaparece. El arnés de pruebas React de
laravel-setup (`tests/Frontend/react`) sigue en `vite ^7.1` y `vitest ^3.2`: no
es un paquete que se publique ni pasa por la auditoría.

## Problemas frecuentes de la CI

Los fallos de arranque, los reintentos que reutilizan una versión vieja del
workflow, los logs vacíos y los secretos entre organizaciones están en
[Solución de problemas](/ayuda/#ci).
