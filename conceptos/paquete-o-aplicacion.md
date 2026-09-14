# Paquete o aplicación

LaraPack genera la misma arquitectura en dos sitios: dentro de un **paquete** de Composer o directamente dentro de una **aplicación** Laravel. Los modelos, las políticas, los requests y el módulo de interfaz son iguales. Cambia dónde van, cómo se llaman sus rutas, quién registra los proveedores y cómo se compila la interfaz.

## Cómo lo decide

Por el campo `type` del `composer.json` de la raíz:

| `type` | Modo |
|---|---|
| `library`, o sin `type` | Paquete: escribe en `src/` |
| Cualquier otro valor; en Laravel, `project` | Aplicación: escribe en `app/` |

El namespace sale de `autoload.psr-4`: la entrada que apunta a `src/` en un paquete, o a `app/` en una aplicación (`App\`).

No hay opción para forzar un modo: si LaraPack escribe donde no esperas, revisa el `type`.

## Las diferencias

| Aspecto | Paquete | Aplicación |
|---|---|---|
| Código | `src/`, con el namespace del paquete | `app/`, con `App\` |
| Archivo de rutas | `routes/api/models/<snake>.php` | `routes/api/models/<snake>.php` |
| URL | `api/<namespace>/<snake>/...`, p. ej. `api/acme/catalogo/order_line/index` | `api/app/<snake>/...`, p. ej. `api/app/order_line/index` |
| Nombres de ruta | `api.acme.catalogo.order_line.*` | `api.app.order_line.*` |
| Proveedores | En `extra.laravel.providers` del `composer.json`: Laravel los descubre | **Hay que añadirlos a `bootstrap/providers.php`** |
| Factories | Namespace del paquete | `Database\Factories` |
| Tests | `TestCase` de Testbench y un `tests/User.php` propio | `Tests\Feature\Models`, con el `tests/TestCase.php` de la aplicación; inician sesión con la factory del modelo de `auth.providers.users.model` |
| Módulo de interfaz | `resources/vue` o `resources/react`, con su propio `package.json` y `vite.config.js` | `resources/<ui>/index.js` y `resources/<ui>/src/`, sin `package.json` |
| Nombre npm del módulo | `vendor-paquete` (Vue) y `vendor-paquete-react` (React) | No se publica |
| Dependencias npm del módulo | Las declara su `package.json` | Las declara el `package.json` de la aplicación |
| Configuración de la exportación | El archivo de configuración del paquete, p. ej. `config/acmecatalogo.php` | `config/larapack.php`, que crea `larapack:config` |
| Vistas de Excel | Con el namespace de vistas del paquete | Sin namespace: `excel.<modelo>`, en `resources/views/excel` |
| Migraciones de creación que LaraPack no escribió | — | Se omiten: no se comparan ni se alteran |

## Las rutas

El `RouteServiceProvider` generado monta cada archivo de `routes/api/models/` con el namespace en el prefijo. Para `Acme\Catalogo` y para `App\`:

::: code-group

```php [Paquete]
Route::middleware('api')
    ->prefix('api/acme/catalogo/' . $name)
    ->as('api.acme.catalogo.' . $name . '.')
    ->group($file);
```

```php [Aplicación]
Route::middleware('api')
    ->prefix('api/app/' . $name)
    ->as('api.app.' . $name . '.')
    ->group($file);
```

:::

`$name` es el nombre del archivo, el modelo en snake_case: `OrderLine` va a `order_line.php`. El `API_ROUTE_PREFIX` del contrato JS reconstruye ese mismo prefijo, y `larapack:verify` comprueba que coincidan.

## Los proveedores

::: code-group

```json [Paquete: composer.json]
{
    "extra": {
        "laravel": {
            "providers": [
                "Acme\\Catalogo\\Providers\\AppServiceProvider",
                "Acme\\Catalogo\\Providers\\AuthServiceProvider",
                "Acme\\Catalogo\\Providers\\EventServiceProvider",
                "Acme\\Catalogo\\Providers\\RouteServiceProvider"
            ]
        }
    }
}
```

```php [Aplicación: bootstrap/providers.php]
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\EventServiceProvider::class,
    App\Providers\RouteServiceProvider::class,
];
```

:::

En un paquete, `larapack:new` o `larapack:providers` los declaran y la aplicación que instala el paquete los descubre sola. En una aplicación, `larapack:route-service-provider` y `larapack:event-service-provider` los crean, pero **Laravel no descubre proveedores en el `composer.json` de una aplicación**: tienes que registrarlos. Sin el de rutas no existe ningún endpoint generado; sin el de eventos, la exportación nunca avisa.

La aplicación base ya los trae registrados.

## El módulo de interfaz

**En un paquete** el módulo es un paquete npm propio. Se publica, la aplicación lo instala y lo monta a mano: carga sus traducciones, monta sus rutas bajo `/admin` e instala el plugin (Vue) o registra sus rutas (React). Ver [Usarlo desde una aplicación](/empezar/paquete-nuevo#usarlo-desde-una-aplicacion).

```
packages/catalogo/
  composer.json                → acme/catalogo               (Composer)
  resources/vue/package.json   → acme-catalogo               (npm)
  resources/react/package.json → acme-catalogo-react         (npm)
```

**En una aplicación** el módulo no se publica: lo compila el Vite de la aplicación. LaraPack no escribe `package.json` ni `vite.config.js` dentro de `resources/`, y tu `package.json` tiene que declarar las dependencias del módulo (los paquetes de interfaz de innoboxrr, el router y el estado). La aplicación base ya las declara y carga el módulo sola.

## La exportación

| | Paquete | Aplicación |
|---|---|---|
| Configuración | La del paquete, p. ej. `config/acmecatalogo.php` para `Acme\Catalogo` | `config/larapack.php` |
| Claves que lee la exportación | `excel_view`, `notification_via`, `export_disk` (y `user_class`) | `larapack.excel_view`, `larapack.notification_via`, `larapack.export_disk` |
| Por omisión | Correo y disco `local` | Correo y disco `local`, también sin el archivo |

En una aplicación, `larapack:config` crea `config/larapack.php` y nunca escribe en `config/app.php`, que es de Laravel. Para avisar también en la base de datos, crea la tabla de notificaciones con `php artisan make:notifications-table` y añade `database` a `notification_via`.

## Las migraciones

En los dos modos, al reimportar LaraPack compara las columnas del JSON con las migraciones de la tabla y escribe `<fecha>_alter_<tabla>_table.php` con lo que cambia.

En una aplicación hay un caso más: **una migración de creación que LaraPack no escribió se omite**. La de `users` que trae Laravel es el ejemplo típico: no se compara con el laraimport ni se escriben alteraciones contra ella. Si esa tabla necesita más columnas, escribe tú la migración. La aplicación base ya trae una que añade `payload` y el borrado lógico a `users`.

## Cuál elegir

| Elige un paquete si… | Elige la aplicación si… |
|---|---|
| La funcionalidad se va a usar en más de una aplicación. | El dominio es de esta aplicación y de ninguna otra. |
| Quieres publicarla y versionarla aparte, con su CI y su `CHANGELOG`. | Quieres generar y ver el resultado sin publicar nada. |
| Otro equipo la mantiene. | Es la aplicación base con tus modelos. |

Un paquete cuesta más al principio: su propio repositorio, su CI, su publicación y el montaje en cada aplicación. A cambio, cada aplicación lo actualiza con Composer y npm.

LaraPack no tiene un comando para mover modelos de una aplicación a un paquete. Si lo necesitas, crea el paquete con [`larapack:new`](/empezar/paquete-nuevo), lleva a su `laraimport.json` las declaraciones de esos modelos, genera allí y mueve tu lógica a los huecos del paquete.
