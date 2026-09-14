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
| `node-versions` | `'["20", "22", "24"]'` | Versiones de Node de la matriz |
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

## Por qué los satélites siguen en Vite 7 y Vitest 3

Los paquetes npm del ecosistema prueban con **Vite 7 y Vitest 3**, y la línea base lo
fija (`js.vite: ^7.1.0`, `js.vitest: ^3.0.0`). Las aplicaciones y los módulos
generados ya van en **Vite 8**, el de Laravel 13.

La razón es npm: **Vitest 4 con Vite 8.3 hace fallar `npm install` con npm 10**, el
npm que traen Node 20 y 22, dos de las tres versiones de la matriz de
`node-tests.yml`. Con npm 11 las suites pasan, pero la CI instala con el npm de cada
Node.

Un módulo generado puede pedir Vite 8 porque no instala Vitest. Por la misma razón,
el arnés de pruebas React de laravel-setup (`tests/Frontend/react`) usa `vite ^7.1`,
`@vitejs/plugin-react ^5` y `vitest ^3.2`, aunque la aplicación que copia pida
`vite ^8` y `@vitejs/plugin-react ^6`.

Se revisará cuando npm 10 lo corrija o la CI pase a npm 11.

## Problemas frecuentes de la CI

Los fallos de arranque, los reintentos que reutilizan una versión vieja del
workflow, los logs vacíos y los secretos entre organizaciones están en
[Solución de problemas](/ayuda/#ci).
