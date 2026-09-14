# Verificar y auditar

`larapack:verify` mira hacia dentro: que lo generado siga en su sitio y diga lo mismo que el contrato. `larapack:audit` mira hacia fuera: que el paquete encaje con los demás del ecosistema. Los dos salen con código distinto de cero cuando algo falla, así que sirven de puerta en la CI y de comprobación para un agente.

Ninguno intenta adivinar si una clase «tiene demasiada lógica»: esa clase de comprobación produce falsos positivos y acaba desactivándose. Sólo comprueban lo que es determinista.

## larapack:verify {#verify}

```bash
php vendor/bin/builder larapack:verify
php vendor/bin/builder larapack:verify --strict          # los avisos cuentan como fallo
php vendor/bin/builder larapack:verify --format=json
```

Lee `.larapack/manifest.json` y los archivos. No recibe el laraimport: la forma de cada modelo (sus acciones, si es inmutable, sus secretos) la saca de la `declaration` que el manifiesto guarda al generar.

| Comprobación | Nivel | Qué detecta |
|---|---|---|
| `empty-manifest` | aviso | El manifiesto no registra ningún modelo. O no se ha generado nada, o `.larapack/manifest.json` no está en la raíz que se está verificando. Es el único hallazgo en ese caso. |
| `missing-file` | error | Un archivo que se generó y ya no existe. |
| `customised` | info | Un archivo editado a mano desde que se generó: `--force` no lo tocará. |
| `inconsistent-entity` | aviso | A un modelo le falta un componente que tienen todos los demás modelos de su misma forma. |
| `route-prefix` | error | El `API_ROUTE_PREFIX` del contrato JS no coincide con el nombre que registra el `RouteServiceProvider`, o no está declarado. |
| `route-not-declared` | error | Una ruta, un método del controlador, un request o un componente de interfaz de una acción que el modelo no declara. |
| `immutable-write` | error | Un camino de escritura en un modelo `immutable`, o su modelo sin la guarda que rechaza modificaciones. |
| `secret-exposed` | error | Una columna `secret` que vuelve a salir. |

### Cada comprobación, en detalle

**`missing-file`** recorre todos los archivos del manifiesto, también los del paquete. Regenera con `--force` o retira la entrada del manifiesto.

**`customised`** es informativo: editar lo generado es lo normal en los huecos. Lo que hay que mirar es *qué* archivo aparece: un trait, una política o un listener están bien; un controlador, un archivo de rutas o el modelo son deriva.

**`inconsistent-entity`** sólo se evalúa con dos modelos o más, y compara cada modelo con los que declararon su misma forma: las mismas acciones y el mismo `immutable`. Un componente es la primera carpeta de la plantilla (`Policy`, `Requests`, `ModelView`…), y sólo cuenta el que tienen *todos* los demás de esa forma. Las metas no cuentan: que un modelo las tenga y otro no es una decisión.

**`route-prefix`** lee el `index.js` de cada modelo y espera `api.` + el namespace en minúsculas con puntos + el modelo en snake_case + `.`: `api.acme.catalogo.order_line.`, o `api.app.order_line.` en una aplicación. Si no coincide, el front llama a rutas que no existen sin que nada falle al compilar.

**`route-not-declared`** busca, para cada acción que el modelo *no* declara:

- en el archivo de rutas, un `->name('<nombre de ruta>')`;
- en el controlador, un método público con el nombre de la acción;
- el archivo `Http/Requests/<Model>/<Acción>Request.php`;
- en cada módulo de interfaz, sus componentes: `views/AdminView` y `widgets/DataTable` para `index`, `views/ShowView` para `show`, `forms/CreateForm` y `views/CreateView` para `create`, y `forms/EditForm` y `views/EditView` para `update`.

Existen porque alguien los escribió a mano. Declara la acción en el laraimport, o retíralos. En un modelo inmutable, las escrituras las cuenta `immutable-write`.

**`immutable-write`** busca esas mismas huellas para `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` y `bulkDelete`, y comprueba que el modelo conserve `static::updating(` y `static::deleting(` en `booted()`. Sin esa guarda, cualquier `save()` o `delete()` del propio código modifica una fila que no debería cambiar.

**`secret-exposed`**, para cada columna `secret`, falla si:

- no está en `$hidden` del modelo;
- está en `$export_cols`;
- el recurso la nombra (`->token_hash`, `makeVisible('token_hash')` o una clave `'token_hash' =>`), aunque esté en `$hidden`;
- es columna de la tabla en el contrato JS (`id: 'token_hash'`).

### Qué hacer con el resultado

- **Sale con 1** si hay algún error, o algún aviso con `--strict`. `customised` nunca hace fallar.
- **La salida JSON** tiene la forma de [la salida de larapack:verify](/larapack/comandos#json-verify).
- Un agente ha terminado cuando `verify` sale con 0 y sólo marca como `customised` los huecos.

## larapack:audit {#audit}

```bash
php vendor/bin/builder larapack:audit                     # el paquete actual
php vendor/bin/builder larapack:audit packages --all      # cada paquete de un directorio
php vendor/bin/builder larapack:audit --format=json --strict
```

Compara el paquete con la **línea base**: el `ecosystem.json` del LaraPack que ejecuta el comando. Actualizar LaraPack actualiza la línea base.

```json
{
    "php": { "require": "^8.3", "matrix": ["8.3", "8.4"] },
    "laravel": { "illuminate": "^13.0", "testbench": "^11.0" },
    "dev": { "phpunit/phpunit": "^12.0 || ^13.0", "laravel/pint": "^1.18", "larastan/larastan": "^3.0" },
    "node": { "engines": ">=20", "ci": "22" },
    "js": { "vite": "^7.1.0", "vitest": "^3.0.0", "vue": "^3.5.0", "react": "^19.0.0" },
    "internal": {
        "innoboxrr/larapack-generator": "^7.10",
        "innoboxrr/traits": "^2.1",
        "innoboxrr/support": "^2.1",
        "innoboxrr/search-surge": "^3.0"
    },
    "internalNpm": { "innoboxrr-form-core": "^2.8.0", "…": "…" },
    "generated": { "require": { "laravel/sanctum": "^4.3", "maatwebsite/excel": "^4.0" } },
    "required": {
        "composer": ["name", "description", "license", "autoload"],
        "npm": ["name", "version", "license", "type", "exports", "files", "sideEffects"]
    },
    "workflows": { "composer": ["tests.yml", "release.yml"], "npm": ["tests.yml", "release.yml"] }
}
```

(Extracto; `internalNpm` son las versiones que declara el módulo generado, y `generated`, lo que `larapack:new` añade a `require`.)

El audit detecta solo qué es el directorio: si tiene `composer.json` lo audita como paquete de Composer, si tiene `package.json` como paquete npm, y si tiene los dos, de las dos formas.

### Comprobaciones de Composer

| Código | Nivel | Qué detecta |
|---|---|---|
| `composer-field` | aviso | Falta `name`, `description`, `license` o `autoload`. |
| `composer-version` | error | `composer.json` fija `version`. Composer descarta cada tag que no coincide con ella, así que una versión nueva quedaría invisible. |
| `php-missing` | error | `require` no declara `php`. |
| `php-version` | según la [regla](#la-regla-de-las-restricciones) | La restricción de `php` frente a `^8.3`. |
| `illuminate-missing` | error | El paquete usa Laravel y no declara ningún `illuminate/*` ni `laravel/framework`. Usa Laravel si algún `src/*.php` menciona `Illuminate\`, o si tiene `src/Providers`, `database/migrations` o `routes`. |
| `illuminate-version` | según la regla | Cada `illuminate/*` o `laravel/framework`, en `require` o `require-dev`, frente a `^13.0`. |
| `testbench-version` | según la regla | `orchestra/testbench`, si se declara, frente a `^11.0`. |
| `internal-version` | según la regla | Cada dependencia de `internal` que se declare, en `require` o `require-dev`. |
| `phpunit-config` | error | No hay `phpunit.xml` ni `phpunit.xml.dist`. |
| `no-tests` | error | No hay ningún `*Test.php` en `tests/`. |
| `workflow-missing` | error | Falta `.github/workflows/tests.yml` o `release.yml`. |
| `bump-patch` | error o aviso | Queda `bump-patch.yml`. Es error si publica sin esperar a los tests, y aviso si espera a ellos con `workflow_run` o `needs: tests`: tiene puerta, pero deriva la versión del último tag en vez de declararla. |

### Comprobaciones de npm

| Código | Nivel | Qué detecta |
|---|---|---|
| `npm-field` | aviso | Falta `name`, `version`, `license`, `type`, `exports`, `files` o `sideEffects`. `sideEffects: false` cuenta como declarado. |
| `node-engines` | aviso | `engines.node` no es exactamente `>=20`. |
| `js-version` | según la regla | `vite`, `vitest`, `vue` o `react` en `dependencies` o `devDependencies`. Las `peerDependencies` no se comprueban: dicen contra qué puede funcionar la librería, y exigirles la línea base las estrecharía sin ganar nada. |
| `workflow-missing` | error | Falta `tests.yml` o `release.yml`. |
| `bump-patch` | error o aviso | Igual que en Composer. |

Un directorio sin `composer.json` ni `package.json` da `not-a-package` (aviso).

::: tip El módulo generado no se audita solo
El audit lee el `composer.json` y el `package.json` de la ruta que recibe. El `package.json` de `resources/vue` o `resources/react` sólo se audita si pasas esa ruta; sus versiones `innoboxrr-*` son las de `internalNpm`, y pide Vite 8, mientras que la línea base `js` es la de los paquetes npm del ecosistema, que siguen en Vite 7.
:::

### La regla de las restricciones {#la-regla-de-las-restricciones}

Lo que importa no es que el texto coincida, sino qué versiones admite la restricción. Hay tres casos:

| Caso | Qué significa | Resultado |
|---|---|---|
| **Exacta** | Admite justo la línea base. | Nada. |
| **Ancha** | Admite la línea base y además versiones fuera de ella. | Aviso: es legítimo, pero la matriz de CI tiene que cubrir de verdad lo que promete. |
| **Estrecha** | No admite toda la línea base. | Error: el paquete no se podría instalar donde el ecosistema dice que funciona. |

Con la línea base de `php` en `^8.3`: `^8.3` es exacta, `^8.2` es ancha y `^8.4` es estrecha. Con `illuminate/support` en `^13.0`, una librería que declara `^12.0 || ^13.0` es ancha. Una restricción que no se puede leer da un aviso con el mismo código.

### Pedir un parche concreto: el patrón `conflict`

A veces un paquete necesita un arreglo de un parche, por ejemplo LaraPack 7.10.2. Subir `require` a `^7.10.2` es **estrecho** frente a la línea base `^7.10` y bloquea la publicación. Lo correcto es mantener `require` en la línea base y excluir lo anterior con `conflict`, que el audit no compara:

```json
{
    "require-dev": {
        "innoboxrr/larapack-generator": "^7.10"
    },
    "conflict": {
        "innoboxrr/larapack-generator": "<7.10.2"
    }
}
```

Composer no instalará una versión anterior al arreglo y el audit sigue en verde.

### En la CI

- **Sale con 1** si hay algún error, o algún aviso con `--strict`, y también si la ruta no existe.
- `tests.yml` del ecosistema lo ejecuta antes de la suite, así que un paquete que no cumple la línea base no llega a publicarse. Ver [La línea base](/ci/) y [Los workflows](/ci/workflows).
- Antes de empujar, ejecútalo en local: `php vendor/innoboxrr/larapack-generator/builder larapack:audit .`
- La salida JSON tiene la forma de [la salida de larapack:audit](/larapack/comandos#json-audit).
