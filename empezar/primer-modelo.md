# Tu primer modelo

Con la [aplicación base](/empezar/app-nueva) instalada, añadir un modelo es declararlo en `laraimport.json` y generarlo. En esta página se añade un catálogo de productos y se ve aparecer en el menú del administrador.

## 1. Decláralo en `laraimport.json`

El archivo ya tiene el modelo `User`. Añade `Product` al array `models`, después de él:

```json
{
    "$schema": "vendor/innoboxrr/larapack-generator/schema/laraimport.schema.json",
    "models": [
        { "name": "User", "...": "lo que ya estaba" },
        {
            "name": "Product",
            "props": [
                {
                    "name": "name",
                    "type": "string",
                    "datatable": true,
                    "form": true,
                    "form_component": "TextInputComponent",
                    "form_submit": true
                },
                {
                    "name": "price",
                    "type": "decimal",
                    "default": 0,
                    "datatable": true,
                    "form": true,
                    "form_component": "TextInputComponent",
                    "form_submit": true
                },
                {
                    "name": "status",
                    "type": "string",
                    "default": "draft",
                    "datatable": true,
                    "form": true,
                    "form_component": "SelectInputComponent",
                    "form_submit": true,
                    "enum": { "draft": "Draft", "published": "Published" }
                },
                {
                    "name": "description",
                    "type": "text",
                    "nullable": true,
                    "form": true,
                    "form_component": "TextareaInputComponent",
                    "form_submit": true
                }
            ],
            "requests": [
                {
                    "name": "Create",
                    "rules": {
                        "name": "required|string|max:255",
                        "price": "required|numeric|min:0",
                        "status": "required|in:draft,published",
                        "description": "nullable|string"
                    }
                },
                {
                    "name": "Update",
                    "rules": {
                        "product_id": "required|numeric",
                        "name": "sometimes|required|string|max:255",
                        "price": "sometimes|required|numeric|min:0",
                        "status": "sometimes|required|in:draft,published",
                        "description": "nullable|string"
                    }
                }
            ]
        }
    ]
}
```

La línea `{ "name": "User", "...": "lo que ya estaba" }` sólo abrevia: deja el modelo `User` tal como está.

Lo que dice cada clave:

| Clave | Qué hace |
|---|---|
| `name` | El nombre del modelo, en singular y PascalCase. De él sale todo: tabla `products`, rutas `api.app.product.*`, pantallas `AdminProducts`. |
| `type` | El tipo de columna de la migración, con los nombres de Laravel. |
| `datatable` | La columna aparece en la tabla del administrador. |
| `form` + `form_component` | El campo aparece en los formularios, con ese componente. `form: true` exige `form_component`. |
| `form_submit` | El campo se envía al crear o actualizar. |
| `enum` | Valor → etiqueta. Convierte el campo en un select, y la tabla ofrece una acción masiva por valor («Status: Published»). Sólo lo pintan `SelectInputComponent`, `SelectSearchInputComponent`, `RadioInputComponent` y `MultiCheckboxInputComponent`. |
| `requests` | Las reglas de validación de alta (`Create`) y edición (`Update`). |

Sin la clave `routes`, el modelo tiene las doce acciones: listar, ver, crear, editar, borrar, restaurar, borrar para siempre, exportar, las dos masivas y las dos de permisos. Para limitarlas, ver [Rutas, inmutables, secretos y usuarios](/larapack/acciones). Todas las claves están en [El contrato: laraimport.json](/larapack/laraimport).

::: tip El editor te ayuda
La línea `$schema` hace que tu editor valide el archivo y autocomplete las claves mientras escribes.
:::

::: warning Update tiene que validar `product_id`
Si declaras reglas de `Update`, incluye `<modelo>_id`. El request lo usa para buscar el registro antes de autorizar y de guardar, y `larapack:validate` da error sin él.
:::

## 2. Valida

::: code-group

```bash [Vue]
php artisan larapack:validate laraimport.json --vue
```

```bash [React]
php artisan larapack:validate laraimport.json --react
```

:::

Si falla, se corrige el JSON, nunca el código. Con `--format=json` la salida es legible para un agente, y con `--strict` los avisos también cuentan como fallo.

## 3. Mira qué va a escribir y genera

::: code-group

```bash [Vue]
php artisan larapack:import laraimport.json --vue --dry-run
php artisan larapack:import laraimport.json --vue
```

```bash [React]
php artisan larapack:import laraimport.json --react --dry-run
php artisan larapack:import laraimport.json --react
```

:::

`--dry-run` dice qué crearía sin escribir nada. `larapack:import` valida otra vez antes de tocar un solo archivo.

Los archivos de `User` que ya existen se omiten («ya existe»): sin `--force`, el importador no sobrescribe nada.

::: details Qué se generó
```
app/Models/Product.php
app/Models/Traits/{Relations,Operations,Storage,Mutators,Assignments}/Product*.php
app/Models/Filters/Product/{ManagedFilter,IdFilter,CreationFilter,UpdatedFilter,EagerLoadingFilter}.php
app/Http/Controllers/ProductController.php
app/Http/Requests/Product/*Request.php          uno por acción
app/Http/Resources/Models/ProductResource.php
app/Http/Events/Product/Events/*  y  Listeners/*/*
app/Policies/ProductPolicy.php
app/Observers/ProductObserver.php
app/Exports/ProductsExports.php
app/Notifications/Product/ExportNotification.php
routes/api/models/product.php
database/migrations/*_create_products_table.php
database/factories/ProductFactory.php
tests/Feature/Models/ProductEndpointsTest.php
resources/<ui>/src/models/product/{index.js, store, routes, forms, views, widgets}
```
Además actualiza lo común del módulo: `resources/<ui>/src/routes.js`, las traducciones y `.larapack/manifest.json`.
:::

## 4. Migra, exporta las rutas y compila

```bash
php artisan migrate
php artisan route:json
npm run build
```

- `migrate` crea la tabla `products`.
- `route:json` vuelve a exportar las rutas con nombre a `resources/<ui>/routes.json`. **Sin esto el front no conoce los endpoints nuevos**: la interfaz falla con `Unknown backend route "api.app.product.index". Run php artisan route:json.`
- `npm run build` compila el módulo. Con `composer run dev` en marcha, Vite recarga solo: basta con recargar la página.

## 5. Ábrelo en el administrador

Recarga `/admin`: hay una entrada nueva en el menú, **Products**. El menú no se escribe: se construye con las rutas de primer nivel del módulo que tienen título y no tienen parámetros, así que cada modelo que generes aparece solo.

La entrada sale en inglés porque LaraPack no sabe cómo se dice tu modelo en español. Deja la clave vacía en `resources/<ui>/src/locales/es.json`, y mientras lo esté se ve la clave. Tradúcela ahí (al regenerar, LaraPack suma las claves que falten y nunca toca una traducción escrita) o en `resources/<ui>/app/lang/es.json`:

```json
{
    "Products": "Productos",
    "Product": "Producto"
}
```

Desde la pantalla ya puedes:

- Crear un producto en un drawer sobre la tabla, sin perder página, orden ni filtros.
- Abrir la ficha y editarla en otro drawer.
- Editar `name` en su propia celda: clic, escribir y Enter.
- Seleccionar filas y borrarlas, o ponerles un estado («Status: Published»).
- Pulsar **Ctrl+K** para crear, exportar o recargar.
- Exportar a Excel: el archivo llega después, por correo.

## 6. Decide quién lo ve

Hay dos capas, y la que protege los datos es la del servidor.

**La política.** `app/Policies/ProductPolicy.php` **nace cerrada**: todos sus métodos devuelven `false` y sólo pasa quien administra, por el `before()`. Ni el administrador borra para siempre: `forceDelete` está en `$exceptAbilities`. Un usuario que no administra puede abrir la pantalla, pero la tabla le explica que no tiene permiso en lugar de enseñarle datos.

Para abrirla, escribe la regla en el método que toca:

```php
// app/Policies/ProductPolicy.php
public function index(User $user): Response|bool
{
    return true; // cualquier usuario con sesión ve el listado
}
```

Quién ve **qué registros** del listado no lo decide la política, sino `ManagedFilter::canView` en `app/Models/Filters/Product/ManagedFilter.php`. Sin escribir nada ahí, el índice devuelve todos.

**El menú.** La entrada aparece a cualquier usuario con sesión. Para reservarla a los administradores, añade su ruta a `adminOnly`:

::: code-group

```js [Vue]
// resources/vue/app/config.js
export const adminOnly = [
    'AdminUsers',
    'AdminProducts',
]
```

```js [React]
// resources/react/app/config.js
export const adminOnly = ['AdminUsers', 'AdminProducts']
```

:::

La entrada pasa al grupo Administración y la guarda del front manda a `/admin`, con un aviso, a quien no administra. La ruta de primer nivel protege también a sus hijas: la ficha y la edición. Aun así, `adminOnly` sólo cambia la interfaz: **quien decide es la política**.

## 7. Comprueba y guarda

```bash
php artisan larapack:verify
php artisan test
```

- `larapack:verify` comprueba que lo generado siga cuadrando con el contrato. Lo que editaste a mano sale como `customised`, que es información y no error: la política de productos si la abriste, y la `UserPolicy` que trae la aplicación base.
- `tests/Feature/Models/ProductEndpointsTest.php` recorre cada endpoint. Pasa recién generado: si falla, algo se rompió.

Guarda el cambio con el manifiesto, que es lo que permite regenerar sin destruir tu código:

```bash
git add -A
git commit -m "Añadir el catálogo de productos"
```

Comprueba antes con `git status` que `.larapack/manifest.json` está entre los cambios.

## Cambiar el modelo después

Añadir una columna, cambiar una regla o quitar una acción es el flujo normal:

```bash
php artisan larapack:validate laraimport.json --vue
php artisan larapack:import laraimport.json --vue --dry-run
php artisan larapack:import laraimport.json --vue --force
php artisan migrate
php artisan route:json
npm run build
```

- `--force` regenera lo que no has editado y **conserva lo que sí**, avisándote. Lo conservado no recibe el cambio: revísalo y llévalo a mano.
- Una tabla que ya existe no se toca regenerando su migración de creación: los cambios de columnas van a una migración nueva, `<fecha>_alter_products_table.php`.

Más en [Regenerar sin destruir](/larapack/regenerar) y [Migraciones y cambios de esquema](/larapack/migraciones).

## Errores frecuentes

| Síntoma | Causa |
|---|---|
| `Update debe validar 'product_id'` | Declaraste reglas de `Update` sin el identificador. |
| El esquema exige `form_component` | Un campo con `form: true` sin componente. |
| Aviso de que `enum` se ignorará | El componente no es un select. |
| Aviso de que no se generan vistas | El modelo no tiene `index` o no tiene `policies` en `routes`. La edición necesita además `show`. |
| `Unknown backend route` | Falta `php artisan route:json`. |
| La tabla dice que no tienes permiso, siendo administrador | Tu correo no está en `ADMIN_EMAILS`, o la configuración está cacheada: `php artisan config:clear`. |
| La entrada no sale en el menú | Falta compilar, o la ruta está en `adminOnly` y no administras. |
