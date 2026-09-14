# El ciclo del agente

Siempre en el mismo orden. Cada paso tiene un comando y un código de salida, así
que el agente comprueba su propio trabajo sin preguntar.

```
0. larapack:new vendor/paquete         sólo si el paquete aún no existe
1. larapack:schema                     descubre el contrato, no lo adivina
2. escribe o edita laraimport.json
3. larapack:validate --format=json     falla → corrige el JSON, no el código
4. larapack:import --dry-run           mira qué va a tocar
5. larapack:import [--vue] [--react]   genera
6. rellena los huecos                  aquí sí escribe código
7. larapack:verify --format=json       falla → algo se salió del contrato
8. vendor/bin/phpunit                  el comportamiento
9. larapack:audit                      si es un paquete
```

## Cómo se invocan

::: code-group

```bash [En una aplicación]
php artisan larapack:validate --format=json
```

```bash [En un paquete, o fuera de Laravel]
php vendor/bin/builder larapack:validate --format=json
```

:::

El binario `builder` mantiene los nombres antiguos (`make:*`, `json:importer`,
`remove:full-model`) como alias. En Artisan no se registran, porque
`make:model`, `make:policy`, `make:factory` y `make:observer` son de Laravel.

### Sobre qué proyecto trabaja

Sin `--root`, la raíz se descubre subiendo directorios desde LaraPack hasta dar
con un `vendor/autoload.php`. Dentro de una aplicación o de un paquete que lo tiene
instalado, eso da la raíz correcta. Con el binario sobre un clon del propio
generador, da el generador.

Cuando haya duda, el agente pasa `--root=<ruta>`: una raíz que no existe hace
fallar el comando en lugar de escribir en el sitio equivocado.

### Qué opciones acepta cada comando

::: warning Atención
El README y la skill dicen que **todos** los comandos aceptan `--root` y
`--format=json`. No es así. Esta tabla es la que vale:
:::

| Comando | `--format=json` | `--root` | Otras opciones |
|---|---|---|---|
| `larapack:new` | Sí | No: el directorio es un argumento | `name`, `[directory]`, `--namespace`, `--description`, `--license=MIT`, `--dry-run` |
| `larapack:schema` | No: siempre imprime JSON | No | `--path` |
| `larapack:validate` | Sí | Sí | `[archivo]`, `--strict`, `--vue`, `--react` |
| `larapack:import` | Sí | Sí | `[archivo]`, `--vue`, `--react`, `--force`, `--dry-run` |
| `larapack:verify` | Sí | Sí | `--strict` |
| `larapack:audit` | Sí | No: la ruta es un argumento, `.` por omisión | `--all`, `--strict` |
| `larapack:skill` | No | Sí | `--path`, `--print`, `--source`, `--force` |
| Generadores sueltos (`larapack:model`, `larapack:full-model`, `larapack:policy`…) | Sí | Sí | `--force`, `--dry-run` |
| `larapack:remove-full-model` | No | Sí | `--vue`, `--react` |

Una opción que un comando no tiene es un error de la consola en texto, no un
documento JSON: `larapack:schema --format=json` no devuelve un `{"ok": false}`.

### Códigos de salida

| Comando | Sale con 0 | Sale con 1 |
|---|---|---|
| `larapack:validate` | Sin errores | Hay errores, o avisos con `--strict` |
| `larapack:import` | Generó (o simuló) | El laraimport no es válido: no escribe nada |
| `larapack:verify` | Sin errores | Hay errores, o avisos con `--strict` |
| `larapack:audit` | Sin errores | Hay errores, avisos con `--strict`, o la ruta no existe |
| `larapack:new` | Creó (o simuló) | Nombre o namespace inválidos, o el directorio ya tiene `composer.json` |
| `larapack:skill` | Siempre, **también si no sobrescribió** | Sólo si no pudo ejecutarse |

En cualquier comando con `--format=json`, lo que falla antes o durante la ejecución
—un argumento que falta, una raíz que no existe— llega como documento y con código
1:

```json
{
    "ok": false,
    "error": "…"
}
```

Cuando el fallo fue una excepción, el documento añade `exception` con su clase.

## Paso a paso

### 0. Crear el paquete

Sólo si todavía no existe:

```bash
php vendor/bin/builder larapack:new acme/catalogo packages/catalogo --format=json
```

`--dry-run` construye el paquete en un directorio temporal, informa y lo borra:
dice exactamente lo que crearía. El informe tiene la misma forma que el de
`larapack:import`. Ver [Un paquete nuevo](/empezar/paquete-nuevo).

### 1. Leer el contrato

```bash
php vendor/bin/builder larapack:schema          # el JSON Schema completo
php vendor/bin/builder larapack:schema --path   # sólo la ruta del archivo
```

**Se lee antes de escribir el archivo.** No se deduce el formato de un ejemplo.
Para que el editor valide mientras escribes, apunta `$schema` a esa ruta:

```json
{
    "$schema": "./vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": []
}
```

### 2. Escribir `laraimport.json`

Lo único obligatorio:

```json
{
    "models": [
        {
            "name": "Category",
            "props": [
                { "name": "name", "type": "string" }
            ]
        }
    ]
}
```

Todo lo demás tiene valor por defecto. **Se declara sólo lo que se decide de
verdad**: rellenar las veinte claves de cada propiedad con su valor por defecto
hace el archivo ilegible y no cambia nada. Las claves están en
[El contrato: laraimport.json](/larapack/laraimport).

### 3. Validar

```bash
php vendor/bin/builder larapack:validate --vue --format=json
```

Comprueba la **forma** contra el esquema y la **coherencia** del documento entero:
modelos o columnas repetidos, ciclos de claves foráneas, relaciones que no
resuelven, un `UpdateRequest` sin la regla `<model>_id`, `only` junto a `except`,
un `immutable` que pide escribir, un `secret` que pide salir en la tabla… Con
`--vue` o `--react` avisa también de lo que las vistas necesitan y el modelo no
declara.

| Campo | Qué es |
|---|---|
| `ok` | `false` si hay errores, o avisos con `--strict` |
| `file` | La ruta del archivo validado |
| `errors`, `warnings` | Cuántos hay de cada |
| `models` | Los nombres de los modelos **en orden de migración**; vacío si el documento no llegó a construirse |
| `findings[]` | `level` (`error` o `warning`), `path` (dónde, dentro del archivo: `/models/0/props`) y `message` |

**Un error de validación se corrige en el JSON.** Nunca generando igualmente y
parcheando el resultado.

### 4. Mirar qué va a tocar

```bash
php vendor/bin/builder larapack:import --vue --dry-run --format=json
```

No escribe nada: dice qué haría.

### 5. Generar

::: code-group

```bash [Primera vez]
php vendor/bin/builder larapack:import --vue --format=json
```

```bash [Ampliar lo que ya existe]
php vendor/bin/builder larapack:import --vue --force --format=json
```

:::

Sin `--force`, un archivo que ya existe se omite. Con `--force` se regenera
**salvo** que se haya editado a mano: entonces se conserva y se informa. Por eso
ampliar un modelo ya generado se hace con `--force`.

El informe:

```json
{
    "ok": true,
    "dryRun": false,
    "formatted": 41,
    "summary": { "create": 58, "overwrite": 0, "skipped": 0, "preserved": 0 },
    "files": [
        { "action": "create", "file": "src/Models/Category.php", "stub": "…", "reason": null }
    ],
    "findings": []
}
```

| Campo | Qué es |
|---|---|
| `dryRun` | Si fue una simulación |
| `formatted` | Archivos PHP formateados con Pint; `0` en simulación; `null` si hacía falta Pint y el proyecto no lo tiene |
| `summary` | Cuántos archivos se crearon, regeneraron, omitieron y **conservaron** |
| `files[]` | Qué pasó con cada archivo (`action`), desde qué plantilla (`stub`) y por qué (`reason`) |
| `findings` | Los avisos de validación, que ya no se imprimen aparte |

Si el laraimport no es válido, no se genera nada:

```json
{
    "ok": false,
    "error": "El laraimport no es válido; no se ha generado nada.",
    "findings": []
}
```

::: warning Atención
**Los conservados (`preserved`) no recibieron el cambio.** Se editaron a mano y
`--force` no los pisa. El agente tiene que llevar el cambio a mano a cada uno, o
decir que no lo hizo.
:::

Después de generar, en una aplicación:

```bash
php artisan migrate      # también las migraciones de alteración
php artisan route:json   # si hay endpoints nuevos
npm run build
```

Cambiar columnas de una tabla que ya existe también se hace en el JSON: al
reimportar, LaraPack escribe `<fecha>_alter_<tabla>_table.php`. Ver
[Migraciones y cambios de esquema](/larapack/migraciones).

### 6. Rellenar los huecos

Los únicos sitios donde se escribe código. Si la lógica no cabe en ninguno, falta
algo en `laraimport.json`, no hay que salirse.

| Hueco | Qué va ahí |
|---|---|
| `Traits/Operations/` | La lógica de negocio del modelo. Es el sitio por defecto. Con metas, también la forma de `payload` en `buildPayload()`. |
| `Traits/Relations/` | Relaciones que el JSON no declara (through, morph, condicionales). |
| `Traits/Storage/` | Subida y borrado de archivos del modelo. |
| `Traits/Mutators/` | Accessors y mutators. |
| `Filters/<Model>/ManagedFilter::canView` | **Quién puede ver qué.** Sin esto el índice lo devuelve todo. |
| `Policies/<Model>Policy` | Autorización por acción. Nace cerrada: sólo pasa el administrador, y ni él borra para siempre hasta sacar `forceDelete` de `$exceptAbilities`. |
| `Requests/*/rules()` | Reglas que no vengan del JSON, dentro del array. |
| `Resources/<Model>Resource` | La forma exacta de la respuesta y su array `actions`. |
| `Events/*/Listeners/` | Efectos secundarios: notificaciones, colas, integraciones. |
| `Observers/` | Ciclo de vida del modelo. |
| `Factories/` | Datos de prueba realistas. |
| `tests/Feature/` | El comportamiento, no la estructura. |

**El modelo es una fachada, no un almacén de lógica:** un método público en
`Operations` que orquesta, y el trabajo real en la clase que le corresponda.

### 7. Verificar

```bash
php vendor/bin/builder larapack:verify --format=json
```

Compara el árbol con `.larapack/manifest.json`:

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

| `check` | Nivel | Qué hacer |
|---|---|---|
| `missing-file` | error | Falta algo que se generó. Regenera. |
| `customised` | info | Un archivo generado se editó. Bien si es un hueco; deriva si no. |
| `inconsistent-entity` | aviso | Un modelo no tiene una pieza que tienen todos los de su misma forma. Casi siempre, un olvido. |
| `route-prefix` | error | El `API_ROUTE_PREFIX` del módulo no coincide con el `->as()` del `RouteServiceProvider`. |
| `route-not-declared` | error | Una ruta, un método, una request o una vista de una acción que el modelo no declara. Declárala en el JSON o retírala. |
| `immutable-write` | error | Un modelo `immutable` tiene un camino de escritura, o perdió la guarda de `booted()`. |
| `secret-exposed` | error | Una columna `secret` sale por la API, la exportación o la tabla. |
| `empty-manifest` | aviso | El manifiesto no registra nada: no se generó nada, o el proyecto no es el correcto. |

**Código distinto de cero = aún no has terminado.**

### 8. Probar

```bash
vendor/bin/phpunit
```

Los tests generados pasan recién generados y prueban que cada endpoint responde,
con la autorización abierta en el `TestCase`. Si uno falla, lo rompió el cambio.
La autorización se prueba aparte, contra la política. Los tests generados no se
sobrescriben nunca, tampoco con `--force`.

::: tip Consejo
Si la suite falla en local con «could not find driver», al PHP le falta SQLite:
`php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit`.
:::

### 9. Auditar (paquetes)

```bash
php vendor/bin/builder larapack:audit --format=json
```

Comprueba versiones, tests y workflows contra la línea base; la CI lo corre antes
de publicar. En un paquete creado con `larapack:new` corren además
`vendor/bin/pint --test` y `vendor/bin/phpstan analyse`: lo generado los pasa, así
que un fallo es algo escrito a mano. Ver [La línea base](/ci/).

## Leer la salida

La regla para el agente es **parsear el JSON, no raspar el texto**:

1. Decodifica la salida estándar entera como un único documento.
2. Mira el código de salida **y** `ok`.
3. Si hay `error`, el comando no llegó a ejecutarse: corrige la llamada (argumento,
   raíz, ruta), no el proyecto.
4. Recorre `findings` por `level`: los `error` bloquean, los `warning` se
   atienden o se justifican, los `info` se revisan.

```bash
out=$(php vendor/bin/builder larapack:verify --format=json); status=$?
echo "$out" | jq '.findings[] | select(.level == "error")'
echo "salida: $status"
```

## Lo que el agente debe hacer

Todo lo que la skill le pide, en una lista:

1. **Seguir el flujo en orden**, del esquema a la verificación.
2. **Leer el esquema** con `larapack:schema` antes de escribir `laraimport.json`,
   en lugar de deducir el formato de un ejemplo.
3. **Declarar sólo lo que decide de verdad.** El resto son los valores por defecto
   del esquema.
4. **Declarar con `routes`, `immutable` y `secret`** las tablas que no se
   administran desde un formulario: una bitácora que sólo se agrega, un catálogo
   que sólo se lee, una concesión que se otorga y se revoca.
5. **Corregir en el JSON** cualquier error de validación.
6. **Parsear `--format=json`** y pasar `--root` cuando la raíz no sea obvia.
7. **Validar con `--vue` o `--react`** cuando vaya a generar la interfaz.
8. **Mirar `larapack:import --dry-run`** antes de generar.
9. **Escribir la lógica sólo en los huecos**, con `Operations` como sitio por
   defecto y el modelo como fachada.
10. **Autorizar en la política** —no dentro del modelo, donde la API de políticas
    no lo ve y el front ofrece un botón que falla— y **decidir la visibilidad en
    `ManagedFilter::canView`**.
11. **Declarar en `load_relations`** toda relación que la API tenga que cargar.
12. **Incluir la regla `<model>_id` en `Update`**: `authorize()` y `handle()` hacen
    `findOrFail` con ella.
13. **Elegir columna o meta con criterio.** Columna para lo que se filtra, se
    ordena, es clave foránea o necesita índice; meta para lo opcional, lo que
    cambia de forma o lo que son muchos campos.
14. **Declarar `editable_metas` con el nombre aplanado** (`seo.og.image` llega como
    `seo_og_image`), escribir las `protected_metas` con `setMeta()`/`setMetas()` y
    llamar después a `updatePayload()`, leer con `getPayload('clave')` y decidir la
    forma de `payload` en `buildPayload()`.
15. **Cambiar las columnas de una tabla existente en el JSON** y reimportar para
    obtener la migración de alteración. Un cambio de clave foránea se escribe a
    mano.
16. **Volver a exportar `routes.json`** después de añadir un endpoint, y tocar los
    dos lados del contrato front ↔ back cuando cambie uno.
17. **Que cada `callback` de una acción con `route: false`** sea un export real de
    `models/<kebab>/index.js`.
18. **Escribir los textos como claves en inglés** con `t()` en el front y `__()` en
    Laravel, con marcadores: `t('Create :name', { name: t('Post') })`. A los
    datatables y componentes, pasarles sus textos traducidos (`labels`,
    `closeLabel`, `emptyText`…).
19. **Cambiar el aspecto con variables CSS** (`--fe-primary`, `--fe-radius`…),
    usar `setTheme` sólo para apuntar tokens a otro sistema visual y pedir los
    iconos por nombre semántico (`setIcons`), también desde un Resource:
    `'icon' => 'show'`.
20. **Navegar en React con `buildPath('AdminShowPost', { id })`.**
21. **Que un formulario avise al guardar** (`updateData` en Vue, `onUpdateData` en
    React) y deje decidir a la vista que abrió el drawer.
22. **Preguntar con `confirmAction`** antes de borrar o exportar; cancelar rechaza
    con `RequestCancelledError` y no se avisa de ello.
23. **Declarar los proveedores una vez** con `larapack:providers` y
    `larapack:config` en un paquete que no creó `larapack:new`.
24. **Reinstalar la skill con `larapack:skill --force`** después de actualizar
    LaraPack.
25. **Terminar con `larapack:verify` y la suite en verde**, y `larapack:audit` si
    es un paquete.

## Lo que el agente no debe hacer

1. **Escribir a mano** un modelo, un endpoint, una request, una política, una
   migración, un recurso, un formulario o una vista, tampoco «porque es sólo uno»:
   ese es el primero de los treinta.
2. **Rellenar todas las claves del JSON.**
3. **Generar todas las acciones y borrar las que sobran.** Lo borrado a mano queda
   como deriva para siempre.
4. **Generar pese a un error de validación y parchear el resultado**, o corregir el
   código generado en lugar del JSON.
5. **Exponer un secreto en el Resource «sólo para depurar».** `verify` falla con
   `secret-exposed`, y tiene razón.
6. **Olvidar `<model>_id` en las reglas de `Update`.**
7. **Añadir una relación en el trait sin declararla en `load_relations`.** El
   método existirá, pero la API no la cargará nunca.
8. **Ampliar la interfaz con componentes sueltos.** Si falta un input, falta una
   `prop` con `form: true`.
9. **Tocar el controlador.** Delega en las requests; lo distinto va en la request.
10. **Tocar el archivo de rutas.** Si falta un endpoint, falta en el JSON o en el
    generador.
11. **Editar `$fillable`, `$creatable`, `$updatable`, `$export_cols`,
    `$loadable_relations`, `$loadable_counts` o `casts()`.** Salen del JSON.
12. **Escribir fuera de los marcadores** `//RULES//`, `//IMPORTS//` y `//EDIT//`, ni
    fuera del array en `rules()`.
13. **Arreglar a mano lo que se resuelve solo**: el orden de los modelos y el
    namespace de las relaciones.
14. **Usar `assignments` ni `filters`**, que están obsoletas.
15. **Crear una columna JSON a mano** para datos flexibles, ni declarar `payload`
    como `creatable` o `updatable`.
16. **Leer metas con `meta()` en un bucle.** Hace una consulta por llamada y
    devuelve las listas como texto.
17. **Editar la migración de creación para cambiar columnas.**
18. **Tocar `models/<kebab>/index.js` en un solo framework.** Es el mismo archivo en
    Vue y en React.
19. **Escribir una ruta a mano en una vista React.**
20. **Hacer que un formulario navegue al guardar.**
21. **Añadir clases de un framework CSS** (`uk-input`, `fa-plus`, `bg-blue-600`) a un
    stub o a una vista generada, ni `customClass` a un input generado.
22. **Pedir un icono por clase** (`fa-eye`).
23. **Escribir español o inglés suelto en una vista**, ni concatenar el nombre del
    modelo en una clave.
24. **Importar un middleware de la aplicación en el módulo.** Qué rutas piden sesión
    lo declara cada ruta con `auth: true` (`meta` en Vue, `handle` en React).
25. **Avisar de lo que el usuario decidió no hacer**, como una confirmación
    cancelada.
