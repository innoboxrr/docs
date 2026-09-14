# Comandos

Todos los comandos viven en el espacio `larapack:` y se ejecutan con `php artisan` dentro de una aplicación o con `php vendor/bin/builder` en cualquier sitio (ver [Cómo se invoca](/larapack/#como-se-invoca)). Esta página recoge los argumentos y las opciones que tiene cada uno de verdad, sus códigos de salida y la forma de su salida JSON.

## Opciones comunes {#opciones-comunes}

| Opción | Qué hace |
|---|---|
| `--root=<ruta>` | Raíz del proyecto sobre el que se trabaja. Sin ella, [se descubre](/larapack/#root). Una ruta que no existe es un error. |
| `--force` | Regenera los archivos que ya existen, salvo los editados a mano y los que el manifiesto no conoce. Ver [Regenerar sin destruir](/larapack/regenerar). |
| `--dry-run` | Informa de lo que haría sin escribir ningún archivo. |
| `--format=<formato>` | `txt`, por defecto, o `json`: un único documento JSON en la salida estándar. |

No todos los comandos las tienen:

| Comando | `--root` | `--force` | `--dry-run` | `--format` |
|---|---|---|---|---|
| `larapack:new` | — | — | ✓ | ✓ |
| `larapack:schema` | — | — | — | — |
| `larapack:validate` | ✓ | — | — | ✓ |
| `larapack:import` | ✓ | ✓ | ✓ | ✓ |
| `larapack:verify` | ✓ | — | — | ✓ |
| `larapack:audit` | — | — | — | ✓ |
| `larapack:skill` | ✓ | ✓ (sobrescribe el destino) | — | — |
| `larapack:full-model` | ✓ | ✓ | ✓ | ✓ |
| `larapack:remove-full-model` | ✓ | — | — | — |
| `larapack:providers`, los cuatro `*-service-provider` y `larapack:config` | ✓ | ✓ | ✓ | ✓ |
| Los generadores de una pieza, `larapack:model-view`, `larapack:react-view` y `larapack:pivot-migration` | ✓ | ✓ | ✓ | ✓ |

## Todos los comandos

### Contrato y comprobaciones

| Comando | Argumentos | Qué hace |
|---|---|---|
| [`larapack:new`](#larapack-new) | `<name> [directory]` | Crea un paquete nuevo listo para generar, probar y publicar. |
| [`larapack:schema`](#larapack-schema) | — | Imprime el JSON Schema del contrato. |
| [`larapack:validate`](#larapack-validate) | `[jsonPath]` | Valida un `laraimport.json` sin generar nada. |
| [`larapack:import`](#larapack-import) | `[jsonPath]` | Genera todos los modelos y pivotes de un `laraimport.json`. |
| [`larapack:verify`](#larapack-verify) | — | Comprueba lo generado contra el manifiesto. |
| [`larapack:audit`](#larapack-audit) | `[path]` | Comprueba la línea base del ecosistema. |
| [`larapack:skill`](#larapack-skill) | — | Instala en el proyecto las instrucciones para un agente. |

### Un modelo entero

| Comando | Argumentos | Qué hace |
|---|---|---|
| [`larapack:full-model`](#larapack-full-model) | `<name>` | Genera todas las piezas de un modelo sin `laraimport.json`. |
| [`larapack:remove-full-model`](#larapack-remove-full-model) | `<name>` | Borra las piezas de un modelo y escribe las migraciones que eliminan sus tablas. |
| `larapack:model-view` | `<name>` | Genera el módulo Vue del modelo. |
| `larapack:react-view` | `<name>` | Genera el módulo React del modelo. |

### Piezas sueltas

Todos reciben `<name>`, el nombre del modelo en PascalCase, salvo `larapack:pivot-migration`, que recibe el nombre de la tabla.

| Comando | Qué genera |
|---|---|
| `larapack:controller` | El controlador del modelo y, en un paquete, el `Controller` base. |
| `larapack:events` | Los eventos y listeners de cada acción declarada. |
| `larapack:excel` | La vista `resources/views/excel/<snake>.blade.php`. |
| `larapack:export` | La clase `<Plural>Exports`. |
| `larapack:export-notification` | La notificación de exportación. |
| `larapack:factory` | La factory. |
| `larapack:filters` | Los cinco filtros de search-surge. |
| `larapack:migration` | La migración de creación. |
| `larapack:model` | El modelo. |
| `larapack:model-traits` | Los cinco traits, si no existen. |
| `larapack:observer` | El observer. |
| `larapack:policy` | La política. |
| `larapack:requests` | Un request por acción declarada. |
| `larapack:resource` | El recurso. |
| `larapack:route` | El archivo de rutas. |
| `larapack:test` | El test de endpoints y, si faltan, `tests/TestCase.php`, `tests/User.php` y `phpunit.xml`. |
| [`larapack:pivot-migration`](#larapack-pivot-migration) | La migración de una tabla pivote. |

### El proyecto

Ninguno recibe argumentos. Ver [Proveedores y configuración](#proveedores-y-configuracion).

| Comando | Qué genera |
|---|---|
| `larapack:providers` | Los cuatro proveedores de una vez. |
| `larapack:app-service-provider` | `Providers/AppServiceProvider.php`. |
| `larapack:auth-service-provider` | `Providers/AuthServiceProvider.php`. |
| `larapack:event-service-provider` | `Providers/EventServiceProvider.php`. |
| `larapack:route-service-provider` | `Providers/RouteServiceProvider.php`. |
| `larapack:config` | El archivo de configuración de lo generado. |

## larapack:new {#larapack-new}

```bash
php vendor/bin/builder larapack:new acme/catalogo packages/catalogo
```

| Argumento u opción | Por defecto | Qué es |
|---|---|---|
| `name` | obligatorio | Nombre Composer, `vendor/paquete`, en minúsculas. |
| `directory` | `./<paquete>` | Dónde crearlo. Se crea si no existe. |
| `--namespace=` | sale del nombre | Namespace raíz. `acme/shop-catalog` da `Acme\ShopCatalog`. Cada parte, en PascalCase. |
| `--description=` | `<paquete>: paquete Laravel generado con LaraPack.` | Para `composer.json` y el README. |
| `--license=` | `MIT` | Licencia de `composer.json`. Con `MIT` se escribe además `LICENSE`. |
| `--dry-run` | — | Construye el paquete en un directorio temporal, informa y lo borra. |
| `--format=` | `txt` | `txt` o `json`. |

Se niega a trabajar sobre un directorio que ya tenga `composer.json`: ahí ya hay un proyecto, y para generar dentro de él están `larapack:import` y `larapack:providers` con `--root`.

Lo que crea, con las versiones del `ecosystem.json` del LaraPack que lo ejecuta:

| Archivo | Contenido |
|---|---|
| `composer.json` | `type: library`. `require`: `php`, `illuminate/support`, `innoboxrr/search-surge`, `innoboxrr/support`, `innoboxrr/traits`, `laravel/sanctum` y `maatwebsite/excel`. `require-dev`: `innoboxrr/larapack-generator`, `larastan/larastan`, `laravel/pint`, `orchestra/testbench` y `phpunit/phpunit`. Autoload de `src/` y de `database/factories/`, autoload-dev de `tests/`, y los cuatro proveedores en `extra.laravel.providers`. |
| `src/Providers/{App,Auth,Event,Route}ServiceProvider.php` | Los proveedores. |
| `config/<clave>.php` | La configuración de la exportación. |
| `tests/TestCase.php`, `tests/User.php`, `tests/Feature/PackageBootsTest.php` | La base de tests y un primer test que comprueba que los proveedores arrancan y las migraciones corren. |
| `phpunit.xml.dist` | La configuración de PHPUnit. |
| `.github/workflows/tests.yml`, `.github/workflows/release.yml` | Los workflows del ecosistema, con el trabajo `quality` (Pint y Larastan). |
| `pint.json`, `phpstan.neon.dist` | Preset `laravel`; Larastan nivel 5 sobre `src` y `database`. |
| `VERSION` | `0.1.0`. |
| `README.md`, `CHANGELOG.md`, `AGENTS.md`, `.gitignore`, `.gitattributes`, `LICENSE` | Los archivos del repositorio. `AGENTS.md` apunta a la skill. |
| `.claude/skills/larapack/SKILL.md` | La skill instalada. |

Un paquete recién creado pasa `larapack:audit` sin hallazgos. Los pasos siguientes están en [Un paquete nuevo](/empezar/paquete-nuevo).

::: warning La simulación no deja nada que copiar
`larapack:new --dry-run` construye el paquete en un directorio temporal para decir exactamente qué crearía, y lo borra al terminar. Para ver los archivos, créalo de verdad en un directorio aparte.
:::

## larapack:schema {#larapack-schema}

| Opción | Qué hace |
|---|---|
| `--path` | Imprime sólo la ruta de `schema/laraimport.schema.json`. |

Sin opciones imprime el esquema completo. No tiene `--root` ni `--format`: la salida ya es JSON, y siempre sale con 0.

## larapack:validate {#larapack-validate}

```bash
php vendor/bin/builder larapack:validate --vue --format=json
```

| Argumento u opción | Por defecto | Qué es |
|---|---|---|
| `jsonPath` | `<raíz>/laraimport.json` | El archivo a validar. |
| `--vue`, `--react` | — | Añade los [avisos de interfaz](/larapack/laraimport#avisos-de-interfaz). |
| `--strict` | — | Los avisos cuentan como fallo. |
| `--root=` | se descubre | |
| `--format=` | `txt` | `txt` o `json`. |

En texto imprime cada hallazgo, los modelos en el orden en que correrán sus migraciones y el recuento. Sale con 1 si hay errores, o avisos con `--strict`. Qué comprueba está en [Errores y avisos](/larapack/laraimport#errores-y-avisos).

## larapack:import {#larapack-import}

```bash
php vendor/bin/builder larapack:import --vue --react --dry-run
php vendor/bin/builder larapack:import --vue --react --force
```

| Argumento u opción | Por defecto | Qué es |
|---|---|---|
| `jsonPath` | `<raíz>/laraimport.json` | El contrato. |
| `--vue`, `--react` | — | Genera también el módulo de interfaz de cada modelo. No son excluyentes. |
| `--root=`, `--force`, `--dry-run`, `--format=` | | Las [opciones comunes](#opciones-comunes). |

Lo que hace, en orden:

1. Valida el archivo, con los avisos de interfaz si pasas `--vue` o `--react`. Con un error no escribe nada y sale con 1.
2. Genera cada modelo, en el orden de sus dependencias, con las mismas piezas que `larapack:full-model`, y anota su forma declarada en el manifiesto.
3. Genera la migración de cada pivote.
4. Formatea con Pint lo que escribió.
5. Informa, con los avisos de la validación en `findings`.

En texto escribe además su progreso, modelo a modelo. Con `--format=json` no escribe progreso en ninguna salida.

## larapack:verify {#larapack-verify}

| Opción | Por defecto | Qué es |
|---|---|---|
| `--strict` | — | Los avisos cuentan como fallo. |
| `--root=` | se descubre | |
| `--format=` | `txt` | `txt` o `json`. |

Lee sólo `.larapack/manifest.json` y los archivos. Sale con 1 si hay errores, o avisos con `--strict`. Las comprobaciones están en [Verificar y auditar](/larapack/verificar).

## larapack:audit {#larapack-audit}

```bash
php vendor/bin/builder larapack:audit                     # el paquete actual
php vendor/bin/builder larapack:audit packages --all      # cada paquete de un directorio
```

| Argumento u opción | Por defecto | Qué es |
|---|---|---|
| `path` | `.` | El directorio del paquete, o uno que los contiene con `--all`. |
| `--all` | — | Audita cada subdirectorio que tenga `composer.json` o `package.json`. |
| `--strict` | — | Los avisos cuentan como fallo. |
| `--format=` | `txt` | `txt` o `json`. |

No tiene `--root`: la ruta es el argumento. Una ruta que no existe sale con 1. Las comprobaciones están en [Verificar y auditar](/larapack/verificar#audit).

## larapack:skill {#larapack-skill}

| Opción | Por defecto | Qué es |
|---|---|---|
| `--path=` | `.claude/skills/larapack/SKILL.md` | Destino, relativo a la raíz; también admite una ruta absoluta. |
| `--print` | — | Escribe el texto en la salida estándar en lugar de instalarlo. |
| `--source` | — | Imprime sólo la ruta del original, dentro de LaraPack. |
| `--force` | — | Sobrescribe el destino aunque exista. |
| `--root=` | se descubre | |

Sin `--force` no pisa un destino que ya existe, porque puede estar ampliado con reglas del proyecto: dice si está al día o si difiere del paquete, y sale con 0 en los dos casos. Tras actualizar LaraPack, reinstálala con `--force`. Ver [Preparar el proyecto](/ia/preparar).

## larapack:full-model {#larapack-full-model}

```bash
php artisan larapack:full-model AuditEvent --only=policies,index,show --immutable
```

| Argumento u opción | Qué es |
|---|---|
| `name` | Nombre del modelo, en PascalCase. |
| `--vue`, `--react` | Genera también su módulo de interfaz. |
| `--metas` | Genera el modelo con metas, conectado como con `metas: true`. |
| `--only=a,b` | Sólo estas acciones, separadas por comas. |
| `--except=a,b` | Todas las acciones menos estas. |
| `--immutable` | Las filas no se modifican ni se borran. |
| `--root=`, `--force`, `--dry-run`, `--format=` | Las [opciones comunes](#opciones-comunes). |

Genera, en este orden: migración, controlador, eventos, vista de Excel, exportación, notificación de exportación, factory, filtros, modelo, traits, observer, política, requests, recurso, rutas y test; después, los módulos pedidos y, con `--metas`, el modelo y la migración de metas.

Sale con 1 si pasas `--only` y `--except` a la vez, si una acción no existe o si `--immutable` va con una escritura en `--only`.

::: warning Sin laraimport no hay columnas
Un comando suelto no lee `laraimport.json`: los archivos salen con sus marcadores de datos sin rellenar, así que el modelo no tiene columnas, la migración tampoco, los requests no tienen reglas y los formularios no tienen campos. Úsalo para un modelo rápido o para probar una forma; para un dominio real, declara el modelo y usa `larapack:import`.
:::

## larapack:remove-full-model {#larapack-remove-full-model}

| Argumento u opción | Qué es |
|---|---|
| `name` | Nombre del modelo. |
| `--vue`, `--react` | Borra también la carpeta del modelo en ese módulo. |
| `--root=` | |

Borra el controlador, los eventos, la vista de Excel, la exportación, la notificación, la factory, los filtros, el modelo y sus cinco traits, el modelo de metas, el observer, la política, los requests, el recurso, el archivo de rutas y el test. No borra la migración de creación: escribe `<fecha>_drop_<tabla>_table.php` y, si el modelo tenía metas, `<fecha>_drop_<snake>_metas_table.php`.

No tiene `--format` y sale siempre con 0.

::: warning Limpia el manifiesto a mano
El comando no retira el modelo de `.larapack/manifest.json`, así que `larapack:verify` informará después de sus archivos como `missing-file`. Borra la entrada del modelo en `models` del manifiesto.
:::

## larapack:pivot-migration {#larapack-pivot-migration}

```bash
php vendor/bin/builder larapack:pivot-migration post_tag
```

Recibe el nombre de la tabla. Crea `database/migrations/<fecha>_create_<tabla>_table.php` sólo si no hay ya una migración de creación de esa tabla. No entra en el manifiesto, así que `--force` no la regenera.

Desde `larapack:import`, las columnas salen de `pivots`. Suelto no hay laraimport: la migración trae `id()` y `timestamps()`, y las columnas las escribes tú en el marcador `//EDIT//`.

## Proveedores y configuración {#proveedores-y-configuracion}

El importador no genera proveedores. Un paquete creado con `larapack:new` ya los tiene; en otro proyecto se crean una vez.

| Proveedor | Qué hace |
|---|---|
| `AppServiceProvider` | Fusiona la configuración si existe, carga las migraciones, las vistas con el namespace del paquete y `lang/` como JSON, y publica las etiquetas `views` y `config`. |
| `AuthServiceProvider` | Sólo gates: cada modelo declara su política con `#[UsePolicy]`. |
| `EventServiceProvider` | Enlaza cada evento de `Http/Events/<Model>/Events` con los listeners de `Http/Events/<Model>/Listeners/<Evento>`, recorriéndolos en cada arranque, sin caché. |
| `RouteServiceProvider` | Carga cada `routes/api/models/*.php` con el middleware `api`, el prefijo `api/<namespace>/<snake>` y los nombres `api.<namespace>.<snake>.`. No hace nada si las rutas están cacheadas. |

- **En un paquete**, cada comando de proveedor lo declara además en `extra.laravel.providers` del `composer.json`, sin duplicar y nunca en una simulación. La aplicación que instala el paquete los descubre sola.
- **En una aplicación**, un proveedor que ya existe se omite, y nada se añade al `composer.json`: registra `RouteServiceProvider` y `EventServiceProvider` en `bootstrap/providers.php`. Sin el de eventos, la exportación nunca avisa.

`larapack:config` crea `config/<clave>.php` con `user_class`, `excel_view`, `notification_via` y `export_disk`. En un paquete la clave es el namespace en minúsculas y sin separadores (`Acme\Catalogo` da `acmecatalogo`); en una aplicación es `larapack`, y el comando nunca escribe en `config/app.php`. Ver [Exportar a Excel](/larapack/exportar#configuracion).

## Códigos de salida

| Código | Cuándo |
|---|---|
| `0` | Terminó bien. En `validate`, `verify` y `audit`: sin errores, y sin avisos si se pasó `--strict`. |
| `1` | Algo falló. |

Qué hace salir con 1:

- `validate`, `verify` y `audit`: algún error, o algún aviso con `--strict`.
- `import`: un laraimport inválido o que no existe. No se escribe nada.
- `audit`: una ruta que no existe.
- `new`: un nombre o un namespace inválidos, un directorio con `composer.json` o un directorio que no se puede crear.
- `full-model`: `--only` junto a `--except`, una acción desconocida o `--immutable` con una escritura en `--only`.
- Cualquier comando con `--root`: una raíz que no existe.
- Cualquier comando: un argumento obligatorio que falta o una opción desconocida.

`schema`, `skill` y `remove-full-model` salen con 0 salvo que algo lance una excepción.

## Salida JSON {#salida-json}

Con `--format=json`, cada comando que lo acepta escribe **exactamente un documento JSON en la salida estándar y nada más**: ni progreso, ni avisos sueltos, ni nada en la salida de errores. Vale también para `--dry-run` y para los fallos, así que quien lo lee decodifica la salida entera sin recortar nada.

- `ok` dice si salió bien.
- Si el comando no pudo ejecutarse, el documento lleva `"ok": false` y `error` con el motivo, y el código de salida es 1.

::: tip Los acentos salen escapados
El documento se escribe con `json_encode` y los caracteres no ASCII salen como `í`. Cualquier decodificador JSON los devuelve tal cual; en los ejemplos de esta página se muestran legibles.
:::

### Un fallo

```json
{
    "ok": false,
    "error": "La raíz indicada no existe: packages/catalogo"
}
```

Algunos fallos añaden claves:

| Clave | Cuándo |
|---|---|
| `findings` | `larapack:import` con un laraimport inválido: los hallazgos de la validación. |
| `exception` | Un fallo que llega como excepción (una raíz que no existe, un argumento que falta): la clase de la excepción. |

### Los generadores e import

`larapack:import`, `larapack:new`, `larapack:full-model`, `larapack:providers`, `larapack:config` y cada generador de una pieza:

```json
{
    "ok": true,
    "dryRun": false,
    "formatted": 24,
    "summary": { "create": 24, "overwrite": 0, "skipped": 1, "preserved": 1 },
    "files": [
        { "action": "create", "file": "src/Models/Post.php", "stub": "Model/ModelTemplate.txt", "reason": null },
        { "action": "skipped", "file": "database/factories/PostFactory.php", "stub": "Factory/FactoryTemplate.txt", "reason": "ya existe" },
        { "action": "preserved", "file": "src/Policies/PostPolicy.php", "stub": "Policy/PolicyTemplate.txt", "reason": "editado a mano" }
    ],
    "findings": []
}
```

| Clave | Qué es |
|---|---|
| `ok` | `true`. |
| `dryRun` | Si fue una simulación. |
| `formatted` | Cuántos archivos PHP formateó Pint. `0` en una simulación o sin PHP que formatear; `null` si hacía falta Pint y el proyecto no lo tiene. |
| `summary` | Recuento por acción: `create`, `overwrite`, `skipped` y `preserved`. |
| `files[].action` | `create` (creado), `overwrite` (regenerado), `skipped` (omitido) o `preserved` (conservado por estar editado). En una simulación, lo que haría. |
| `files[].file` | Ruta relativa a la raíz. |
| `files[].stub` | Plantilla de la que sale, relativa a `Stubs/`. |
| `files[].reason` | Por qué se omitió o se conservó, o `null`. |
| `findings` | Sólo en `larapack:import`: los avisos de la validación, con la forma de los de `validate`. |

### Salida de larapack:validate {#json-validate}

```json
{
    "ok": false,
    "file": "/ruta/al/proyecto/laraimport.json",
    "errors": 1,
    "warnings": 1,
    "models": [],
    "findings": [
        {
            "level": "error",
            "path": "/models/0/requests/1/rules",
            "message": "Update debe validar 'post_id': su authorize() y su handle() hacen findOrFail con ese valor."
        },
        {
            "level": "warning",
            "path": "/models/0/load_relations/1/related",
            "message": "'User' no está en este archivo y no declara namespace: se resolverá contra App\\Models."
        }
    ]
}
```

| Clave | Qué es |
|---|---|
| `ok` | Sin errores, y sin avisos con `--strict`. |
| `file` | El archivo validado. |
| `errors`, `warnings` | Recuentos. |
| `models` | Los nombres de los modelos en orden de migración; vacío si el documento tiene errores. |
| `findings[]` | `level` (`error` o `warning`), `path` (puntero JSON) y `message`. |

### Salida de larapack:verify {#json-verify}

```json
{
    "ok": false,
    "errors": 1,
    "warnings": 0,
    "findings": [
        {
            "level": "error",
            "check": "missing-file",
            "model": "Post",
            "file": "src/Policies/PostPolicy.php",
            "message": "Se generó pero ya no existe. Regenéralo con --force o retíralo del manifiesto."
        }
    ]
}
```

| Clave | Qué es |
|---|---|
| `findings[].level` | `error`, `warning` o `info`. |
| `findings[].check` | El código de la comprobación. Ver [Verificar y auditar](/larapack/verificar#verify). |
| `findings[].model` | El modelo, o `null` para lo que no es de ninguno (proveedores, configuración, andamiaje del módulo). |
| `findings[].file` | El archivo, relativo a la raíz, o `null`. |
| `findings[].message` | Qué pasa y qué hacer. |

### Salida de larapack:audit {#json-audit}

```json
{
    "ok": false,
    "errors": 1,
    "warnings": 1,
    "findings": [
        {
            "level": "error",
            "check": "internal-version",
            "package": "acme/catalogo",
            "message": "`innoboxrr/larapack-generator: ^7.10.2` no admite la línea base `^7.10`."
        },
        {
            "level": "warning",
            "check": "illuminate-version",
            "package": "acme/catalogo",
            "message": "`illuminate/support: ^12.0 || ^13.0` admite versiones fuera de la línea base `^13.0`; la matriz de CI tiene que cubrirlas."
        }
    ]
}
```

| Clave | Qué es |
|---|---|
| `findings[].level` | `error` o `warning`. |
| `findings[].check` | El código de la comprobación. Ver [Verificar y auditar](/larapack/verificar#audit). |
| `findings[].package` | El `name` del `composer.json` o del `package.json`, o el nombre del directorio. |
| `findings[].message` | Qué pasa. |
