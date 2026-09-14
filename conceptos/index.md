# Cómo encaja todo

El ecosistema tiene tres capas. Arriba está lo que decides tú, `laraimport.json`. En medio, lo que genera LaraPack: la API y el módulo de interfaz de cada modelo. Abajo, los paquetes que usan lo generado y la aplicación base, que lo monta.

```
                        laraimport.json            lo que decides
                               │
                     php artisan larapack:import
               ┌───────────────┴────────────────┐
     API de Laravel                     Módulo de interfaz
     app/ o src/                        resources/<ui>/index.js
     rutas api.*, requests,             resources/<ui>/src/models/<entidad>
     políticas, Resources               Vue o React
               │                                 │
     php artisan route:json  ──►  routes.json  ──►  route('api.app.product.index')
               │                                 │
     laravel-auth, options,             laravel-setup: sitio, acceso y
     notifications, uploads…            administrador que monta el módulo
     traits, support, search-surge      form-core, form-elements, datatables…
```

## Los paquetes y su papel

### LaraPack y la aplicación base

| Paquete | Papel |
|---|---|
| `innoboxrr/larapack-generator` | Genera unas 58 piezas por modelo desde `laraimport.json`: la API y el módulo en Vue o React. Hace cumplir la arquitectura con `validate`, `verify` y `audit`, y guarda la línea base de versiones del ecosistema. |
| `innoboxrr/laravel-setup` | Convierte una aplicación Laravel 13 recién creada en la aplicación base: acceso, sitio público y administrador en Vue o React. Genera el `User` con LaraPack. |

### Paquetes de Laravel

::: details Qué hace cada uno
| Paquete | Papel | En la aplicación base |
|---|---|---|
| `innoboxrr/laravel-auth` | Acceso con JSON bajo `/auth`: login con sesión, registro, recuperar y cambiar la contraseña, verificación, tokens de Sanctum, Socialite y suplantación. | Cada llamada de acceso. |
| `innoboxrr/laravel-options` | Ajustes del negocio en la base de datos, con API pública de lectura. | El sitio público y su editor. |
| `innoboxrr/laravel-notifications` | API HTTP sobre las notificaciones de base de datos de Laravel. | La campana. |
| `innoboxrr/laravel-uploads` | Modelo y API de subidas. | El avatar del perfil. |
| `innoboxrr/laravel-audit` | Registros de auditoría, intentos de acceso y API de administración. | Instalado, sin interfaz. |
| `innoboxrr/laravel-env-editor` | Editor del `.env` en `/env-editor`. | Enlace del menú, sólo administrador. |
| `innoboxrr/aws-file-manager` | API de carpetas por usuario en S3. | Instalado, sin interfaz. |
| `innoboxrr/routes-to-json` | `route:json` exporta las rutas con nombre a `routes.json`. | Lo que lee el front. |
| `innoboxrr/locale-generator` | `locale:generate` y `locale:translate` para los `<idioma>.json`. | |
| `innoboxrr/traits` | `MetaOperations`: metas y `payload`, y otros traits. | Lo usa el código generado. |
| `innoboxrr/support` | `RequestFormater::flatten`, que aplana los grupos del formulario en metas, y utilidades. | Lo usa el código generado. |
| `innoboxrr/search-surge` | Filtros, orden y paginación de los índices generados. | Lo usa el código generado. |
| `opcodesio/log-viewer` (de terceros) | Visor de registros en `/log-viewer`. | Enlace del menú, sólo administrador. |
:::

### Paquetes de interfaz

::: details Qué hace cada uno
| Paquete | Papel |
|---|---|
| `innoboxrr-form-core` | Sin framework: variables de tema `--fe-*`, CSS, iconos por nombre, avisos y confirmaciones, utilidades de archivos, zonas horarias. |
| `innoboxrr-form-elements` | Los 37 componentes de Vue: controles de formulario y piezas de escritorio (drawer, menú, paleta de comandos). |
| `innoboxrr-react-form-elements` | Los mismos 37 componentes, con los mismos nombres, en React. |
| `innoboxrr-vue-datatable` / `innoboxrr-react-datatable` | La tabla del administrador sobre el contrato de modelo de LaraPack. |
| `innoboxrr-http-request` | `makeHttpRequest`, con reintentos y cancelación. |
| `innoboxrr-route-resolver` | `route(nombre, params)` sobre `routes.json`. |
| `innoboxrr-i18n` | `t()`, `addTranslations`, `setLocale`. |
| `innoboxrr-js-validator` | Validación de formularios con `data-validators`. |
| `innoboxrr-locale-generator` | El `npm run locale` del módulo generado: recoge las claves de traducción. |
:::

## Cómo se hablan el front y el back

Siete acuerdos sostienen todo. Cada uno tiene su explicación en [El contrato front ↔ back](/conceptos/front-back):

1. **Rutas con nombre.** El front no escribe URLs. `php artisan route:json` exporta las rutas a `routes.json`, `setRoutes(routes)` las carga y el código pide `route('api.app.product.index')`.
2. **El prefijo.** `API_ROUTE_PREFIX` en el contrato de cada modelo tiene que coincidir con el `->as()` del `RouteServiceProvider`. `larapack:verify` lo comprueba.
3. **La forma de la respuesta.** La tabla lee `data`, `meta` y `links` en la raíz: la aplicación llama a `JsonResource::withoutWrapping()`.
4. **La sesión.** La interfaz usa la cookie de Sanctum: `statefulApi()`, `GET /sanctum/csrf-cookie`, y axios con `withCredentials` y `withXSRFToken`.
5. **Las acciones.** El array `actions` del Resource dice qué puede hacer cada fila; la tabla lo pinta y lo ejecuta.
6. **Quién administra.** `isAdmin()` compara el correo con `config('auth.admins')`, que sale de `ADMIN_EMAILS`. Lo leen las políticas, el middleware `admin`, la suplantación, log-viewer y el editor del `.env`.
7. **Las metas.** El formulario envía grupos anidados, `support` los aplana (`seo.title` → `seo_title`), `traits` los guarda y `payload` guarda una copia para leerlos rápido.

## Cómo se monta un módulo en la aplicación base

En una aplicación, LaraPack escribe el módulo en `resources/<ui>/index.js` y `resources/<ui>/src/**`, sin `package.json` propio. La aplicación base lo carga así:

- Lo importa con `import.meta.glob('../index.js')`, no con un import fijo. Por eso la aplicación compila también antes de generar ningún modelo.
- Monta sus `routes` como hijas de `/admin`.
- Carga sus `translations` antes que las de `resources/<ui>/app/lang/*.json`, para que la aplicación pueda corregirlas.
- Importa `src/theme.js` si existe.
- En Vue instala el plugin del módulo; en React llama a `registerModuleRoutes('/admin')`.
- Construye el menú con las rutas de primer nivel del módulo que tienen título y no tienen parámetros.

En un paquete, el módulo vive en `resources/vue` o `resources/react` con su propio `package.json`, se publica en npm y la aplicación lo monta a mano. Ver [Paquete o aplicación](/conceptos/paquete-o-aplicacion).

## De quién es cada archivo

| Archivo | De quién | Qué pasa al regenerar |
|---|---|---|
| `laraimport.json` | Tuyo | Es la entrada. |
| Lo generado sin editar | De LaraPack | `--force` lo regenera. |
| Lo generado que editaste | Tuyo | Se conserva y se avisa. |
| Traits de Relations, Storage y Operations | Tuyos | Sólo se crean si faltan, incluso con `--force`. |
| Tests generados | Tuyos | Nunca se sobrescriben. |
| `resources/<ui>/app/**` de la aplicación base | Tuyo desde la instalación | LaraPack no lo toca. |
| `.larapack/manifest.json` | De LaraPack, versionado contigo | Registra cada archivo, su plantilla y su hash. |

La distinción entre lo tuyo y lo del generador la da el manifiesto: guarda el hash de cada archivo cuando se generó, y un archivo cuyo hash cambió es un archivo que editaste.

## Qué comprueba qué

| Herramienta | Mira | Cuándo |
|---|---|---|
| `larapack:validate` | `laraimport.json` contra el esquema y reglas de coherencia | Antes de generar. `import` también lo hace. |
| `larapack:verify` | El código contra el manifiesto y el contrato | Después de generar y en la CI. |
| `larapack:audit` | Un paquete contra la línea base del ecosistema | En la CI de cada paquete, antes de publicar. |
| Los tests generados | Que cada endpoint responde | Siempre. |

Siguiente: [La arquitectura de un modelo](/conceptos/arquitectura).
