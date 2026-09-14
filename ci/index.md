# La línea base

`larapack:verify` mira un paquete hacia dentro: que lo generado siga coherente con
su manifiesto. `larapack:audit` lo mira hacia fuera: **que encaje con los demás
paquetes del ecosistema**. Es lo que impide que la alineación se deshaga en el
siguiente push, y por eso corre en la CI antes de publicar.

## Por qué existe

Antes, cada paquete declaraba lo que quería, o no declaraba nada: 23 de 29 no
tenían ni `php` ni `illuminate/*`, así que Composer los habría instalado sobre
cualquier versión, y la deriva sólo se descubría cuando algo reventaba en
producción.

Ahora la regla vive en un único archivo, `ecosystem.json`, dentro de LaraPack, y
`larapack:audit` la ejerce. **Deliberadamente no arregla nada**: informa, y el
arreglo es una decisión humana o un paso explícito de la CI.

## Ejecutar la auditoría

```bash
php vendor/bin/builder larapack:audit                    # el paquete actual
php vendor/bin/builder larapack:audit packages --all     # cada subdirectorio que sea un paquete
php vendor/bin/builder larapack:audit --format=json --strict
```

La CI lo ejecuta así, y es lo que conviene correr antes de empujar:

```bash
php vendor/innoboxrr/larapack-generator/builder larapack:audit .
```

| Argumento u opción | Qué hace |
|---|---|
| `[ruta]` | El directorio del paquete, o el que contiene varios con `--all`. Por omisión `.` |
| `--all` | Audita cada subdirectorio que tenga `composer.json` o `package.json` |
| `--format=txt\|json` | Salida en texto (por omisión) o un único documento JSON |
| `--strict` | Los avisos también hacen fallar el comando |

`larapack:audit` no tiene `--root`: la ruta es su argumento. Sale con código 1 si
hay errores, si hay avisos con `--strict`, o si la ruta no existe («La ruta indicada
no existe.»).

```json
{
    "ok": false,
    "errors": 1,
    "warnings": 1,
    "findings": [
        {
            "level": "error",
            "check": "internal-version",
            "package": "innoboxrr/laravel-setup",
            "message": "`innoboxrr/larapack-generator: ^7.10.2` no admite la línea base `^7.10`."
        },
        {
            "level": "warning",
            "check": "internal-version",
            "package": "innoboxrr/laravel-auth",
            "message": "`innoboxrr/larapack-generator: ^7.0` admite versiones fuera de la línea base `^7.10`; la matriz de CI tiene que cubrirlas."
        }
    ]
}
```

## `ecosystem.json`

```json
{
    "version": 1,
    "php": {
        "require": "^8.3",
        "matrix": ["8.3", "8.4"]
    },
    "laravel": {
        "illuminate": "^13.0",
        "testbench": "^11.0"
    },
    "dev": {
        "phpunit/phpunit": "^12.0 || ^13.0",
        "laravel/pint": "^1.18",
        "larastan/larastan": "^3.0"
    },
    "node": {
        "engines": ">=20",
        "ci": "22"
    },
    "js": {
        "vite": "^7.1.0",
        "vitest": "^3.0.0",
        "vue": "^3.5.0",
        "react": "^19.0.0"
    },
    "internal": {
        "innoboxrr/larapack-generator": "^7.10",
        "innoboxrr/traits": "^2.1",
        "innoboxrr/support": "^2.1",
        "innoboxrr/search-surge": "^3.0"
    },
    "internalNpm": {
        "innoboxrr-form-core": "^2.8.0",
        "innoboxrr-form-elements": "^6.7.0",
        "innoboxrr-react-form-elements": "^3.7.0",
        "innoboxrr-vue-datatable": "^3.1.0",
        "innoboxrr-react-datatable": "^3.1.0",
        "innoboxrr-http-request": "^2.0.0",
        "innoboxrr-i18n": "^1.2.0",
        "innoboxrr-locale-generator": "^2.0.0",
        "innoboxrr-js-validator": "^2.0.0",
        "innoboxrr-route-resolver": "^2.0.0"
    },
    "generated": {
        "require": {
            "laravel/sanctum": "^4.3",
            "maatwebsite/excel": "^4.0"
        }
    },
    "required": {
        "composer": ["name", "description", "license", "autoload"],
        "npm": ["name", "version", "license", "type", "exports", "files", "sideEffects"]
    },
    "workflows": {
        "composer": ["tests.yml", "release.yml"],
        "npm": ["tests.yml", "release.yml"]
    }
}
```

(Sin los comentarios `$comment*` que lleva el archivo real.)

| Clave | Qué fija | Quién la usa |
|---|---|---|
| `php.require` | La restricción de PHP | `audit`: `php-missing`, `php-version` |
| `php.matrix` | Las versiones de PHP de la CI | Coincide con la matriz por omisión de `php-tests.yml` |
| `laravel.illuminate` | `illuminate/*` y `laravel/framework` | `audit`: `illuminate-missing`, `illuminate-version` |
| `laravel.testbench` | `orchestra/testbench` | `audit`: `testbench-version` |
| `dev` | PHPUnit, Pint y Larastan | `larapack:new`, al escribir `require-dev`. El audit no lo comprueba |
| `node.engines` | `engines.node` de un paquete npm | `audit`: `node-engines` |
| `node.ci` | La versión de Node de referencia en la CI | Informativa: ningún comando la lee |
| `js` | La cadena de pruebas de los paquetes npm | `audit`: `js-version` |
| `internal` | Las dependencias Composer entre paquetes del ecosistema | `audit`: `internal-version` |
| `internalNpm` | Las versiones npm que declara el módulo generado | Un test de LaraPack las compara con las plantillas. El audit no las comprueba |
| `generated.require` | Lo que usa el código generado y no es de la línea base | `larapack:new` lo pone en `require`; la suite EndToEnd lo instala |
| `required` | Campos obligatorios de `composer.json` y `package.json` | `audit`: `composer-field`, `npm-field` |
| `workflows` | Workflows que tiene que tener cada tipo de paquete | `audit`: `workflow-missing` |

## Qué comprueba

`larapack:audit` detecta solo qué es cada directorio: con `composer.json` aplica las
comprobaciones de Composer, con `package.json` las de npm, y con los dos, ambas.

### Paquetes Composer

| Código | Nivel | Cuándo salta | Qué hacer |
|---|---|---|---|
| `composer-field` | aviso | Falta `name`, `description`, `license` o `autoload` | Añadirlo. Se publica igual, pero queda sin identificar en Packagist |
| `composer-version` | error | `composer.json` fija `"version"` | Quitarla. Composer descarta cada tag que no coincide con ella y la versión nueva queda invisible |
| `php-missing` | error | `require` no declara `php` | `"php": "^8.3"` |
| `php-version` | error o aviso | La restricción de `php` no admite la línea base, o admite más | Ver [la regla](#la-regla-exacta-ancha-o-estrecha) |
| `illuminate-missing` | error | El paquete usa Laravel y no declara ningún `illuminate/*` ni `laravel/framework` | Declarar `^13.0` |
| `illuminate-version` | error o aviso | Cada `illuminate/*` o `laravel/framework` contra `^13.0` | Ver la regla |
| `testbench-version` | error o aviso | `orchestra/testbench`, si se declara, contra `^11.0` | Ver la regla |
| `internal-version` | error o aviso | Cada paquete de `internal` que se declare, contra su línea base | Ver la regla y [el patrón `conflict`](#pedir-un-minimo-por-encima-de-la-linea-base-conflict) |
| `phpunit-config` | error | No hay `phpunit.xml` ni `phpunit.xml.dist` | Añadir la configuración |
| `no-tests` | error | No hay ningún `*Test.php` | Añadir al menos un test |
| `workflow-missing` | error | Falta `.github/workflows/tests.yml` o `release.yml` | Crearlo (ver [Los workflows](/ci/workflows)) |
| `bump-patch` | error o aviso | Queda un `bump-patch.yml` | Sustituirlo por `release.yml` |

Dónde mira cada una:

- **`php`** sólo en `require`. **Illuminate, Testbench e internas**, en `require` y
  en `require-dev`.
- **«Usa Laravel»** quiere decir que algún `src/*.php` menciona `Illuminate\`, o que
  existe `src/Providers`, `database/migrations` o `routes`. Es conservador a
  propósito: sólo sirve para no exigir Illuminate a un paquete agnóstico.
- **`no-tests`** busca `tests/*Test.php` y `tests/<carpeta>/*Test.php`. Un paquete
  cuyos tests estén todos más abajo (`tests/Feature/Models/`) recibe el error: deja
  al menos uno en el primer nivel, como el `tests/Feature/PackageBootsTest.php` de
  `larapack:new`.
- **`bump-patch`** es error si el bump cuelga de `push` sin esperar a la suite, y
  aviso si espera (`workflow_run:` o `needs: tests`): no publica a ciegas, pero
  adivina la versión del último tag en vez de declararla.

### Paquetes npm

| Código | Nivel | Cuándo salta | Qué hacer |
|---|---|---|---|
| `npm-field` | aviso | Falta `name`, `version`, `license`, `type`, `exports`, `files` o `sideEffects` | Añadirlo. Se mira la clave: `"sideEffects": false` es válido |
| `node-engines` | aviso | `engines.node` no es exactamente `>=20` | `"engines": { "node": ">=20" }`. Se compara el texto: `>=20.0.0` también avisa |
| `js-version` | error o aviso | `vite`, `vitest`, `vue` o `react` en `dependencies` o `devDependencies`, contra `js` | Ver la regla |
| `workflow-missing` | error | Falta `tests.yml` o `release.yml` | Crearlo |
| `bump-patch` | error o aviso | Queda un `bump-patch.yml` | Sustituirlo |

Las `peerDependencies` quedan fuera a propósito. Una librería que declara
`react: ^18 || ^19` hace lo correcto: dice contra qué puede funcionar, no contra qué
se construye.

### Ninguno de los dos

| Código | Nivel | Cuándo salta |
|---|---|---|
| `not-a-package` | aviso | La ruta no tiene `composer.json` ni `package.json` |

Con `--all` no aparece: sólo se auditan los subdirectorios que son paquetes.

## La regla: exacta, ancha o estrecha

Lo que importa no es que el texto coincida con la línea base, sino que la
restricción **la admita**.

| Caso | Qué quiere decir | Ejemplo | Resultado |
|---|---|---|---|
| Exacta | Dice justo la línea base | `"php": "^8.3"` | Nada |
| Ancha | Admite la línea base y además versiones fuera de ella | `"illuminate/support": "^12.0 \|\| ^13.0"`, `"innoboxrr/larapack-generator": "^7.0"` | **Aviso**: es legítimo, pero la matriz de la CI tiene que cubrir de verdad lo que promete |
| Estrecha | No admite toda la línea base | `"php": "^8.4"`, `"innoboxrr/larapack-generator": "^7.10.2"` | **Error**: ahí sí hay algo roto |
| Ilegible | Composer no puede leerla | `"php": "8.3 o superior"` | Aviso |

Una restricción ancha tiene sentido: estrecharla a `^13.0` sólo le quita a quien usa
Laravel 12 la posibilidad de instalar la librería. `innoboxrr/traits` declara
`^12.0 || ^13.0` y por eso su CI prueba Laravel 12 y 13.

Una estrecha es un error porque rompe la instalación conjunta: un paquete que exige
`^7.10.2` no se puede instalar donde otro está en `7.10.0`, que la línea base
permite. Y como `tests.yml` corre la auditoría, **un error bloquea la publicación**.

## Pedir un mínimo por encima de la línea base: `conflict`

A veces un paquete necesita un arreglo que llegó en una versión de parche posterior
a la línea base. `laravel-setup` necesita LaraPack 7.10.2, y la línea base dice
`^7.10`. Escribir `^7.10.2` en `require` es una restricción estrecha: la auditoría
falla y no se publica. Le pasó a laravel-setup 7.0.0.

La solución es **dejar `require` en la línea base y excluir lo anterior con
`conflict`**:

```json
{
    "require": {
        "php": "^8.3",
        "innoboxrr/larapack-generator": "^7.10",
        "laravel/framework": "^13.0"
    },
    "conflict": {
        "innoboxrr/larapack-generator": "<7.10.2"
    }
}
```

Funciona por dos razones:

- **Composer combina las dos**: `^7.10` y no `<7.10.2` es, en la práctica,
  `>=7.10.2 <8.0`.
- **La auditoría lee `require` y `require-dev`**, no `conflict`: ve una restricción
  exacta.

Cuando `ecosystem.json` suba su línea base por encima de ese mínimo, el `conflict`
sobra y se quita.

::: tip Consejo
Corre la auditoría en local antes de empujar una versión:
`php vendor/innoboxrr/larapack-generator/builder larapack:audit .`. Es la misma
línea que ejecuta la CI.
:::

Una **aplicación** no pasa por la auditoría, así que puede pedir el mínimo
directamente: `app:setup` escribe `innoboxrr/larapack-generator: ^7.10.2` en el
`require-dev` de la aplicación que crea.

## Qué no comprueba

- **Las versiones de `dev`** (PHPUnit, Pint, Larastan): sólo las usa `larapack:new`.
- **`internalNpm`**: las dependencias `innoboxrr-*` del `package.json` de un módulo
  generado se alinean a mano (paso 8 de la [guía de actualización](/larapack/actualizar)).
- **Las `peerDependencies`.**
- **Que la matriz de la CI cubra de verdad** una restricción ancha. Eso lo revisa una
  persona.
- **El formato y los tipos**: de eso se encarga el trabajo `quality`, con Pint y
  Larastan. Ver [Los workflows](/ci/workflows).
- **Que la CI corra la auditoría.** Un paquete cuyo `tests.yml` no llama a
  `php-tests.yml`, o que no instala LaraPack, no se audita en la CI.
