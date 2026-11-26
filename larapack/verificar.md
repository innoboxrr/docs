# Verificar y auditar

`larapack:verify` mira hacia dentro: que lo generado siga en su sitio y diga lo mismo que el contrato, y que ningún controlador del proyecto haga más que delegar en su request. `larapack:audit` mira hacia fuera: que el paquete encaje con los demás del ecosistema. Los dos salen con código distinto de cero cuando algo falla, así que sirven de puerta en la CI y de comprobación para un agente.

Ninguno intenta adivinar si una clase «tiene demasiada lógica»: esa clase de comprobación produce falsos positivos y acaba desactivándose. Sólo comprueban lo que es determinista, y leen los archivos con el tokenizador de PHP: nunca cargan ni ejecutan código del proyecto.

## larapack:verify {#verify}

```bash
php vendor/bin/builder larapack:verify
php vendor/bin/builder larapack:verify --strict          # los avisos cuentan como fallo
php vendor/bin/builder larapack:verify --format=json
php vendor/bin/builder larapack:verify --check=controller-shape --check=request-handle   # sólo esas
```

`--check` se repite para correr varias; un nombre que no existe falla en vez de dar un verde falso. Las opciones están en [Comandos](/larapack/comandos#larapack-verify).

Hay dos familias de comprobaciones. Las primeras leen `.larapack/manifest.json`; las segundas recorren todo el código, lo haya generado LaraPack o no.

### Contra el manifiesto {#manifiesto}

No recibe el laraimport: la forma de cada modelo (sus acciones, sus endpoints, si es inmutable, sus secretos) la saca de la `declaration` que el manifiesto guarda al generar.

| Comprobación | Nivel | Qué detecta |
|---|---|---|
| `empty-manifest` | aviso | El manifiesto no registra ningún modelo. O no se ha generado nada, o `.larapack/manifest.json` no está en la raíz que se está verificando. Desde 9.1 no avisa a un paquete sin modelos que tiene registrados sus proveedores —una pasarela, una integración—: lo registrado se sigue comprobando. |
| `missing-file` | error | Un archivo que se generó y ya no existe. |
| `customised` | info | Un archivo editado a mano desde que se generó: `--force` no lo tocará. |
| `inconsistent-entity` | aviso | A un modelo le falta un componente que tienen todos los demás modelos de su misma forma. |
| `route-prefix` | error | El `API_ROUTE_PREFIX` del contrato JS —el de un modelo o el de un `controllers[]`— no coincide con el nombre que registra el `RouteServiceProvider`, o no está declarado. |
| `route-not-declared` | error | Una ruta, un método del controlador, un request o un componente de interfaz de una acción o un endpoint que el modelo no declara. |
| `endpoint-missing` | error | A un [endpoint declarado](/larapack/endpoints) le falta una pieza: su método, su ruta, su request, su habilidad, su operación o, con interfaz, su función en el contrato JS. |
| `immutable-write` | error | Un camino de escritura en un modelo `immutable`, o su modelo sin la guarda que rechaza modificaciones. |
| `secret-exposed` | error | Una columna `secret` que vuelve a salir. |

<!-- revisar tras integrar 9.1 -->

LaraPack 9.1 añade además `endpoint-tests-outdated` (aviso): un `<Modelo>EndpointsTest` de antes de 9.1, sin las pruebas que cierran la autorización (ver [Lo que prueban los tests generados](#tests-generados)). Ese test no está en el manifiesto ni se regenera, así que el mensaje dice cómo traerlas: guardar lo añadido, borrarlo, `larapack:import` y volver a pegarlo. Como es aviso, con `--strict` pone `verify` en rojo hasta que se haga.

### Sobre todo el código {#controladores}

Recorre cada clase de cualquier `Http/Controllers`, `Http/Requests` y `Http/Resources` de la raíz y de los paquetes locales (los repositorios `path` del `composer.json` y `packages/*`), y los archivos de `routes/`. Funciona aunque no haya manifiesto.

| Comprobación | Nivel | Qué detecta |
|---|---|---|
| `controller-shape` | error | Una acción de controlador que hace algo más que `return $request->handle();`: recibe `Illuminate\Http\Request` o el `FormRequest` base, valida con `validate()`, pasa una expresión a `handle()`. También un `__call`, un constructor que hace algo más que asignar lo inyectado y registrar middleware, y un `middleware()` estático con un closure. |
| `request-handle` | error | La request que recibe la acción no define `handle()`, ni en sí ni en un trait o un padre. Una de `vendor/` sólo se informa. |
| `controller-concern` | error o aviso | Un trait con lógica en `Http/Controllers`. Error si lo usa un controlador; aviso si sólo lo usan requests: su sitio es `Http/Requests/Concerns`. |
| `hand-rolled` | aviso o info | Una acción marcada [`#[HandRolled('razón')]`](#handrolled). Aviso sin candado; info si el dueño la aprobó. Sin razón literal es error y no excusa nada. |
| `hand-rolled-unapproved` | error | Con candado: una excepción que no está aprobada, o cuya razón cambió desde que se aprobó. |
| `hand-rolled-stale` | aviso | Con candado: una aprobación de algo que ya no lleva `#[HandRolled]`. |
| `route-closure` | aviso | Un closure con cuerpo como acción de una ruta en `routes/`. No cuentan los de `group()` ni el `return view('...')` con el que nace `routes/web.php`. |
| `index-managed` | aviso | Una request que usa el `Builder` de SearchSurge sin forzar `managed`: el listado se salta `ManagedFilter::canView()`. `mergeIfMissing` no cuenta. |
| `resource-appends` | aviso | Un `setAppends()` alimentado por la petición sin pasar por una lista blanca: el cliente decide qué accessor se ejecuta en cada fila. |

**`controller-shape` es el único dueño de «el controlador hace algo más que delegar»**, en los generados y en los escritos a mano. No hay una comprobación aparte para los generados: el mismo problema saldría dos veces y con dos reglas.

**Qué no mira, a propósito.** Un componente de Livewire, un recurso de Filament o un controlador fuera de `Http/Controllers` no reciben un FormRequest ni delegan en su `handle()`: exigirles esa forma sería un falso positivo en cada archivo.

### Cada comprobación, en detalle

**`missing-file`** recorre todos los archivos del manifiesto, también los del paquete. Regenera con `--force` o retira la entrada del manifiesto.

**`customised`** es informativo: editar lo generado es lo normal en los huecos. Lo que hay que mirar es *qué* archivo aparece: un trait, una política o un listener están bien; un controlador, un archivo de rutas o el modelo son deriva.

**`inconsistent-entity`** sólo se evalúa con dos modelos o más, y compara cada modelo con los que declararon su misma forma: las mismas acciones y el mismo `immutable`. Un componente es la primera carpeta de la plantilla (`Policy`, `Requests`, `ModelView`…), y sólo cuenta el que tienen *todos* los demás de esa forma. Las metas y las piezas de los endpoints no cuentan: cada modelo declara las suyas.

**`route-prefix`** lee el `index.js` de cada modelo y espera `api.` + el namespace en minúsculas con puntos + el modelo en snake_case + `.`: `api.acme.catalogo.order_line.`, o `api.app.order_line.` en una aplicación. Si no coincide, el front llama a rutas que no existen sin que nada falle al compilar.

**`route-not-declared`** busca, para cada acción que el modelo *no* declara:

- en el archivo de rutas, un `->name('<nombre de ruta>')`, y también una ruta sin nombre;
- en el controlador, un método público con el nombre de la acción (un `__invoke`, un constructor que inyecta un servicio);
- el archivo `Http/Requests/<Model>/<Acción>Request.php`;
- en cada módulo de interfaz, sus componentes: `views/AdminView` y `widgets/DataTable` para `index`, `views/ShowView` para `show`, `forms/CreateForm` y `views/CreateView` para `create`, y `forms/EditForm` y `views/EditView` para `update`.

Lo mismo con lo que ningún endpoint declara. Distingue dos orígenes del mismo rastro, porque el manifiesto lo sabe: si alguien lo escribió a mano, pide declararlo en el laraimport; si lo generó LaraPack para algo que ya no está declarado, pide regenerar con `--force` para quitarlo. En un modelo inmutable, las escrituras las cuenta `immutable-write`.

**`immutable-write`** busca esas mismas huellas para `update`, `delete`, `restore`, `forceDelete`, `bulkUpdate` y `bulkDelete`, y comprueba que el modelo conserve `static::updating(` y `static::deleting(` en `booted()`. Sin esa guarda, cualquier `save()` o `delete()` del propio código modifica una fila que no debería cambiar.

**`secret-exposed`**, para cada columna `secret`, falla si:

- no está en `$hidden` del modelo;
- está en `$export_cols`;
- el recurso la nombra (`->token_hash`, `makeVisible('token_hash')` o una clave `'token_hash' =>`), aunque esté en `$hidden`;
- es columna de la tabla en el contrato JS (`id: 'token_hash'`).

**`index-managed` y `resource-appends`** encuentran lo que se generó antes de 9.0, y lo que alguien copie de ello: lo que se genera ahora ya sale protegido. Los arregla [`larapack:fix`](#fix).

### El controlador escrito a mano {#escrito-a-mano}

La regla es la misma que en los generados: **la acción es `return $request->handle();`**. Un endpoint que no es CRUD [se declara](/larapack/endpoints). Si de verdad tiene que escribirse a mano —un webhook, un canje de tokens—, la autorización va en `authorize()`, la validación en `rules()` y el trabajo en `handle()` de un `FormRequest` propio, que delega en la operación del modelo o en una clase de soporte. Si el protocolo dicta la forma del error —OAuth2, LTI, la firma de un webhook—, se sobrescriben `failedValidation()` o `failedAuthorization()` en la request, y la firma sobre el cuerpo en bruto se comprueba ahí con `$this->getContent()`. Un trait de autorización compartido va en `Http/Requests/Concerns`.

Por qué importa: en una aplicación real de decenas de paquetes, los controladores generados quedaron todos en `return $request->handle();`, y los que se escribieron a mano —un escritorio, el canje de un token, un webhook— acabaron con validación, autorización y consultas dentro, más diecinueve traits de autorización en `Http/Controllers`. Una regla escrita se cumple mientras alguien la recuerda; `controller-shape` la convierte en un error.

### Excepciones: `#[HandRolled]` y su candado {#handrolled}

Lo que no puede seguir el patrón —comprobar la firma sobre el cuerpo en bruto, un canje OAuth que responde con los errores de OAuth— se marca en la clase o en la acción:

```php
use Innoboxrr\LarapackGenerator\Attributes\HandRolled;

#[HandRolled('La firma se calcula sobre el cuerpo en bruto.')]
class StripeWebhookController extends Controller { ... }
```

**No es un arreglo que un agente aplique para pasar.** Es una excepción que aprueba el dueño del proyecto, y sigue a la vista. Los mensajes de `controller-shape` no la ofrecen como salida, y la guía para agentes les dice que no la añadan.

**En 9.0**, `verify` la lista como aviso en cada ejecución, y con `--strict` falla.

**Desde 9.1, la aprobación es un archivo**: `.larapack/hand-rolled.lock`, una lista JSON de `{target, reason}`, ordenada y estable byte a byte, que el dueño mantiene con [`larapack:hand-rolled`](/larapack/comandos#larapack-hand-rolled) y comitea. `target` es `Clase` o `Clase::metodo`, con el nombre completo.

```bash
php artisan larapack:hand-rolled list                            # cada excepción y su estado
php artisan larapack:hand-rolled approve --all                   # o una a una:
php artisan larapack:hand-rolled approve TokenController::store  # basta el final del nombre
php artisan larapack:hand-rolled revoke StripeWebhookController
```

<!-- revisar tras integrar 9.1 -->

El candado guarda la razón junto al objetivo, y en 9.1 también una huella del código aprobado: cambiar la razón, añadir una acción a una clase aprobada o cambiar una sentencia deja la excepción sin aprobar, y el diff del candado que la vuelve a aprobar es lo que se revisa. Aprobar un nombre a secas sería un cheque en blanco: la clase cubriría cada acción que se le añadiera después.

| Comprobación | Sin candado | Con candado |
|---|---|---|
| `hand-rolled` | aviso: `--strict` falla | info si está aprobada: `--strict` pasa |
| `hand-rolled-unapproved` | — | error: no está en el candado, o cambió lo aprobado. También un candado ilegible, que deja todo sin aprobar |
| `hand-rolled-stale` | — | aviso: el candado aprueba algo que ya no lleva `#[HandRolled]`; se retira con `revoke` |

Sin candado, un proyecto en 9.1 se comporta como en 9.0: nada cambia hasta que el dueño lo crea. El candado es de la raíz sobre la que corre `verify`: un paquete que corre `verify --strict` en su propio repositorio lleva el suyo.

**Quién toca el candado lo deciden dos cosas**, y ninguna depende de que alguien se acuerde:

- **CODEOWNERS y la rama protegida.** `larapack:ci --owner=@equipo` pone el candado, el workflow y el propio CODEOWNERS bajo la revisión del dueño. Ver [En la CI](#ci).
- **La guardia, para los agentes.** El hook de `larapack:guard --pre` bloquea la edición del candado y las órdenes que corren `approve` o `revoke`. No es infranqueable —un agente puede escribir el archivo por otra vía—: la barrera real es la revisión del dueño. Ver [Desarrollo con IA](/ia/#guardia).

### Arreglar lo viejo: `larapack:fix` {#fix}

`index-managed` y `resource-appends` se arreglan solos:

```bash
php artisan larapack:fix index-managed resource-appends --dry-run   # el diff de cada archivo
php artisan larapack:fix index-managed resource-appends             # escribe
php artisan larapack:verify --check=index-managed --check=resource-appends
```

Hace en cada archivo el mismo cambio, sacado de la plantilla actual: en el IndexRequest, `$this->merge(['managed' => true])` al principio de `prepareForValidation()` (lo crea si falta, y si hereda uno lo llama); en el Resource, el bloque de `$appendable` en lugar del `setAppends()` viejo, y la propiedad si falta.

- **Sólo toca lo que viene del generador.** Lee tokens, no busca con expresiones regulares. Lo que no tiene la forma generada lo deja y lo lista como `skipped` con su razón, y entonces sale con código distinto de cero. La lógica propia que haya alrededor no se pierde.
- **Es idempotente.** Nada cuenta como arreglado hasta que parsea y `verify` ya no lo marca: correrlo dos veces no cambia nada la segunda.
- **Pasa el Pint del proyecto** por lo que escribió, si lo tiene. En una aplicación real de 80 paquetes arregló más de quinientos IndexRequests y casi setecientos Resources sin saltarse ninguno.

Además reporta dos cosas **sin arreglarlas**, que no cambian el código de salida:

- **`admin_path_missing`** (en `index-managed`): los `ManagedFilter` cuyo `canView()` no tiene camino para el administrador. Con `managed` forzado, `canView()` acota a todos —el `before()` de la política no lo salta— y el administrador vería el listado vacío. Cuenta como camino un `return $query;` en una rama o una llamada reconocible de alcance completo (`unrestricted`, `isUnrestricted`, `viewAny`, `isAdmin`), también en los soportes que `canView()` llama. Los filtros que no se localizan salen en `managed_filter_unresolved`. **Es una heurística de lectura, no una prueba**: se revisa a mano.
- **`appendable_proposals`** (en `resource-appends`): por Resource, los accessors que el front pide con `appends` (`appends[]=x`, `appends: [...]`, `params.appends`…), con `exists` según el modelo los declare. Son propuestas sin confirmar: `larapack:fix` nunca las escribe en `$appendable`, porque una lista mal hecha deja de mostrar un dato en pantalla.

### Lo que prueban los tests generados {#tests-generados}

`verify` comprueba la forma; la autorización la prueban los tests. Cada `<Modelo>EndpointsTest` abre la autorización para probar que cada acción responde, y desde 9.1 trae además tres pruebas que pasan tal como salen y no dependen de lo que decida la política:

| Test | Qué caza |
|---|---|
| `test_<modelo>_cada_accion_requiere_sesion` | Una acción que responde sin sesión: cada una tiene que dar 401. |
| `test_<modelo>_cada_accion_pregunta_a_la_politica` | Un `authorize()` que no pregunta: con sesión y la autorización negando, cada acción da 403. |
| `test_<modelo>_index_pasa_por_su_managed_filter` | Un listado sin acotar: un `IndexRequest` que no fuerza `managed`, o un `ManagedFilter` que SearchSurge no encuentra. |

El test de cada endpoint declarado gana lo mismo: 403 con sesión y la autorización negando, también en los públicos y en los `controllers[]`. Qué deja ver tu `canView()` y qué decide tu política son huecos: se prueban en tests tuyos, con los usuarios de tu dominio.

### Qué hacer con el resultado

- **Sale con 1** si hay algún error, o algún aviso con `--strict`. `customised` y lo aprobado en el candado nunca hacen fallar.
- **La salida JSON** tiene la forma de [la salida de larapack:verify](/larapack/comandos#json-verify).
- Un agente ha terminado cuando `verify` sale con 0, sólo marca como `customised` los huecos y ningún controlador suyo hace más que `return $request->handle();`.

### En la CI: `verify --strict` como check obligatorio {#ci}

La guardia actúa mientras un agente tiene los hooks; la barrera que no depende de nadie es la rama protegida. Desde 9.1, `larapack:ci` deja `verify --strict` como check de la rama:

```bash
php artisan larapack:ci --dry-run
php artisan larapack:ci --owner=@acme/arquitectura
```

1. **Crea `.github/workflows/larapack.yml`** con un job, **«LaraPack verify»**, que corre `larapack:verify --strict --format=json` en cada `pull_request` y en cada `push` a la rama por defecto. Elige el PHP de `config.platform.php` o el mínimo con el que se instala `composer.lock`, y las `ext-*` del `composer.json`. No edita ningún otro workflow, y si el suyo difiere no lo pisa sin `--force`: enseña el diff y sale con 1.
2. **Con `--owner`** (repetible) fusiona en CODEOWNERS el candado, el workflow y el propio CODEOWNERS, sin duplicar ni tocar líneas ajenas. Sin `--owner` no inventa un dueño.
3. **Imprime lo que no puede hacer**: proteger la rama exigiendo el check y la revisión de los dueños de código (*Require review from Code Owners*), con la orden `gh api --method PUT …/branches/<rama>/protection` para que la corra el dueño. Nunca la ejecuta.

El nombre del job es el nombre del check: si alguien lo cambia, la protección espera un check que ya no llega y bloquea todo. El check sólo se puede exigir cuando GitHub ya lo vio, así que primero se comitea y se deja correr una vez.

<!-- revisar tras integrar 9.1 -->

Dos ajustes de 9.1 para que la puerta no tenga puerta trasera:

- **Que tampoco un administrador se la salte.** Con `enforce_admins` en `false`, quien empuja como administrador pasa sin el check ni la revisión, y GitHub sólo lo anota: es el caso de un orquestador que sube a la rama con la cuenta del dueño. La orden que imprime `larapack:ci` lo pide en `true`, y `--no-enforce-admins` lo quita avisando. El precio es que GitHub no deja aprobar un PR propio: los PR del agente tienen que salir de una cuenta que no sea la del único dueño de código.
- **Los runners del proyecto.** `--runs-on` (repetible, o una lista JSON) pone el job en los runners que ya usa el proyecto. Un job que no arranca deja el check exigido sin llegar y nada se fusiona; y en un monorepo donde `verify` tarda minutos, el runner alojado los cobra en cada PR.

Un paquete creado con `larapack:new` trae el mismo job en su `tests.yml`, y `larapack:audit` avisa con `verify-job` cuando la CI de un paquete que usa LaraPack no corre `verify --strict`. Ver [Los workflows](/ci/workflows#verify).

## larapack:audit {#audit}

```bash
php vendor/bin/builder larapack:audit                     # el paquete actual
php vendor/bin/builder larapack:audit packages --all      # cada paquete de un directorio
php vendor/bin/builder larapack:audit --format=json --strict
```

Compara el paquete con la **línea base**: el `ecosystem.json` del LaraPack que ejecuta el comando. Actualizar LaraPack actualiza la línea base.

```json
{
    "php": { "require": "^8.3", "matrix": ["8.3", "8.4", "8.5"] },
    "laravel": { "illuminate": "^13.0", "testbench": "^11.0" },
    "dev": { "phpunit/phpunit": "^12.0 || ^13.0", "laravel/pint": "^1.18", "larastan/larastan": "^3.0" },
    "node": { "engines": ">=22.12", "ci": "22" },
    "js": { "vite": "^8.0.0", "vitest": "^5.0.0", "vue": "^3.5.0", "react": "^19.0.0" },
    "internal": {
        "innoboxrr/larapack-generator": "^9.0",
        "innoboxrr/traits": "^2.1",
        "innoboxrr/support": "^2.1",
        "innoboxrr/search-surge": "^3.0"
    },
    "internalNpm": { "innoboxrr-form-core": "^2.9.0", "…": "…" },
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
| `verify-job` | aviso | El paquete usa LaraPack y ningún workflow corre `larapack:verify --strict`. Desde 9.1. Se añade con `larapack:ci` o copiando el job de un paquete recién creado. |

### Comprobaciones de npm

| Código | Nivel | Qué detecta |
|---|---|---|
| `npm-field` | aviso | Falta `name`, `version`, `license`, `type`, `exports`, `files` o `sideEffects`. `sideEffects: false` cuenta como declarado. |
| `node-engines` | aviso | `engines.node` no es exactamente `>=22.12`. |
| `js-version` | según la regla | `vite`, `vitest`, `vue` o `react` en `dependencies` o `devDependencies`. Las `peerDependencies` no se comprueban: dicen contra qué puede funcionar la librería, y exigirles la línea base las estrecharía sin ganar nada. |
| `workflow-missing` | error | Falta `tests.yml` o `release.yml`. |
| `bump-patch` | error o aviso | Igual que en Composer. |

Un directorio sin `composer.json` ni `package.json` da `not-a-package` (aviso).

::: tip El módulo generado no se audita solo
El audit lee el `composer.json` y el `package.json` de la ruta que recibe. El `package.json` de `resources/vue` o `resources/react` sólo se audita si pasas esa ruta; sus versiones `innoboxrr-*` son las de `internalNpm`, y pide Vite 8. La línea base `js` es la de los paquetes npm del ecosistema, que desde 9.0 también van en Vite 8, con Vitest 5.
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
