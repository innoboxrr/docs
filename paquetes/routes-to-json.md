# routes-to-json

`innoboxrr/routes-to-json` **2.1.0** exporta las rutas con nombre de Laravel a un archivo JSON que lee el front. Así el front resuelve cada URL igual que Blade, por su nombre y no por un texto escrito a mano.

Una URL escrita a mano se rompe en silencio: renombras una ruta, los tests del backend pasan y un botón de la SPA responde 404 en producción. Con el nombre en los dos lados, el cambio se detecta al regenerar `routes.json`.

```bash
php artisan route:json
```

```json
{
    "auth.login": "auth/login",
    "api.laravel-options.option.index": "api/laravel-options/option/index",
    "lu.upload.display": "lu/upload/{upload_uuid}/display/{filename?}"
}
```

En el front lo resuelve [innoboxrr-route-resolver](/interfaz/http-rutas-i18n):

```js
import route, { setRoutes } from 'innoboxrr-route-resolver'
import routes from './routes.json'

setRoutes(routes)

route('api.laravel-options.option.index', { paginate: 0 })
```

## Instalar

```bash
composer require innoboxrr/routes-to-json
```

Requiere PHP `^8.3` e `illuminate/support ^13.0`. El proveedor se descubre solo.

## Configuración

| Clave | Por omisión | Qué decide |
|---|---|---|
| `path` | `env('JSON_ROUTES_FILE', resource_path('vue/assets/json/routes.json'))` | Dónde se escribe el JSON |

- **Directorio.** Se crea si no existe.
- **Ruta relativa.** Se resuelve contra la raíz del proyecto (`base_path()`), no contra el directorio de trabajo. Así funciona también desde `Artisan::call` en una petición o en una cola.
- **`JSON_ROUTES_FILE=` vacío** usa la ruta por omisión.

## Variables de entorno

| Variable | Por omisión | Uso |
|---|---|---|
| `JSON_ROUTES_FILE` | `resources/vue/assets/json/routes.json` | `path` |

## Publicar

| Tag | Qué copia |
|---|---|
| `config` | `config/routes-to-json.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\RoutesToJson\Providers\RoutesToJsonServiceProvider" --tag=config
```

## Migraciones

No trae migraciones.

## Comandos

| Comando | Opciones | Qué hace |
|---|---|---|
| `route:json` | — | Escribe `{ nombre: uri }` con cada ruta que tenga nombre, en JSON con sangría. Salta las rutas sin nombre |

- **Sin barra inicial.** Las URIs salen como las guarda Laravel, sin `/` al principio.
- **Parámetros.** Van entre llaves, y los opcionales con `?`.
- **Lo que no incluye:** ni el método HTTP ni el dominio.

::: tip El comando es route:json
El README de `innoboxrr-route-resolver` lo llama `routes:json`. No existe: es `route:json`.
:::

## Rutas HTTP

No registra rutas.

## Políticas y gates

No define políticas ni habilidades.

## Puntos de extensión

Sólo `path`. Para mantener el archivo al día, regenéralo antes de compilar el front:

```json
{
    "scripts": {
        "build": "php artisan route:json && vite build"
    }
}
```

## En la aplicación base

- **La ruta del archivo.** `app:setup` escribe su propio `config/routes-to-json.php` apuntando al archivo que importa la interfaz:

  ```php
  'path' => env('JSON_ROUTES_FILE', resource_path('vue/routes.json')), // o react/routes.json
  ```

- **El archivo inicial.** Las plantillas traen `resources/<ui>/routes.json` como marcador, y `app:install` ejecuta `route:json` para escribirlo de verdad.
- **El arranque.** La interfaz llama a `setRoutes(routes)` y pide cada URL con `route('nombre')`:
  - las de laravel-auth, laravel-options, laravel-notifications y laravel-uploads;
  - las del usuario generado (`api.app.user.*`);
  - las de cada modelo que generes.

  En Vue, pedir un nombre que no está lanza `Unknown backend route "x". Run php artisan route:json.`
- **La compilación.** `npm run build` de la aplicación base es sólo `vite build`: **no** ejecuta `route:json`. Después de `larapack:import` o de añadir rutas, ejecútalo tú antes de compilar.

::: warning Dos rutas por omisión distintas
El paquete escribe por omisión en `resources/vue/assets/json/routes.json`, y su README sugiere `resources/react/assets/json/routes.json` para React. La aplicación base lee `resources/vue/routes.json` o `resources/react/routes.json`. Si borras el `config/routes-to-json.php` que dejó `app:setup`, `route:json` vuelve a la ruta del paquete y la interfaz sigue leyendo un archivo viejo.
:::

Ver [Peticiones, rutas e idiomas](/interfaz/http-rutas-i18n).

## Actualizar

### De 2.0 a 2.1

- **Las rutas sin nombre ya no salen en el JSON.** Antes caían todas bajo la clave `""` y se pisaban entre sí.
- **Una ruta de salida relativa se resuelve contra la raíz del proyecto.**
- **Un `JSON_ROUTES_FILE=` vacío usa la ruta por omisión.** Antes el comando usaba otra (`resources/json/routes.json`) y fallaba al escribir.

El comando, la clave `path`, la variable y el tag no cambian. El único cambio visible en el JSON es que desaparece la clave `""`.

## Problemas frecuentes

- **«Unknown backend route», o una petición que va a la página actual.** El archivo es anterior a la ruta: `php artisan route:json` y vuelve a compilar.
- **El front sigue leyendo rutas viejas.** `route:json` escribe en otro sitio del que importa la interfaz; revisa `routes-to-json.path`.
- **Cambiaste `JSON_ROUTES_FILE` y no hace caso.** La configuración está cacheada: `php artisan config:clear`.
- **Una ruta no aparece.** No tiene nombre. Las rutas `PATCH` y `DELETE` de `key` de laravel-env-editor, por ejemplo, no lo tienen.
- **`routes.json` no es un secreto, pero es un mapa.** Va dentro del front compilado y lista todas las rutas con nombre de la aplicación, también las de administración. La protección es el middleware de cada ruta, no que no se conozca.
