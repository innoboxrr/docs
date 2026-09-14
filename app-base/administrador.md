# El administrador

`/admin` es la parte con sesión de la aplicación base. Toda ruta bajo `/admin` pide sesión, y las del módulo de LaraPack se montan como hijas.

## El layout

`AdminLayout` usa el shell de form-core (`fe-shell`):

- **Cabecera:** botón del menú (en pantallas estrechas), el nombre del sitio (`site_name`, o «Administrador» si falta) enlazado a `/admin`, la campana de notificaciones, el botón de modo oscuro y el menú de usuario.
- **Barra lateral:** el menú.
- **Contenido:** los avisos de suplantación y verificación, y la pantalla.

En móvil la barra lateral se cierra al navegar, con `Escape` y tocando el fondo. Hay un enlace «Saltar al contenido» para teclado.

El **menú de usuario** tiene «Perfil» y «Cerrar sesión». Al salir, Vue lleva a `/auth/login` y React a `/`, vaciando además las notificaciones.

## El menú

El menú **se construye, no se escribe**: un modelo que generes aparece solo al compilar.

1. **Inicio** (`admin.dashboard`), siempre primero.
2. Cada ruta **de primer nivel** del módulo de LaraPack con título y **sin parámetros**, en el orden en que la exporta el módulo, salvo las de `adminOnly`. `user/:id` necesita un registro y no se abre desde un menú.
3. Si la sesión es de administrador, un grupo **«Administración»** con:
   - las rutas del módulo que están en `adminOnly`;
   - **Sitio** (`/admin/site`);
   - **Registros** (`/log-viewer`, en otra pestaña);
   - **Entorno** (`/env-editor`, en otra pestaña).

| Dato de la entrada | De dónde sale |
|---|---|
| Texto | `meta.title` (Vue) o `handle.title` (React) de la ruta, traducido al leerse |
| Icono | `meta.icon` o `handle.icon`; por omisión `box`. Acepta un nombre del mapa de form-core o un nombre de Iconify (`mdi:web`). |
| Destino | El nombre de la ruta (Vue) o `adminBase` más su `path` (React) |

Las rutas que genera LaraPack traen título y `auth: true`, pero no icono. La forma exacta de lo que devuelve `buildMenu` en cada interfaz está en [Con Vue](/app-base/vue) y [Con React](/app-base/react).

## `adminOnly`

`resources/<ui>/app/config.js` exporta las rutas del módulo que sólo ve un administrador:

::: code-group

```js [Vue]
// resources/vue/app/config.js — nombres de ruta
export const adminOnly = [
    'AdminUsers',
]
```

```js [React]
// resources/react/app/config.js — ids de ruta
export const adminOnly = ['AdminUsers']
```

:::

Estar en `adminOnly` hace dos cosas:

- **En el menú**, la entrada pasa al grupo «Administración», que sólo existe para administradores.
- **En las guardas**, entrar exige `is_admin`. Sin él, la interfaz lleva a `/admin` con un aviso. Como las guardas miran toda la cadena de rutas, proteger el listado protege también el detalle y la edición.

LaraPack nombra la ruta de primer nivel de cada modelo `Admin<Plural>`: `AdminUsers`, `AdminProducts`. Las hijas son `AdminCreate<Modelo>`, `AdminShow<Modelo>` y `AdminEdit<Modelo>`.

::: warning `adminOnly` no protege datos
Decide qué se enseña. Quien protege es el backend. Las políticas que genera LaraPack **nacen cerradas**: sólo pasa un administrador. Un modelo nuevo fuera de `adminOnly` sale en el menú de todos, pero sus endpoints responden 403 a quien no administra hasta que abras su política. Ver [Personalizar y ampliar](/app-base/personalizar).
:::

## Lo que es sólo para administradores

| Qué | Quién lo decide en el backend |
|---|---|
| `/admin/site` | La ruta lleva `meta.admin` / `handle.admin`. Guardar pasa por la política de laravel-options: `before()` sólo deja pasar a `isAdmin()`. |
| `/log-viewer` | La puerta `viewLogViewer` de `AppServiceProvider`: usuario con `isAdmin()`. |
| `/env-editor` | `config/env-editor.php`: middleware `web`, `auth` y `admin` (`EnsureUserIsAdmin`). Se apaga con `ENV_EDITOR_ENABLED=false`. |
| Módulo de usuarios | `adminOnly` en la interfaz; `UserPolicy` en el backend. |

::: danger El editor del `.env` lee y reescribe secretos
Quien entra en `/env-editor` ve contraseñas y claves. Está activado por omisión en la aplicación base, detrás de `admin`. Si no lo necesitas en producción, pon `ENV_EDITOR_ENABLED=false`.
:::

## Inicio

`/admin` saluda («Hola, `<nombre>`») y enseña una tarjeta por cada entrada del menú, sin la de inicio. Las de otra pestaña llevan su marca.

| | Vue | React |
|---|---|---|
| Saludo | El primer nombre | El nombre completo |
| Sin entradas | Una tarjeta a «Perfil» | «Todavía no hay nada aquí. Genera un modelo con LaraPack y aparecerá en el menú.» |

## La campana de notificaciones

Usa [laravel-notifications](/paquetes/laravel-notifications) 2.1. Sus rutas llevan el prefijo `innoboxrr.notifications.`.

| Cuándo | Qué pide |
|---|---|
| Al montar el administrador, cada 60 s y al volver a la pestaña | El contador de no leídas (`index.unread.count`) |
| Al abrir la campana | Las 10 últimas (`index` con `limit: 10`) |
| Al pulsar una notificación | `mark.as.read` y navega a su acción |
| «Marcar todas como leídas» | `mark.all.as.read` |

- **La acción.** Sale de la respuesta de `mark.as.read` o de `data.action`. Una ruta interna (`/admin/…`) navega con el router; una URL `http(s)://` con `location`; cualquier otra cosa no lleva a ninguna parte.
- **El texto.** Es `data.message` (o `data.title`) y se pinta **siempre como texto**, nunca como HTML.
- **La fecha.** `created_at`, con `Intl.DateTimeFormat` en el idioma de la interfaz.
- El contador enseña «99+» a partir de 100. Un fallo del contador no se enseña: lo repite el siguiente intento.

Para que una notificación salga en la campana, envíala por el canal `database` con `message` y, si quieres, `action`:

```php
use Illuminate\Notifications\Notification;

class ReportReady extends Notification
{
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'Tu informe está listo.',
            'action' => '/admin',
        ];
    }
}

$user->notify(new ReportReady);
```

La tabla `notifications` la crea `php artisan notifications:install`, uno de los pasos de `app:install`.

## Modo oscuro

- El botón alterna entre claro y oscuro y guarda la elección en `localStorage` con la clave `theme`.
- La elección se aplica como `data-theme="dark"` o `data-theme="light"` en `<html>`. Sin elección no se escribe nada y form-core sigue a `prefers-color-scheme`.
- Un script en línea de `resources/views/app.blade.php` aplica la elección antes de pintar, así que la página no parpadea en claro.
- El mismo botón está en las pantallas de acceso y, en React, en la cabecera del sitio.
- Todo lo que usa las variables `--fe-*` cambia solo: el administrador, el sitio y las tablas.

## Idiomas

Los textos de la aplicación base se escriben en inglés con `t()` de [innoboxrr-i18n](/interfaz/http-rutas-i18n), y la traducción va en `resources/<ui>/app/lang/es.json`:

```js
t('Hello, :name', { name: 'Ana' })   // «Hola, Ana»
```

- **Idioma.** `setLocale(document.documentElement.lang)`, que Blade saca de `APP_LOCALE` (`app:setup` lo fija en `es`). innoboxrr-i18n no es reactivo: el idioma se fija una vez, antes de montar. Para cambiarlo, cambia `APP_LOCALE` y recarga.
- **Orden.** Primero las traducciones del módulo de LaraPack y después las de la aplicación: si repiten una clave, gana la de la aplicación.
- **Sin traducir.** Un valor `""` cuenta como sin traducir y no pisa uno anterior. Una clave sin traducción se ve tal cual, en inglés.
- **Otro idioma.** Añade `resources/<ui>/app/lang/<locale>.json`; el locale sale del nombre del archivo. En inglés no hace falta archivo, porque las claves ya lo son.
- **Módulos generados.** LaraPack deja vacías, a propósito, las traducciones al español de nombres de modelos y campos (`src/locales/es.json` con `""`). Tradúcelas en el `lang/es.json` de la aplicación, que gana y no se regenera.

Las dos interfaces no usan exactamente las mismas claves (por ejemplo «Sign in» en Vue y «Log in» en React). Cada una trae su `lang/es.json` completo.
