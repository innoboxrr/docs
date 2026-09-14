# El contrato front ↔ back

El módulo de interfaz y la API de Laravel no se conocen por código: se conocen por acuerdos. Si uno de los dos lados cambia, el otro cambia igual. Esta página explica cada acuerdo, qué pasa cuando se rompe y cómo se nota.

Vale igual para Vue y para React: el contrato de cada modelo, `models/<entidad>/index.js`, es el mismo archivo en los dos.

## 1. Rutas con nombre y `routes.json`

El front **no escribe ninguna URL**. Pide cada una por el nombre de su ruta de Laravel:

```
php artisan route:json          innoboxrr/routes-to-json
  → routes.json                 las rutas con nombre, exportadas
  → setRoutes(routes)           innoboxrr-route-resolver, al arrancar
  → route('api.app.product.index')
```

```js
import route from 'innoboxrr-route-resolver'

route('api.app.product.index')              // /api/app/product/index
route('api.app.product.index', { page: 2 }) // /api/app/product/index?page=2
```

`route()` acepta parámetros por posición o por nombre, manda al query string los que la ruta no usa y lanza un error si falta uno obligatorio. No es Ziggy.

**Dónde se escribe `routes.json`.** Lo decide `path` en `config/routes-to-json.php`, o la variable `JSON_ROUTES_FILE`:

| Proyecto | Ruta |
|---|---|
| Aplicación base | `resources/<ui>/routes.json`, que `app:setup` configura |
| Por omisión de `routes-to-json` | `resources/vue/assets/json/routes.json` |

Una ruta relativa se resuelve desde la raíz del proyecto.

::: warning Después de añadir un endpoint, exporta otra vez
Una ruta que no está en `routes.json` no existe para el front. La aplicación base lo dice con `Unknown backend route "api.app.product.index". Run php artisan route:json.`; en otro proyecto la petición puede acabar yendo a la página actual. `app:install` exporta una vez; después es tuyo, o de un script como `"build": "php artisan route:json && vite build"`.
:::

## 2. El prefijo de las rutas

Cada contrato de modelo declara su prefijo:

```js
// resources/<ui>/src/models/product/index.js
export const API_ROUTE_PREFIX = 'api.app.product.'
```

Y lo usa para todo: `route(API_ROUTE_PREFIX + 'index')`. Ese prefijo tiene que reconstruir exactamente el `->as()` del `RouteServiceProvider`, que monta cada archivo de `routes/api/models/` así:

```php
Route::middleware('api')
    ->prefix('api/app/' . $name)      // $name: el archivo, en snake_case
    ->as('api.app.' . $name . '.')
    ->group($file);
```

| Proyecto | Modelo | URL | Prefijo del nombre |
|---|---|---|---|
| Aplicación | `OrderLine` | `api/app/order_line/...` | `api.app.order_line.` |
| Paquete `Acme\Catalogo` | `OrderLine` | `api/acme/catalogo/order_line/...` | `api.acme.catalogo.order_line.` |

El modelo va en snake_case en los dos modos. `larapack:verify` comprueba que los dos lados coincidan (`route-prefix`) y da error si no.

## 3. La sesión de Sanctum

La interfaz no usa tokens: llama a la API con **la cookie de sesión de Laravel**, igual que una página normal. Hacen falta cuatro cosas:

| Dónde | Qué |
|---|---|
| `bootstrap/app.php` | `$middleware->statefulApi()`: la API acepta la sesión en las peticiones que vienen de un dominio de confianza. |
| axios | `withCredentials: true` para enviar la cookie y `withXSRFToken: true` para enviar la cabecera `X-XSRF-TOKEN`. Desde axios 1.6 esa cabecera no se envía sin esto, ni al mismo origen. |
| Antes de iniciar sesión | `GET /sanctum/csrf-cookie`, que deja la cookie `XSRF-TOKEN`. |
| `.env` | La dirección con la que abres la aplicación está en `SANCTUM_STATEFUL_DOMAINS`. |

La aplicación base lo hace así:

```js
axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true
axios.defaults.headers.common.Accept = 'application/json'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
```

Hay una sola copia de axios en la aplicación, y el módulo generado llega a ella a través de `innoboxrr-http-request`: los interceptores de la aplicación cubren también sus peticiones.

**Los dominios de confianza.** Sin `SANCTUM_STATEFUL_DOMAINS`, Sanctum confía en `localhost`, `localhost:3000`, `127.0.0.1`, `127.0.0.1:8000`, `::1` y el host de `APP_URL` con su puerto.

::: danger Cuando no coincide
Si abres la aplicación desde una dirección que no está en la lista, la API no ve la sesión: **el login responde bien y cada tabla responde 401**. Pon en `APP_URL` la dirección exacta, con host y puerto. Si defines `SESSION_DOMAIN`, tiene que coincidir con el dominio que abres; en local, déjalo en `null`.
:::

**Cómo reacciona la interfaz de la aplicación base:**

- **419**: el token CSRF caducó. Pide otra cookie y repite la petición una sola vez.
- **401**: la sesión se perdió. Limpia el estado y manda al login con `?redirect=` a la página donde estabas.

**Las peticiones GET no llevan token.** El token CSRF sólo protege lo que cambia algo. Las tablas (`innoboxrr-vue-datatable` e `innoboxrr-react-datatable` 3.1.1 o superior) ya no lo envían en las GET, así que no acaba en la URL ni en los registros del servidor.

**Todo lo que cambia algo va por POST, PUT o DELETE**, también en los paquetes. Por ejemplo, volver de una suplantación, `auth.revert.impersonate`, es un POST con token CSRF desde `innoboxrr/laravel-auth` 6.1.0: por GET, otro sitio podía terminar la suplantación con una imagen. Las dos interfaces de la aplicación base (`innoboxrr/laravel-setup` 7.0.1) ya llaman con POST.

## 4. La forma de la respuesta

Las tablas leen `data`, `meta` y `links` **en la raíz** de la respuesta del índice. Laravel envuelve los Resources en un `data` de más, así que la aplicación tiene que quitarlo:

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

::: warning Sin esto, la tabla sale vacía
No hay error: la petición responde 200 y la tabla no encuentra las filas. La aplicación base ya lo trae.
:::

El índice pagina con search-surge. Además de los filtros, acepta `paginate`, `page`, `orderBy` y `orderMode`, entre otros.

## 5. Los permisos

Antes de enseñar un botón, la interfaz pregunta qué puede hacer el usuario:

- `api.app.product.policies` responde, para el usuario actual y un registro opcional, un permiso por acción: `index`, `view`, `create`, `update`, `delete`… Las masivas usan el permiso de su acción individual.
- La tabla resuelve los permisos de cada fila antes de abrir su menú, y si el índice responde 403 lo explica en lugar de enseñar una tabla vacía.

La interfaz sólo oculta botones. **Quien protege es el request**, que en `authorize()` pregunta a la política antes de hacer nada.

## 6. Las acciones

Hay tres listas de acciones y las tres las pinta la tabla.

**Las de cada fila** vienen del servidor, en el array `actions` que añade el Resource a cada registro:

```php
[
    'id' => 'delete',
    'name' => __('Delete'),
    'success' => __('Record deleted'),
    'callback' => 'deleteModel',
    'icon' => 'delete',
    'route' => false,
    'policy' => false,
    'params' => ['id' => $this->id],
]
```

| Clave | Qué hace |
|---|---|
| `route: true` | Navega a `params.to.name`, una ruta del front como `AdminShowProduct`. |
| `route: false` | Llama a `model[callback](params)`: `callback` tiene que ser una función exportada de `models/<entidad>/index.js`. |
| `success` | El aviso que se enseña al terminar. |
| `icon` | Un nombre semántico (`show`, `edit`, `delete`), no una clase de CSS. |

Como el Resource es un hueco, añadir una acción a la fila es añadirla a ese array y exportar su función en el contrato.

**Las de la barra superior** las declara `crudActions()` en el contrato: crear (navega a `AdminCreateProduct`) y exportar (llama a `exportModel`).

**Las masivas** las declara `bulkActions()`, y la tabla llama a `model[callback](ids, filas, params)` y después recarga. Los ids incluyen los seleccionados en otras páginas. Van a `bulk.update` y `bulk.delete`, que aplican la política de la acción individual a cada registro, dentro de una transacción.

**La edición en la celda** guarda con `updateField(id, campo, valor)`, que va a `bulk.update` con sólo ese campo. Si la API lo rechaza con un 422, la celda enseña el mensaje de la regla y no se cierra.

## 7. Quién administra

Un solo método decide quién administra, y todo lo demás lo consulta:

```
ADMIN_EMAILS=ana@acme.com,luis@acme.com        .env
  → config('auth.admins')                      config/auth.php
  → $user->isAdmin()                           el usuario generado
```

```php
public function isAdmin(): bool
{
    $admins = array_map('strtolower', (array) config('auth.admins', []));

    return in_array(strtolower((string) $this->email), $admins, true);
}
```

Quién lo lee:

| Dónde | Qué decide |
|---|---|
| `before()` de cada política generada | El administrador pasa en todas las acciones salvo las de `$exceptAbilities` (por omisión, `forceDelete`). |
| Middleware `admin` (`EnsureUserIsAdmin`) | Responde 403 a quien no administra. |
| `innoboxrr/laravel-auth` | Sólo un administrador suplanta, y nunca a sí mismo ni a otro administrador. |
| log-viewer | La puerta `viewLogViewer`. |
| El editor del `.env` | Con el middleware `web,auth,admin`. |

**En el front**, `auth.get.auth` devuelve `is_admin`. Con eso la interfaz decide qué enseña: el grupo Administración del menú, las rutas de `adminOnly`, las rutas con `meta.admin`. Es sólo presentación: cada petición vuelve a pasar por la política o por el middleware.

::: tip Cambiar ADMIN_EMAILS
Se lee de la configuración. Si la cacheaste con `php artisan config:cache`, vuelve a cachearla después de cambiarlo.
:::

Para un sistema de roles, cambia el cuerpo de `isAdmin()`: todo lo que lo consulta sigue funcionando.

## 8. Las metas

Una **columna** es para lo que se filtra, se ordena, se indexa o es una llave foránea. Una **meta** es para lo opcional, lo que cambia o lo que es numeroso: el SEO de una página, las preferencias de un usuario. Con `metas: true`, el modelo tiene una tabla `<modelo>_metas` y una columna `payload` con una copia de todas.

El recorrido de un guardado:

```
formulario             { "seo": { "title": "Oferta" } }
  → support            RequestFormater::flatten   →  seo_title = "Oferta"
  → traits             update_metas(...)          →  sólo las de $editable_metas
                                                     que no están en $protected_metas
  → updatePayload()                               →  payload se rehace
```

Las reglas:

- **Los grupos anidados se aplanan con guion bajo**: `seo.title` se guarda como `seo_title`. Por eso `editable_metas` se escribe con los nombres aplanados.
- **Sólo se guardan las metas de `editable_metas` que no están en `protected_metas`.** Una meta protegida sólo la escribe tu código, con `setMeta` o `setMetas`, aunque llegue en la petición.
- **Un valor vacío (`null`, `''`, `[]`) borra la meta. Una clave que no llega no se toca.**
- `payload` lo escribe el sistema: nunca se acepta desde una petición ni se exporta.
- `setMeta` y `setMetas` no rehacen `payload`: llama a `updatePayload()` después.
- Para leer, `getPayload('a.b')` lee de `payload` sin consultar la tabla de metas.

Un ejemplo real: el avatar del perfil en la aplicación base. El usuario se declara con `"editable_metas": ["avatar"]`; la pantalla sube la imagen a laravel-uploads y guarda su ruta como meta `avatar` con `api.app.user.update`, y quitarla envía `avatar: ''`, que la borra.

Más en [Metas y payload](/larapack/metas).

## Si algo no funciona

| Síntoma | Acuerdo roto |
|---|---|
| `Unknown backend route` | 1: falta `php artisan route:json`. |
| `larapack:verify` da `route-prefix` | 2: alguien cambió el prefijo o el `RouteServiceProvider`. |
| Login correcto y 401 en cada tabla | 3: `APP_URL`, `SANCTUM_STATEFUL_DOMAINS` o `SESSION_DOMAIN`. |
| 419 que no se resuelve | 3: la cookie `XSRF-TOKEN` no llega; revisa `withXSRFToken` y el dominio. |
| La tabla sale vacía con respuesta 200 | 4: falta `withoutWrapping()`. |
| Un botón que falla con 403 | 5: el botón lo enseña la interfaz, la política dice que no. |
| El administrador no es administrador | 7: `ADMIN_EMAILS` o la configuración cacheada. |
| Una meta no se guarda | 8: no está en `editable_metas`, está en `protected_metas` o su nombre no está aplanado. |
