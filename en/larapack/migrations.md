# Migrations and schema changes

Migrations come out of `laraimport.json` like everything else, with one important difference: a database that has already been migrated never runs a create migration again. That's why LaraPack doesn't change columns by rewriting the create migration: it writes an alter migration.

## The create migration

For each model, `database/migrations/<fecha>_create_<tabla>_table.php`:

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

- `id()` and `timestamps()` are always there; `softDeletes()` is added if the model has `delete`, `restore` or `forceDelete`.
- Each property is a `$table-><type>('<name>')` line, with `->nullable()` if it's nullable and `->default(...)` if it has a default value: a boolean as `true` or `false`, a number as is and a string in quotes.
- A `foreignId` with `constraint` adds `->constrained('<tabla>')->onUpdate('cascade')->onDelete('cascade')`.
- With `metas: true`, `payload` is just another column: nullable `longText`, unless you declare it with a different type.

## The meta migration

With `metas: true`, `<fecha>_create_<snake>_metas_table.php`: `id`, `key` (string), `value` (longText), the foreign key to the model with cascading deletes, `timestamps` and a unique index per key and record. No `softDeletes()`. See [Metas and payload](/en/larapack/metas#the-meta-table-and-model).

## Pivots {#pivots}

Each entry in `pivots` generates `<fecha>_create_<name>_table.php` with `id()`, its columns and `timestamps()`:

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

- It's only created if there isn't already a create migration for that table, and it's never regenerated, not even with `--force`: it isn't in the manifest.
- A pivot column's `default` is always written in quotes.
- No model is generated: you declare the `belongsToMany` relation in `load_relations` or write it in the `Relations` trait.
- `larapack:pivot-migration post_tag` creates it without a laraimport, with only `id()` and `timestamps()`; the columns go in its `//EDIT//` marker.

## The order

`php artisan migrate` runs migrations by file name, and the name starts with the date. LaraPack guarantees the order like this:

- **Models are sorted by their foreign keys** before generating: the referenced table comes first, even if its model is declared later. A foreign key cycle is a validation error, because no order is possible.
- **Timestamps never repeat.** Each migration in a run gets a stamp later than the previous one, in UTC (`Y_m_d_His`), even when they're written in the same second.
- **Within a model**, the meta migration comes after the create migration.
- **Pivots come after all the models.**
- **An alter migration comes after the latest migration of its table.**

## Reimporting doesn't duplicate

The name includes the time, so searching for it by exact name never found it. When reimporting, LaraPack looks for the create migration that already exists for that table (`*_create_<tabla>_table.php`, the oldest one if there are several) and reuses it, and does the same with the meta and pivot migrations. From then on that migration is treated like any other file: it's skipped, altered or, with `--force` and no schema changes, regenerated if it wasn't edited.

## Changing columns: alter migrations {#alter-migrations}

When you reimport with `larapack:import`, if the create migration already exists and LaraPack generated it, the laraimport columns are compared with the ones the table's migrations left behind. If they differ, `<fecha>_alter_<tabla>_table.php` is written:

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

### How the comparison works

- **What exists** is read from the create migration and then, in order, from each earlier `*_alter_<tabla>_table.php`, only from its `up()`. Every line with the shape the generator writes counts: `$table-><type>('<name>')` with its modifiers, on a single line. `dropColumn` and `dropConstrainedForeignId` remove the column, and `->change()` redefines it.
- **What's wanted** is the line the generator would write today for each property.
- **It adds** what's only in the laraimport, **changes** with `->change()` what has a different definition, and **removes** what's no longer there: with `dropConstrainedForeignId` if it's a foreign key, and with `dropColumn` otherwise.
- **`down()`** undoes each step, in reverse order.
- With no differences, nothing is written. With `--dry-run`, it's only announced.
- The alter migration goes into the manifest, like the create migration.

### What it detects and what's left to you

| Change in the laraimport | What LaraPack does |
|---|---|
| A new property | Adds it. |
| A different `type`, `nullable` or `default` | `->change()`. |
| A property that disappears | Removes it. |
| A new foreign key, or one that disappears | Adds it with its constraint, or removes it with `dropConstrainedForeignId`. |
| `metas: true` on a model that already exists | Adds `payload`. The meta table is a new create migration. |
| A foreign key that changes table or type | **By hand.** It writes a comment in `up()`: `// <columna> cambió y es una llave foránea: escribe el cambio a mano.` (the column changed and is a foreign key: write the change by hand). Changing it means dropping it and creating it again, with its data, and that isn't something to decide automatically. |
| A renamed property | **Careful:** it's seen as one column removed and another one added. |
| Removing `delete`, `restore` and `forceDelete` | **By hand.** The model stops using `SoftDeletes`, but `deleted_at` stays in the migrated table. |
| Indexes, `unique()` and anything the laraimport doesn't express | **By hand**, in a migration of your own. |
| A create migration edited by hand | **By hand.** No alter migration is written: the report marks it as preserved, "el esquema cambió y la migración está editada a mano: escribe la alteración" (the schema changed and the migration was edited by hand: write the alteration). |
| A create migration LaraPack didn't generate | **By hand.** It's skipped. See [below](#migrations-larapack-did-not-generate). |

::: danger Renaming a column deletes its data
Renaming a property in the laraimport generates a `dropColumn` for the old column and the creation of the new one. Always review the alter migration before migrating and, for a rename, replace those two lines with `$table->renameColumn('antiguo', 'nuevo');`.
:::

An edited migration can't be read reliably: guessing there could end up removing a column that exists. That's why anything written outside the laraimport is always left to a person.

### What not to do

- **Don't edit the create migration to change columns.** A database that's already migrated won't run it again, and once it's edited LaraPack can no longer write the alter migrations.
- **Don't regenerate a migration with `larapack:migration --force`.** Without a laraimport there are no columns, and it would rewrite the create migration without them. Schema changes go through `larapack:import`, the only command that writes alter migrations.
- **Don't delete an alter migration that has already run.** It's part of what LaraPack reads to know which columns the table has.

## Migrations LaraPack did not generate {#migrations-larapack-did-not-generate}

If a create migration already exists for the table and the manifest doesn't know about it, LaraPack doesn't compare it with the laraimport or write alter migrations against it. The report skips it with the reason "no la generó LaraPack: el esquema lo decide esa migración" (LaraPack didn't generate it: that migration decides the schema).

The typical case is the `users` migration that ships with Laravel, in an application with an `authenticatable` `User` model. That migration contains things the laraimport doesn't express, such as `rememberToken()` or the unique index on `email`: comparing against it would have ended up asking for an alter migration that removes those columns.

If that table needs more columns, write the migration yourself. The base application already ships one that adds `payload` and soft deletes to `users`.

## Removing a model

`larapack:remove-full-model` doesn't delete the create migration: it writes `<fecha>_drop_<tabla>_table.php`, plus `<fecha>_drop_<snake>_metas_table.php` if the model had metas. That way a database that's already migrated can drop the table by migrating forward. The `down()` of those migrations is empty.

## In production

Generating a migration isn't applying it. Review every alter migration before running `php artisan migrate`, especially the `dropColumn` and `->change()` lines, and decide yourself when a production database gets migrated: it's part of [what is not delegated](/en/ai/limits).
