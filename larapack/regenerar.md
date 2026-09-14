# Regenerar sin destruir

Ampliar el `laraimport.json` y volver a importar es el flujo normal, no una excepción. Funciona porque LaraPack sabe qué escribió él y qué escribiste tú, y nunca pisa lo segundo.

## El manifiesto

Cada archivo que pasa por el generador se anota en `.larapack/manifest.json`: la plantilla de la que salió y el hash de su contenido en ese momento.

```json
{
    "version": 1,
    "package": {
        "namespace": "Acme\\Catalogo\\",
        "files": {
            "resources/vue/index.js": { "stub": "ModelView/Module/index.js", "hash": "9f2c…" },
            "src/Providers/RouteServiceProvider.php": { "stub": "Providers/RouteServiceProviderTemplate.txt", "hash": "41ab…" }
        }
    },
    "models": {
        "AuditEvent": {
            "namespace": "Acme\\Catalogo\\",
            "files": {
                "src/Models/AuditEvent.php": { "stub": "Model/ModelTemplate.txt", "hash": "c07e…" }
            },
            "declaration": {
                "actions": ["policies", "index", "show", "export"],
                "immutable": true
            }
        }
    }
}
```

| Parte | Qué es |
|---|---|
| `package.files` | Lo que no es de ningún modelo: proveedores, configuración y el andamiaje del módulo de interfaz. |
| `models.<Model>.files` | Los archivos de cada modelo. |
| `hash` | SHA-256 del contenido, con los finales de línea normalizados: un archivo que pasa por git en Windows no parece editado. |
| `models.<Model>.declaration` | La forma declarada: `actions`, `immutable`, `secret` y `authenticatable`. Sólo se escribe cuando el modelo se aparta de la forma por defecto, y es lo que lee `larapack:verify`, que no recibe el laraimport. |

::: warning Versiona el manifiesto
Sin `.larapack/manifest.json`, el generador no distingue tu código del suyo y trata como propio del proyecto todo lo que ya existe: no sobrescribe nada, ni con `--force`, y `verify` no tiene nada que comprobar.
:::

## Qué hace con cada archivo

| El archivo | Sin `--force` | Con `--force` |
|---|---|---|
| No existe | Se crea (`create`). | Se crea (`create`). |
| Existe y su hash coincide con el del manifiesto | Se omite (`skipped`, «ya existe»). | Se regenera (`overwrite`). |
| Existe y su hash cambió | Se omite (`skipped`, «ya existe»). | Se conserva (`preserved`, «editado a mano»). |
| Existe y el manifiesto no lo conoce | Se omite (`skipped`, «ya existe»). | Se conserva (`preserved`, «editado a mano»). |

`--force` nunca sobrescribe un archivo editado ni uno que el generador no escribió. Lo que se conserva no recibe el cambio: el informe lo dice, y ese cambio hay que llevarlo a mano.

```text
  creado     src/Models/Supplier.php
  regenerado src/Http/Controllers/ProductController.php
  conservado src/Policies/ProductPolicy.php (editado a mano)
  omitido    src/Models/Traits/Operations/ProductOperations.php

  12 creados, 30 regenerados, 0 omitidos, 1 conservados
  Los conservados se editaron a mano; --force no los sobrescribe.
```

### Lo que queda fuera del manifiesto

Algunos archivos no pasan por esa tabla, porque desde que existen son tuyos:

- **Los cinco traits** del modelo y **el test de endpoints**: se crean si faltan, y ni `--force` los reescribe.
- **`tests/TestCase.php`, `tests/User.php` y `phpunit.xml`**: se copian una vez.
- **Las migraciones de pivotes**: se crean si no hay una para esa tabla.
- **Lo que `larapack:new` escribe fuera de los generadores**, como el README o los workflows.
- **Las traducciones**: `src/locales/*.json` y `lang/es.json` se fusionan, sin tocar lo traducido.

Como no están en el manifiesto, `larapack:verify` no los marca como editados. La lista completa está en [Lo que nunca se reescribe](/larapack/que-se-genera#lo-que-nunca-se-reescribe).

## `--dry-run`

Hace todo el recorrido y anota qué haría con cada archivo, sin escribir ninguno:

```bash
php vendor/bin/builder larapack:import --vue --dry-run
php vendor/bin/builder larapack:import --vue --dry-run --force
```

- El informe dice `create`, `overwrite`, `skipped` o `preserved` para cada archivo, igual que la ejecución real con las mismas opciones.
- No actualiza el manifiesto, no escribe `composer.json`, no toca las traducciones y no ejecuta Pint (`formatted` vale `0`).
- Una alteración de esquema se anuncia como el `create` de su migración.
- Puede dejar directorios vacíos donde se crearían archivos.

Úsalo siempre antes de `--force`: dice qué se va a regenerar y qué se va a conservar.

`larapack:new --dry-run` es distinto: construye el paquete de verdad en un directorio temporal, informa y lo borra.

## Formato con Pint

Después de escribir, LaraPack formatea con Pint los archivos PHP que creó o regeneró en esa ejecución, y vuelve a anotar su hash en el manifiesto. Así lo generado pasa `vendor/bin/pint --test` en la CI sin parecer editado.

- **Qué Pint usa.** El del proyecto, `vendor/laravel/pint/builds/pint`, ejecutado desde la raíz, así que lee su `pint.json`. La variable de entorno `LARAPACK_PINT` apunta a otro binario; si apunta a un archivo que no existe, cuenta como que no hay Pint.
- **Qué formatea.** Sólo los `.php` escritos en esa ejecución, en tandas de 40 archivos. Nunca un archivo conservado por estar editado, y nada en una simulación.
- **Sin Pint.** Lo generado queda sin formatear. En texto lo avisa con «Pint no está en el proyecto: lo generado queda sin formatear. composer require --dev laravel/pint»; en JSON, `formatted` vale `null`.
- **Si Pint falla.** No se dice nada y la generación sigue: lo generado ya está escrito y es correcto, sólo queda sin formatear, y la CI del paquete lo detectará.

::: tip Un fallo de formato es algo escrito a mano
Lo que genera LaraPack sale formateado y pasa Larastan de nivel 5. Si `pint --test` o `phpstan analyse` fallan, lo que falla es algo que se escribió a mano: `vendor/bin/pint` lo formatea.
:::

## Las migraciones al reimportar

Las migraciones llevan la hora en el nombre, así que buscar por nombre exacto no las encontraba nunca. Al reimportar, LaraPack reutiliza la migración de creación que ya exista para esa tabla (`*_create_<tabla>_table.php`, la más antigua si hay varias), también la de metas y la de pivotes, en lugar de escribir otra.

Y una tabla ya migrada no cambia reescribiendo su creación: si las columnas del laraimport cambiaron, se escribe una **migración de alteración**. Todo eso está en [Migraciones y cambios de esquema](/larapack/migraciones).

## Ampliar un proyecto que ya usa LaraPack

1. Edita `laraimport.json`.
2. `larapack:validate --vue`.
3. `larapack:import --vue --dry-run --force` para ver qué cambia y qué se conservará.
4. `larapack:import --vue --force`.
5. Lleva a mano el cambio a cada archivo que el informe dijo que conservó.
6. `php artisan migrate` si hay migraciones nuevas y `php artisan route:json` si cambiaron las rutas.
7. `larapack:verify` y los tests.

Un cambio del JSON y su regeneración van en el mismo commit; la lógica que escribes después, en otro.

## Adoptar el manifiesto en un proyecto antiguo

Un proyecto generado con la 5.x no tiene `.larapack/manifest.json`, así que el generador no sobrescribe nada de lo que ya existe. Para adoptarlo:

1. Genera sobre una copia limpia: `larapack:import --root=../copia-limpia`.
2. Compara con `git diff --no-index` los archivos que no tocaste.
3. Borra en el proyecto los que no tienen cambios tuyos y vuelve a importar: así entran en el manifiesto.
4. Los que tienen cambios tuyos, pórtalos a mano sobre la versión nueva, o déjalos sabiendo que no recibirán arreglos.
