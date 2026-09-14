# Migraciones y cambios de esquema

Las migraciones salen del `laraimport.json` como el resto, pero con una diferencia importante: una base de datos ya migrada no vuelve a ejecutar una migración de creación. Por eso LaraPack no cambia columnas reescribiendo la creación: escribe una migración de alteración.

## La migración de creación

Para cada modelo, `database/migrations/<fecha>_create_<tabla>_table.php`:

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->string('status');
    $table->foreignId('category_id')->constrained('categories')->onUpdate('cascade')->onDelete('cascade');
    $table->longText('payload')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

- `id()` y `timestamps()` van siempre; `softDeletes()`, si el modelo tiene `delete`, `restore` o `forceDelete`.
- Cada propiedad es una línea `$table-><type>('<name>')`, con `->nullable()` si es anulable y `->default(...)` si tiene valor por defecto: un booleano como `true` o `false`, un número tal cual y un texto entre comillas.
- Un `foreignId` con `constraint` añade `->constrained('<tabla>')->onUpdate('cascade')->onDelete('cascade')`.
- Con `metas: true`, `payload` es una columna más: `longText` anulable, salvo que la declares con otro tipo.

## La migración de metas

Con `metas: true`, `<fecha>_create_<snake>_metas_table.php`: `id`, `key` (string), `value` (longText), la clave foránea hacia el modelo con borrado en cascada, `timestamps` y un índice único por clave y registro. Sin `softDeletes()`. Ver [Metas y payload](/larapack/metas#la-tabla-y-el-modelo-de-metas).

## Pivotes {#pivotes}

Cada entrada de `pivots` genera `<fecha>_create_<name>_table.php` con `id()`, sus columnas y `timestamps()`:

```json
{
    "pivots": [
        {
            "name": "post_tag",
            "props": [
                { "name": "post_id", "type": "foreignId", "constraint": "posts" },
                { "name": "tag_id", "type": "foreignId", "constraint": "tags" }
            ]
        }
    ]
}
```

- Sólo se crea si no hay ya una migración de creación de esa tabla, y nunca se regenera, ni con `--force`: no entra en el manifiesto.
- El `default` de una columna de pivote se escribe siempre entre comillas.
- No se genera modelo: la relación `belongsToMany` la declaras en `load_relations` o la escribes en el trait `Relations`.
- `larapack:pivot-migration post_tag` la crea sin laraimport, sólo con `id()` y `timestamps()`; las columnas van en su marcador `//EDIT//`.

## El orden

`php artisan migrate` ejecuta las migraciones por el nombre del archivo, y el nombre empieza por la fecha. LaraPack lo garantiza así:

- **Los modelos se ordenan por sus claves foráneas** antes de generar: la tabla a la que se apunta va antes, aunque su modelo se declare después. Un ciclo de claves foráneas es un error de validación, porque no tiene orden posible.
- **Las fechas no se repiten.** Cada migración de una ejecución recibe un sello posterior al anterior, en UTC (`Y_m_d_His`), aunque se escriban en el mismo segundo.
- **Dentro de un modelo**, la migración de metas va después de la de creación.
- **Las pivotes van después de todos los modelos.**
- **Una alteración va después de la última migración de su tabla.**

## Reimportar no duplica

El nombre lleva la hora, así que buscarlo por nombre exacto no lo encontraba nunca. Al reimportar, LaraPack busca la migración de creación que ya exista para esa tabla (`*_create_<tabla>_table.php`, la más antigua si hay varias) y la reutiliza, igual que la de metas y la de pivotes. Esa migración se trata después como cualquier archivo: se omite, se altera o, con `--force` y sin cambios de esquema, se regenera si no se editó.

## Cambiar columnas: migraciones de alteración {#alteraciones}

Al reimportar con `larapack:import`, si la migración de creación ya existe y la generó LaraPack, se comparan las columnas del laraimport con las que dejaron las migraciones de la tabla. Si difieren, se escribe `<fecha>_alter_<tabla>_table.php`:

```php
public function up(): void
{
    Schema::table('posts', function (Blueprint $table) {
        $table->string('subtitle')->nullable();
        $table->text('title')->change();
        $table->dropColumn('legacy_code');
    });
}

public function down(): void
{
    Schema::table('posts', function (Blueprint $table) {
        $table->string('legacy_code');
        $table->string('title')->change();
        $table->dropColumn('subtitle');
    });
}
```

### Cómo se compara

- **Lo que hay** se lee de la migración de creación y, en orden, de cada `*_alter_<tabla>_table.php` anterior, sólo de su `up()`. Cuenta cada línea que tiene la forma que escribe el generador: `$table-><type>('<name>')` con sus modificadores, en una sola línea. `dropColumn` y `dropConstrainedForeignId` quitan la columna, y `->change()` la redefine.
- **Lo que se quiere** es la línea que el generador escribiría hoy para cada propiedad.
- **Se añade** lo que sólo está en el laraimport, **se cambia** con `->change()` lo que tiene otra definición y **se quita** lo que ya no está: con `dropConstrainedForeignId` si es una clave foránea, con `dropColumn` si no.
- **`down()`** deshace cada paso, en orden inverso.
- Sin diferencias no se escribe nada. Con `--dry-run` sólo se anuncia.
- La alteración entra en el manifiesto, como la creación.

### Lo que detecta y lo que queda para ti

| Cambio en el laraimport | Qué hace LaraPack |
|---|---|
| Una propiedad nueva | La añade. |
| Otro `type`, `nullable` o `default` | `->change()`. |
| Una propiedad que desaparece | La quita. |
| Una clave foránea nueva, o una que desaparece | La añade con su restricción, o la quita con `dropConstrainedForeignId`. |
| `metas: true` en un modelo que ya existe | Añade `payload`. La tabla de metas es una migración de creación nueva. |
| Una clave foránea que cambia de tabla o de tipo | **A mano.** Escribe en `up()` un comentario: `// <columna> cambió y es una llave foránea: escribe el cambio a mano.` Cambiarla es quitarla y crearla otra vez, con sus datos, y eso no se decide solo. |
| Una propiedad renombrada | **Cuidado:** se ve como una columna que se quita y otra que se añade. |
| Quitar `delete`, `restore` y `forceDelete` | **A mano.** El modelo deja de usar `SoftDeletes`, pero `deleted_at` sigue en la tabla migrada. |
| Índices, `unique()` y lo que el laraimport no expresa | **A mano**, en una migración tuya. |
| Una migración de creación editada a mano | **A mano.** No se escribe alteración: el informe la marca como conservada, «el esquema cambió y la migración está editada a mano: escribe la alteración». |
| Una migración de creación que no generó LaraPack | **A mano.** Se omite. Ver [abajo](#migraciones-que-no-genero-larapack). |

::: danger Renombrar una columna borra sus datos
Renombrar una propiedad en el laraimport genera un `dropColumn` de la antigua y la creación de la nueva. Revisa siempre la alteración antes de migrar y, para un renombrado, sustituye esas dos líneas por `$table->renameColumn('antiguo', 'nuevo');`.
:::

Una migración editada no se lee con seguridad: adivinar ahí acabaría quitando una columna que existe. Por eso lo escrito fuera del laraimport se deja siempre para una persona.

### Lo que no hay que hacer

- **No edites la migración de creación para cambiar columnas.** Una base ya migrada no la vuelve a ejecutar, y editada, LaraPack deja de poder escribir las alteraciones.
- **No regeneres una migración con `larapack:migration --force`.** Sin laraimport no hay columnas, y reescribiría la creación sin ellas. Los cambios de esquema pasan por `larapack:import`, que es el único que escribe alteraciones.
- **No borres una alteración ya migrada.** Es parte de lo que LaraPack lee para saber qué columnas tiene la tabla.

## Migraciones que no generó LaraPack {#migraciones-que-no-genero-larapack}

Si ya existe una migración de creación para la tabla y el manifiesto no la conoce, LaraPack no la compara con el laraimport ni escribe alteraciones contra ella. El informe la omite con el motivo «no la generó LaraPack: el esquema lo decide esa migración».

El caso típico es la migración de `users` que trae Laravel, en una aplicación con un modelo `User` `authenticatable`. Esa migración lleva lo que el laraimport no expresa, como `rememberToken()` o el índice único de `email`: compararla habría acabado pidiendo una alteración que quitaría esas columnas.

Si esa tabla necesita más columnas, escribe tú la migración. La aplicación base ya trae una que añade `payload` y el borrado lógico a `users`.

## Quitar un modelo

`larapack:remove-full-model` no borra la migración de creación: escribe `<fecha>_drop_<tabla>_table.php`, y `<fecha>_drop_<snake>_metas_table.php` si el modelo tenía metas. Así una base ya migrada puede quitar la tabla migrando hacia delante. El `down()` de esas migraciones está vacío.

## En producción

Generar una migración no es aplicarla. Revisa cada alteración antes de ejecutar `php artisan migrate`, sobre todo los `dropColumn` y los `->change()`, y decide tú cuándo se migra una base de producción: es de [lo que no se delega](/ia/limites).
