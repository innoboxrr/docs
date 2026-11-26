# Guía de actualización

Mira la versión instalada con `composer show innoboxrr/larapack-generator` y busca tu fila. Las secciones se aplican **en orden**, desde la siguiente a tu versión hasta la última. Las notas completas de cada versión están en el `CHANGELOG.md` de LaraPack.

## Dónde estás

| Estás en | Esfuerzo | Qué rompe | Secciones a seguir |
|---|---|---|---|
| 5.x | Alto | PHP y Laravel, nombres de comandos, sitio del módulo de interfaz, aspecto | [5.x → 6.0](#de-5x-a-60), [6.x → 7.0](#de-6x-a-70) y todas las siguientes |
| 6.x | Medio | El aspecto del módulo, los iconos, la publicación | [6.x → 7.0](#de-6x-a-70) y todas las siguientes |
| 7.0 | Bajo | Nada; `verify` gana comprobaciones | [7.0 → 7.1](#de-70-a-71) y siguientes |
| 7.1 | Bajo | `audit` rechaza `version` en `composer.json` | [7.1 → 7.2](#de-71-a-72) y siguientes |
| 7.2 | Medio | Rutas Vue con `meta.auth`; archivos a regenerar | [7.2 → 7.3](#de-72-a-73) y siguientes |
| 7.3 | Bajo | Nada | [7.3 → 7.4](#de-73-a-74) y siguientes |
| 7.4 | Medio | Datatables 3.0; avisos y confirmación en la aplicación | [7.4 → 7.5](#de-74-a-75) y siguientes |
| 7.5.0 | Bajo | Nada; tres dependencias npm | [7.5.0 → 7.5.1](#de-750-a-751) y siguientes |
| 7.5.1 | Medio | La aplicación carga las traducciones del módulo; algunas claves cambian | [7.5 → 7.6](#de-75-a-76) y siguientes |
| 7.6 | Medio si usas metas; bajo si no | Metas conectadas; traits y support 2.1 | [7.6 → 7.7](#de-76-a-77) y siguientes |
| 7.7.0 | Bajo | La exportación trae Excel y usa el disco `local` | [7.7.0 → 7.7.1](#de-770-a-771) y siguientes |
| 7.7.1 | Bajo | La ficha nombra al registro por su columna | [7.7 → 7.8](#de-77-a-78) y siguientes |
| 7.8 | Bajo | Nada; datatables 3.1 y Vite 8 en el módulo | [7.8 → 7.9](#de-78-a-79) y siguientes |
| 7.9 | Bajo | El proveedor de eventos se regenera | [7.9 → 7.10](#de-79-a-710) y siguientes |
| 7.10.0 | Nada en un paquete; bajo en una aplicación | En una aplicación, factories y tests a regenerar | [7.10.0 → 7.10.1](#de-7100-a-7101) y siguientes |
| 7.10.1 | Nada en un paquete; bajo en una aplicación | En una aplicación, la exportación y su notificación a regenerar | [7.10.1 → 7.10.2](#de-7101-a-7102) y siguientes |
| 7.10.2 | Bajo | La salida de `--format=json` y el contrato del modelo sin `_token` por GET | [7.10.2 → 7.10.3](#de-7102-a-7103) y siguientes |
| 7.10.3 | Bajo | Claves ajenas `restrict` en tablas nuevas | [7.10 → 8.0](#de-710-a-80) y siguientes |
| 8.x | Alto en una aplicación con controladores escritos a mano; bajo si no | `verify` revisa todos los controladores; el Resource filtra `appends`; el nombre del modelo se valida | [8.0 → 9.0](#de-80-a-90) y siguientes |
| 9.0 | Nada hasta que se activa | El candado de `#[HandRolled]`, el check obligatorio en la CI y los tests de autorización | [9.0 → 9.1](#de-90-a-91) |

## El procedimiento, sea cual sea la versión

1. **Trabaja en una rama, con el árbol limpio** y `.larapack/manifest.json` versionado.
2. **Toma la foto de partida** con la versión actual: `php vendor/bin/builder larapack:verify --format=json`. Los archivos `customised` son los que la regeneración no va a tocar.
3. **Actualiza el generador**, con `--dev` si lo tienes en `require-dev`:

   ```bash
   composer require --dev innoboxrr/larapack-generator:"^9.0"
   ```

4. **Actualiza las instrucciones del agente**: `php vendor/bin/builder larapack:skill --force`.
5. **Valida el contrato**: `php vendor/bin/builder larapack:validate --vue --react`. Un esquema nuevo puede señalar algo que antes pasaba.
6. **Regenera**, primero en simulación:

   ```bash
   php vendor/bin/builder larapack:import --vue --react --dry-run --force
   php vendor/bin/builder larapack:import --vue --react --force
   ```

   Omite `--vue` o `--react` si el proyecto no tiene ese módulo.
7. **Lleva a mano los cambios a lo editado.** Cada archivo que el paso anterior conservó no recibió los arreglos de la versión; la sección de tu versión dice qué cambió en cada uno. Recuerda que los traits y los tests nunca se reescriben.
8. **Alinea las dependencias.** `larapack:audit` dice qué versiones de Composer no cumplen la línea base. En `resources/<ui>/package.json`, las dependencias `innoboxrr-*` tienen que coincidir con `internalNpm` de `ecosystem.json`; si ese archivo está editado, se cambian a mano.
9. **Comprueba**: `larapack:verify`, `vendor/bin/phpunit`, `larapack:audit`, `php artisan route:json` si cambió alguna ruta, la compilación del front y una pasada por la interfaz en el navegador.

## De 5.x a 6.0 {#de-5x-a-60}

La 6.0 pasa a Laravel 13 y PHP 8.3, cambia los nombres de los comandos y mueve el módulo de interfaz al paquete. Nada de esto es compatible con la 5.x.

**Requisitos.** PHP `^8.3`, `illuminate/support ^13.0` y `symfony/console ^7.4 || ^8.0`. Las dependencias internas, las de la línea base actual (`innoboxrr/traits`, `innoboxrr/support` e `innoboxrr/search-surge`, ver `ecosystem.json`).

**Comandos.** Cambia scripts, CI y documentación:

```text
make:full-model   →  larapack:full-model
json:importer     →  larapack:import
remove:full-model →  larapack:remove-full-model
```

El binario `builder` mantiene los nombres antiguos como alias; Artisan no.

**El contrato.** `laraimport.json` se valida contra un esquema antes de generar. Ejecuta `larapack:validate` y corrige el JSON hasta que pase. `assignments` y `filters` quedan obsoletas.

**La interfaz.** El módulo vive en `resources/vue` o `resources/react` del paquete y se publica como su propio paquete npm. Actualiza los imports de la aplicación al paquete nuevo.

**El manifiesto.** Un proyecto de la 5.x no tiene `.larapack/manifest.json`, así que el generador no sobrescribe nada que ya exista, ni con `--force`. Para adoptarlo:

1. Genera sobre una copia limpia: `larapack:import --root=../copia-limpia`.
2. Compara con `git diff --no-index` los archivos que no tocaste.
3. Borra en el proyecto los que no tengan cambios tuyos y vuelve a importar: así entran en el manifiesto.
4. Los que sí tengan cambios tuyos, pórtalos a mano sobre la versión nueva, o déjalos sabiendo que no recibirán arreglos.

**Arreglos que llegan al regenerar.** Formularios que había que enviar dos veces, migraciones en un orden que hacía fallar `migrate`, reglas con cuantificadores que borraban `messages()` y `handle()` del request, y relaciones que apuntaban a `App\Models` dentro de un paquete.

## De 6.x a 7.0 {#de-6x-a-70}

El módulo de interfaz deja de depender de UIkit, Tailwind y Font Awesome, que nadie declaraba. **Un módulo de la 6.x no se actualiza cambiando el número**: su aspecto venía de la aplicación.

**El aspecto.** Regenera el módulo. La aplicación importa una vez el tema de cada módulo (`import 'acme-catalogo/src/theme.js'`) y deja de necesitar UIkit y Font Awesome para él. Si la aplicación tiene su propio sistema visual, se conecta con `setTheme`. Los mixins globales `inputClass` y `buttonClass` ya no se usan.

**Los iconos.** Se piden por nombre semántico. **Traduce los recursos escritos a mano**: `'icon' => 'fa-eye'` pasa a `'icon' => 'show'`, `fa-edit` a `edit`, `fa-trash` a `delete` y `fa-plus` a `plus`.

**Componentes globales.** `BreadcrumbsComponent` y `DropdownButtonComponent` ya no hacen falta: el módulo genera su propio `Breadcrumbs` y su `ActionMenu`. Quita su registro global si sólo existía para los módulos generados.

**La línea base.** Ejecuta `larapack:audit` y corrige lo que diga: PHP, `illuminate/*`, testbench y dependencias internas.

**La publicación.** `bump-patch.yml` publicaba en cada push sin correr tests. Sustitúyelo por `tests.yml` y `release.yml` (ver [Los workflows](/ci/workflows)) y crea `VERSION` con la versión actual. Para ver los archivos exactos, crea un paquete con `larapack:new` en un directorio aparte: su `--dry-run` no deja archivos.

## De 7.0 a 7.1 {#de-70-a-71}

No hay que cambiar nada: un `laraimport.json` que no declara las claves nuevas genera exactamente lo mismo.

`routes`, `immutable` y `secret` son nuevas. Si en algún modelo **borraste a mano acciones que sobraban**, `larapack:verify` ahora lo señala como `route-not-declared` y falla la CI. Declara la forma real en el JSON y regenera con `--force`:

```json
{ "name": "AuditEvent", "immutable": true, "routes": { "only": ["policies", "index", "show"] } }
```

`immutable-write` y `secret-exposed` también son errores nuevos. Ver [Rutas, inmutables, secretos y usuarios](/larapack/acciones).

## De 7.1 a 7.2 {#de-71-a-72}

`larapack:audit` trata como error un `composer.json` que fija su propia `version`, porque Composer descarta cada tag que no coincide con ella. **Borra la línea `"version"` del `composer.json`** y publica desde `VERSION`.

## De 7.2 a 7.3 {#de-72-a-73}

La 7.3 corrige lo que impedía que un paquete generado arrancara y funcionara instalado en una aplicación.

**Regenera con `--force`** y, en lo que editaste, aplica a mano:

| Archivo | Qué cambió |
|---|---|
| `AppServiceProvider` | Carga migraciones, vistas y configuración, que venían comentadas. |
| Políticas | Tipan `Authenticatable` en lugar de `App\Models\User`, consultan `isAdmin()` sólo si existe y apagan `forceDelete` en `$exceptAbilities`. |
| `Traits/Storage` | `forceDeleteModel()` ya no hace `abort(403)`. Es un trait: se cambia a mano. |
| Factories | Dan valor a todos los tipos de columna y usan la factory del modelo relacionado. |
| `tests/TestCase.php` | Registra el paquete, migra, autentica con Sanctum y abre la autorización. En un paquete se genera además `tests/User.php`. |
| Tests de endpoints | Llaman a las rutas por nombre. No se reescriben: bórralos y vuelve a importar si no los tocaste. |

**Rutas del módulo Vue.** Declaran `meta: { auth: true }` y ya no importan `@router/middleware`. **Si la aplicación protegía las rutas leyendo `meta.middleware`, pasa a leer `meta.auth`**; en React, `handle.auth`.

**En la aplicación.** Asegura `laravel/sanctum` y `JsonResource::withoutWrapping()`.

## De 7.3 a 7.4 {#de-73-a-74}

Nada se rompe.

- Para empezar un paquete, `larapack:new` en lugar de copiar otro.
- Si ejecutaste `larapack:providers` más de una vez, revisa `extra.laravel.providers` del `composer.json` y quita los proveedores duplicados.
- Si el proyecto tiene `phpunit.xml.dist` y también un `phpunit.xml` generado, borra el segundo: tapaba al primero.

## De 7.4 a 7.5 {#de-74-a-75}

Los módulos generados pasan a usarse como una aplicación de escritorio. Es la actualización con más cambios en el front desde la 7.0.

**Dependencias npm** de `resources/<ui>/package.json`:

| Paquete | Versión |
|---|---|
| `innoboxrr-form-core` | `^2.6.0` |
| `innoboxrr-form-elements` (Vue) | `^6.4.0` |
| `innoboxrr-react-form-elements` (React) | `^3.4.0` |
| `innoboxrr-vue-datatable` (Vue) | `^3.0.0` |
| `innoboxrr-react-datatable` (React) | `^3.0.0` |

**En la aplicación, una vez:** monta `ToastRegionComponent` y `ConfirmHostComponent` (ver [Montar un paquete](/larapack/montar-en-aplicacion#avisos-y-confirmacion)). Sin ellos los avisos no se ven y la confirmación cae en `window.confirm`.

**Regenera con `--force`** y, en lo que editaste, aplica a mano:

| Archivo | Qué cambió |
|---|---|
| `views/AdminView` | Deja la tabla montada, abre el alta en un drawer y recarga con `refresh()` en lugar de remontar la tabla con una `key`. Añade la paleta de comandos. |
| `views/CreateView`, `views/EditView` | Ya no navegan ni pintan migas: avisan con `updateData` (Vue) u `onUpdateData` (React). **Un formulario editado que navegue al guardar deja el drawer abierto sobre otra página.** |
| `views/ShowView` | Esqueleto mientras llega el registro y edición en drawer. |
| `widgets/DataTable` | Expone `refresh()` (Vue, `defineExpose`) o acepta `ref` (React). |
| `widgets/ModelCard`, `widgets/ModelProfile` | Clases del tema en lugar de Tailwind; borrar avisa y no trata una cancelación como error. |
| `src/components/ActionMenu` | Menú desplegable sobre `MenuComponent`; los elementos admiten `icon`. |
| `models/<kebab>/index.js` | Borrar, borrar para siempre y exportar preguntan con `confirmAction` en lugar de SweetAlert. Cancelar sigue rechazando con `RequestCancelledError`. |

**Si tu código usa los datatables directamente**, la 3.0 no es compatible con la 2.x:

- Ya no existen `NavDropdownComponent`, `IconRouteComponent`, `IconLinkComponent`, `DisabledLinkComponent` ni `PaginationComponent` (Vue), ni `ActionListComponent` y `DatatableIcon` (React).
- `DataTableComponent` recibe la instancia de TanStack Table.
- Los textos por defecto están en español y se cambian con el prop `labels`.
- Un fallo ya no se reintenta en silencio: se ve y se reintenta a mano.
- Las pruebas en jsdom que abran un menú tienen que simular `@floating-ui/dom`.

Los README de los dos datatables tienen su propia sección «De 2.x a 3.0»; ver también [Tablas](/interfaz/datatables).

**Comprueba en el navegador**: crear desde la tabla, editar desde el detalle, borrar con confirmación, un borrado que falla y la paleta con Ctrl+K.

## De 7.5.0 a 7.5.1 {#de-750-a-751}

No hay que regenerar. Sube tres dependencias en `resources/<ui>/package.json`:

| Paquete | Versión |
|---|---|
| `innoboxrr-form-core` | `^2.7.0` |
| `innoboxrr-form-elements` (Vue) | `^6.5.0` |
| `innoboxrr-react-form-elements` (React) | `^3.5.0` |

Con ellas los formularios dejan de necesitar Tailwind: las etiquetas, el grupo repetible, la zona de archivos, las casillas del código y el avatar salen del tema. Si tu aplicación sobrescribía esos campos con clases de Tailwind, revisa que se vean como esperas en claro y en oscuro.

## De 7.5 a 7.6 {#de-75-a-76}

Lo generado pasa a hablar un solo idioma, el de la aplicación: todo texto visible es una clave en inglés, y LaraPack escribe su traducción al español.

**Dependencias npm** de `resources/<ui>/package.json`: `innoboxrr-i18n` `^1.2.0` e `innoboxrr-locale-generator` `^2.0.0` en `devDependencies`. El script `locale` pasa de `npx locale-gen` a `locale-gen`.

**En la aplicación, una vez:** carga las traducciones del módulo antes que las tuyas y elige idioma (ver [Traducciones](/larapack/montar-en-aplicacion#traducciones)):

```js
addTranslations(translations)   // import { translations } from 'tu-modulo'
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))
setLocale(document.documentElement.lang)
```

**Regenera con `--force`.** Los archivos del módulo que editaste se conservan; aplica el cambio a mano en ellos:

| Archivo | Qué cambió |
|---|---|
| `src/i18n.js` | Nuevo. Exporta `translations` y `tableLabels()`. |
| `src/locales/en.json`, `es.json` | Nuevos. LaraPack les suma las claves que falten cada vez que genera y nunca toca una traducción escrita. |
| `index.js` del módulo | Exporta `translations`. |
| `models/<kebab>/routes/index.js` | `title` es un getter que traduce al leerse. Antes era español fijo con el nombre de la clase («Editar Products»). |
| `views/AdminView`, `views/ShowView` | Migas, paleta, drawer y título de pestaña traducidos. |
| `widgets/DataTable` | Pasa `labels` a la tabla. |
| `src/components/Breadcrumbs`, `ActionMenu` | Su etiqueta accesible se traduce. |
| `Http/Resources/Models/<Model>Resource.php` | Las acciones de cada fila usan `__()`. |
| `Notifications/<Model>/ExportNotification.php` | Asunto y cuerpo con `__()`; antes el asunto iba en inglés y el cuerpo en español. |
| `Http/Events/<Model>/Events/*` | Toman el idioma de la petición. Antes valían `'en'` y llamaban a `App::setLocale`, así que cada alta, edición o borrado pasaba a inglés el resto de la petición. |

**Claves que cambian.** Si tu aplicación ya traducía las anteriores, muévelas:

| Antes | Ahora |
|---|---|
| `Create Posts` | `Create :name`, con `name` = `t('Post')` |
| `Post created` | `Record created` |
| `Post deleted` | `Record deleted` |

**En el paquete Laravel:** el proveedor generado carga `lang/` con `loadJsonTranslationsFrom`. Si tu `AppServiceProvider` es anterior, añade:

```php
$this->loadJsonTranslationsFrom(__DIR__ . '/../../lang');
```

**Traduce lo tuyo.** El nombre del modelo y de sus campos quedan en `src/locales/es.json` con `""`; mientras lo estén, la pantalla enseña la clave en inglés.

**Comprueba en el navegador**, en español y en inglés: el índice, la tabla con un error, la paleta, crear, editar y borrar.

## De 7.6 a 7.7 {#de-76-a-77}

Lo que se genera con `metas: true` pasa a funcionar: guarda las metas del formulario y mantiene `payload`. Un modelo sin metas sale igual que antes.

**Composer**, en el `composer.json` del paquete: `innoboxrr/traits` `^2.1` e `innoboxrr/support` `^2.1` (nuevo: aplana los grupos anidados del formulario).

**npm**, opcional porque llega por `^`: `innoboxrr-form-core` `^2.8.0`, `innoboxrr-form-elements` `^6.6.0` e `innoboxrr-react-form-elements` `^3.6.0`, con el teléfono que sigue el tema.

**En el laraimport:**

- Declara `protected_metas` con las metas que sólo escribe tu código.
- Ya no hace falta declarar `payload`: se añade solo. Si lo declarabas `creatable` o `updatable`, `larapack:validate` avisa y se ignora.

**Regenera y aplica a mano lo de los traits.** `Relations`, `Storage` y `Operations` sólo se crean si no existen, así que ni `--force` los reescribe. En un modelo con metas:

| Archivo | Qué cambió |
|---|---|
| `Traits/Relations/<Model>Relations.php` | La relación `metas()`. Sin ella `meta()` y `setMeta()` fallan. |
| `Traits/Storage/<Model>Storage.php` | `createModel()` y `updateModel()` llaman a `updateModelMetas()`, que aplana con `RequestFormater` y rehace `payload`. |
| `Traits/Operations/<Model>Operations.php` | `buildPayload()` y `updatePayload()`, que guarda sin disparar eventos. |
| `Models/<Model>.php` | `$protected_metas` sale del contrato; `payload` fuera de `$fillable`, `$creatable`, `$updatable` y `$export_cols`. |
| `database/factories/<Model>Factory.php` | Ya no inventa `payload`. |

El contenido exacto de los tres traits está en [Metas y payload](/larapack/metas#los-traits).

**Si ya usabas metas a mano**, `innoboxrr/traits` 2.1 cambia dos cosas:

- `update_metas()` ignora las claves de `$protected_metas`, aunque estén en `$editable_metas`.
- Un array vacío borra la meta; antes se guardaba como `"[]"`.

**Las migraciones nuevas de metas** ya no llevan `softDeletes()`: el trait borra de verdad. Las tablas que ya existen no cambian.

**Comprueba**: crea un registro mandando un grupo anidado, edítalo vaciando una meta y mira `payload` en la respuesta.

## De 7.7.0 a 7.7.1 {#de-770-a-771}

Lo que encontró un piloto en una aplicación Laravel 13 nueva. No cambia el contrato.

**Si el administrador sale sin estilos**, añade `src/theme.js` a `sideEffects` en `resources/<ui>/package.json`:

```json
"sideEffects": ["*.css", "*.vue", "src/theme.js"]
```

En React, `["*.css", "src/theme.js"]`. Sin él, Vite descarta el import del tema y con él la hoja de estilos.

**Si tienes migraciones duplicadas** (`create_<tabla>_table` dos veces con horas distintas), borra la más nueva y su entrada en `.larapack/manifest.json`. Volver a importar ya no las duplica, y `import --dry-run` ya no escribe archivos.

**Exportación**, en el `composer.json` del paquete y en su configuración:

- `maatwebsite/excel` pasa de `require-dev` o `suggest` a `require`;
- `export_disk` por defecto `local`, y `notification_via` por defecto `['mail']`.

Regenera con `--force` `ExportRequest` y `ExportNotification` si no los editaste: avisan con un mensaje claro si falla y enlazan a una descarga firmada.

**En la aplicación**: `$middleware->statefulApi()` en `bootstrap/app.php`, y `vue-router@4` con `pinia@3` (ver [Montar un paquete](/larapack/montar-en-aplicacion)).

## De 7.7 a 7.8 {#de-77-a-78}

La ficha, las migas y el título de la pestaña nombran al registro por su columna. Antes leían siempre `.name`, y un modelo con `title` salía con el nombre del modelo.

**En el laraimport, opcional:** `"display": "sku"` si la columna que lo nombra no es `name`, `title` ni la primera columna de texto. Una columna que no existe o una `secret` son un error de `larapack:validate`.

**Regenera con `--force`** `views/ShowView` y `widgets/ModelCard`. Si los editaste, cambia a mano `.name` por la columna en esos dos archivos: tres sitios en total. Un modelo con `name` sale igual que antes.

## De 7.8 a 7.9 {#de-78-a-79}

Acciones masivas, edición en la celda, exportar desde la paleta, campos para las metas, migraciones de alteración, Pint y Larastan, y Vite 8. No cambia el contrato: sin `routes`, un modelo gana `bulkUpdate` y `bulkDelete` solo.

**Regenera con `--force`**, primero en simulación. Cambian el controlador, las rutas, `PoliciesRequest`, el test de endpoints y, en la interfaz, `index.js`, `widgets/DataTable`, `views/AdminView`, `forms/CreateForm` y `forms/EditForm`. Aparecen `BulkUpdateRequest` y `BulkDeleteRequest`. Un modelo con `routes.only` sólo las tiene si las añades a la lista.

**Si editaste alguno**, lo mínimo a mano:

- `PoliciesRequest`: `'bulkUpdate' => 'update'` y `'bulkDelete' => 'delete'` en `$policyMethodMapping`;
- `widgets/DataTable`: pasa `selectable` a la tabla y un modelo con `dataTableComponents: () => ({ ClickToEdit: ClickToEditComponent })` (en React, un envoltorio que pase `save` como `onSave`);
- `index.js`: `bulkActions()`, `bulkUpdateModels`, `updateField` y `bulkDeleteModels` salen tal cual de un paquete recién generado.

El test de endpoints no se reescribe: si no lo tocaste, bórralo y vuelve a importar para recibir los tests de las masivas.

**Dependencias** en `resources/<ui>/package.json`: `innoboxrr-vue-datatable` o `innoboxrr-react-datatable` `^3.1.0`, `innoboxrr-form-elements` `^6.7.0` o `innoboxrr-react-form-elements` `^3.7.0`, `vite` `^8.0.0` y, en React, `@vitejs/plugin-react` `^6.0.0`.

**Migraciones.** Desde ahora, cambiar columnas y reimportar escribe una alteración. Si antes regeneraste con `--force` la migración de creación de una tabla ya migrada, esa diferencia nunca llegó a tu base y LaraPack ya no la ve: escribe esa alteración a mano una vez. Ver [Migraciones](/larapack/migraciones#alteraciones).

**Formato y tipos, opcional en un paquete existente:** `composer require --dev laravel/pint larastan/larastan`, copia `pint.json`, `phpstan.neon.dist` y el trabajo `quality` de `tests.yml` de un paquete recién creado, y formatea una vez con `vendor/bin/pint` en su propio commit.

**El teléfono de Vue valida por país**, como el de React: un número de 10 dígitos que no es válido para su país deja de pasar, y uno español de 9 empieza a pasar. Lo que emite no cambia.

## De 7.9 a 7.10 {#de-79-a-710}

No cambia el contrato: `authenticatable` es nuevo y opcional. La línea base pide ahora `innoboxrr/larapack-generator ^7.10`; `larapack:audit` avisa, sin fallar, a quien sigue en `^7.0`.

**Regenera el proveedor de eventos** con `larapack:event-service-provider --force`, primero con `--dry-run`. El anterior leía la caché al arrancar: en una aplicación con `CACHE_STORE=database`, lo que trae Laravel 13, `php artisan migrate` fallaba antes de crear la tabla de la caché. Y como la clave era la misma en todos los paquetes, uno recibía los listeners de otro. Si lo editaste, quita el `Cache::remember('events_and_listeners', ...)` y recorre `discoverEvents()` directamente.

**Módulos dentro de una aplicación.** El módulo de interfaz ya no escribe `package.json` ni `vite.config.js` cuando el proyecto es una aplicación: pisaban los de la aplicación. Si una versión anterior los dejó en `resources/<ui>/`, no los usa nadie: la aplicación compila el módulo con su propio Vite, y su `package.json` tiene que declarar las dependencias del módulo.

## De 7.10.0 a 7.10.1 {#de-7100-a-7101}

No cambia el contrato. En un paquete no hay nada que hacer: lo generado es lo mismo.

**En una aplicación generada con 7.10.0**, las factories estaban en `App\Database\Factories` y los tests en `App\Tests`, que la aplicación no carga, y los tests llamaban a URIs que no existen y sin sesión. Regenera o corrige a mano:

- **Factories y modelos.** `larapack:import --dry-run` y después `larapack:import --force`. En los que editaste, cambia `App\Database\Factories` por `Database\Factories` en la factory y en el `use` del modelo.
- **Tests.** No se pisan nunca, tampoco con `--force`. Si no los tocaste, borra `tests/Feature/Models/<Model>EndpointsTest.php` y vuelve a importar. Si los editaste, cambia `App\Tests` por `Tests`, llama a las rutas con `route('api.app.<modelo>.<acción>')` e inicia sesión antes de cada llamada, como el test nuevo.
- **`tests/TestCase.php`.** Si lo creó LaraPack 7.10.0 porque la aplicación no tenía uno, extiende `Orchestra\Testbench\TestCase`: bórralo y vuelve a importar.
- **Registra el `EventServiceProvider`** en `bootstrap/providers.php` si no lo tenías (`larapack:event-service-provider` lo crea): sin él la exportación no avisa.

Los tests nuevos inician sesión con la factory del modelo de `auth.providers.users.model`, abren la autorización en su `setUp()` y, en la edición masiva, apartan las columnas únicas, como `users.email`.

## De 7.10.1 a 7.10.2 {#de-7101-a-7102}

No cambia el contrato. En un paquete no hay nada que hacer: lo generado es lo mismo.

**En una aplicación generada con 7.10.0 o 7.10.1**, cada exportación fallaba al renderizar («No hint path defined for [app]»), y su notificación leía `app.notification_via` y `app.export_disk`, dentro de la configuración de Laravel. Regenera o corrige a mano:

- **Exportación y notificación.** `larapack:import --dry-run` y después `larapack:import --force`: se regeneran `app/Exports/<Plural>Exports.php` y `app/Notifications/<Model>/ExportNotification.php`. En los que editaste, cambia `config('app.excel_view', 'app::excel.')` por `config('larapack.excel_view', 'excel.')`, y `app.notification_via` y `app.export_disk` por `larapack.notification_via` y `larapack.export_disk`.
- **Configuración.** Si añadiste `excel_view`, `notification_via` o `export_disk` a `config/app.php`, llévalos a `config/larapack.php` (`larapack:config` lo crea) y quítalos de `config/app.php`.
- **La migración de `users`.** Nada: `larapack:import` ya no la da por editada a mano ni pide una alteración contra ella. La omite con «no la generó LaraPack».

## De 7.10.2 a 7.10.3 {#de-7102-a-7103}

No cambia el contrato ni lo que se genera en PHP.

- **La salida de `--format=json`.** Es un único documento JSON, también cuando algo falla: `{"ok": false, "error": "..."}` con código de salida 1. Si tu CI o tu agente recortaba el progreso de `larapack:import` antes de decodificar, ya no hace falta: decodifica la salida entera. Los avisos del laraimport van en `findings`.
- **El token CSRF en las peticiones GET.** El contrato del modelo (`models/<entidad>/index.js`) ya no manda `_token` en `getPolicies`, `getPolicy`, `indexModel` ni `showModel`. Si no lo editaste, `larapack:import --vue --force` (o `--react`) lo regenera; si lo editaste, quita `_token: csrfToken(),` de esas cuatro llamadas. Las escrituras lo siguen mandando.
- **Las tablas.** Sube `innoboxrr-vue-datatable` o `innoboxrr-react-datatable` a `^3.1.1`, que hace lo mismo con las peticiones de la tabla.

## De 7.10 a 8.0 {#de-710-a-80}

Las claves ajenas de las tablas nuevas salen con `restrict` en vez de `cascade` (los pivotes siguen en `cascade`), y `table_prefix` es nuevo y opcional. **Las tablas que ya existen no se tocan**: el generador reutiliza su migración de creación y, si una clave ajena cambió, deja un comentario para escribir la alteración a mano. Si dependías de la cascada en tablas nuevas, decláralo en la propiedad con `"on_delete": "cascade"`.

## De 8.0 a 9.0 {#de-80-a-90}

**Cambia lo que `verify` deja pasar.** Antes sólo miraba el manifiesto; ahora revisa todos los controladores del proyecto y de sus paquetes locales, y un proyecto que pasaba puede fallar. El contrato no rompe: [`endpoints` y `controllers`](/larapack/endpoints) son nuevos y opcionales. Lo generado sólo cambia en el IndexRequest, el Resource y la exportación.

Los tres cambios que rompen:

| Cambio | A quién afecta |
|---|---|
| `verify` revisa la forma de todos los controladores (`controller-shape`, `request-handle`, `controller-concern`) | A quien tiene controladores escritos a mano con lógica, o traits de autorización en `Http/Controllers`. |
| El Resource sólo añade los `appends` que declara en `$appendable` | A quien pedía accessors desde el cliente con `appends[]`. Ni la interfaz generada ni las aplicaciones conocidas los piden. |
| El nombre del modelo se valida en la línea de órdenes | A un script que llamaba a `larapack:model` con guiones o rutas. |

En este orden:

1. **Actualiza y mira dónde estás, sin la guardia todavía:**

   ```bash
   composer require --dev innoboxrr/larapack-generator:"^9.0"
   php artisan larapack:skill --force
   php artisan larapack:verify --format=json
   ```

   En una aplicación real de 80 paquetes falló en cuatro controladores escritos a mano —un listado de módulos, el canje de un token, un registro LTI y un webhook— y en los traits de autorización de `Http/Controllers/Concerns`. Para mirar sólo eso: `--check=controller-shape --check=request-handle --check=controller-concern`.

2. **Cada controlador escrito a mano, a su sitio.** Por orden de preferencia:

   - **Declararlo.** Si actúa sobre un modelo, en sus `endpoints`; si no, en `controllers[]`. `larapack:import` genera el controlador, la ruta, la request, la habilidad y el test; la lógica pasa a `handle()` o a la operación del modelo, y se borran el controlador y la ruta escritos a mano. La ruta generada tiene otro nombre: actualiza el front que llamaba a la vieja y vuelve a exportar `routes.json`.

     ```json
     "controllers": [
         { "name": "Platform", "endpoints": [ { "name": "installedModules", "method": "get" } ] }
     ]
     ```

   - **Dejarlo a mano con un `FormRequest`.** El controlador queda en `return $request->handle();`; `authorize()` autoriza, `rules()` valida y `handle()` hace el trabajo o lo delega. Si el protocolo dicta la forma del error, sobrescribe `failedValidation()` o `failedAuthorization()` en la request; la firma sobre el cuerpo en bruto se comprueba ahí con `$this->getContent()`. La skill trae un ejemplo antes y después.
   - **`#[HandRolled('razón')]`, sólo si el dueño del proyecto lo aprueba.** No es un arreglo: `verify` lo sigue listando como aviso y con `--strict` falla.

3. **Los traits de `Http/Controllers/Concerns` que sólo usan requests** se mueven a `Http/Requests/Concerns` (cambia su namespace y el `use` de cada request). Uno que usa un controlador es error: su lógica va a la request.

4. **Regenera lo que no editaste**, primero en simulación: `larapack:import --dry-run --force` y `larapack:import --force`. Así recibes el IndexRequest que fuerza `managed`, el Resource con `$appendable` y la exportación que guarda como texto lo que empieza por `=`.

5. **Lleva la seguridad a lo editado.** `verify` avisa con `index-managed` y `resource-appends`, y [`larapack:fix`](/larapack/verificar#fix) lo arregla en todos los archivos a la vez:

   ```bash
   php artisan larapack:fix index-managed resource-appends --dry-run
   php artisan larapack:fix index-managed resource-appends
   php artisan larapack:verify --check=index-managed --check=resource-appends
   ```

   Lo que salte (`skipped`, con su razón) se hace a mano:

   ```php
   // IndexRequest: el listado siempre pasa por ManagedFilter::canView().
   protected function prepareForValidation(): void
   {
       $this->merge(['managed' => true]);
   }
   ```

   En el Resource, añade `protected array $appendable = [];` con los accessors que pida la interfaz, y pasa a `setAppends()` sólo la intersección con esa lista, sumada a `getAppends()`. **Revisa que cada `canView()` cubra al administrador**: con `managed` forzado también le acota, y el reporte `admin_path_missing` de `larapack:fix` dice cuáles no tienen camino.

6. **Activa la guardia con `verify` limpio:**

   ```bash
   php artisan larapack:verify --format=json    # ok: true
   php artisan larapack:skill --hooks
   ```

   Antes de eso, cada edición de un archivo con errores retendría al agente por algo que no causó. Versiona `.claude/settings.json` y el bloque de `AGENTS.md` para que lo tengan todas las sesiones.

**Dependencias.** En el módulo Vue, `vue-router` 5 y `pinia` 4 ya valen. Los pisos de los paquetes `innoboxrr-*` suben a las versiones que migraron a Vite 8 y Vitest 5 (`internalNpm` de `ecosystem.json`): alinéalos en `resources/<ui>/package.json` si está editado. Un paquete npm propio que siga en `vitest ^3` o `engines >=20` sale en `larapack:audit`: ver [La línea base](/ci/#node).

## De 9.0 a 9.1 {#de-90-a-91}

**Nada cambia hasta que lo actives**: sin `.larapack/hand-rolled.lock`, `verify` trata `#[HandRolled]` como en 9.0, y el workflow y CODEOWNERS sólo se crean si se pide. Lo que trae:

- **El candado de las excepciones**, con la razón y la huella del código aprobado, y `larapack:hand-rolled` para mantenerlo. Ver [Excepciones](/larapack/verificar#handrolled).
- **`larapack:ci`**: `verify --strict` como check obligatorio de la rama, con CODEOWNERS y una orden de protección que tampoco deja pasar a un administrador. Ver [En la CI](/larapack/verificar#ci).
- **El hook PreToolUse** de la guardia (`Write|Edit|MultiEdit|Bash`), que impide a un agente aprobar o revocar una excepción y escribir el candado, por cualquier herramienta.
- **Tests generados que prueban lo que cierra la autorización**: sin sesión, 401 en cada acción; con la autorización negando, 403; el listado pasa por su `ManagedFilter`. Ver [Lo que prueban los tests generados](/larapack/verificar#tests-generados).
- **Una segunda auditoría de seguridad** de lo generado, con miles de cadenas hostiles por cada contexto donde un valor del laraimport acaba como código.

Lo hace **el dueño del proyecto**, una vez:

```bash
composer require --dev innoboxrr/larapack-generator:"^9.1"
php artisan larapack:skill --force --hooks        # añade el hook PreToolUse
php artisan larapack:hand-rolled list             # cada excepción, «sin candado»
php artisan larapack:hand-rolled approve --all    # crea .larapack/hand-rolled.lock con sus huellas
cat .larapack/hand-rolled.lock                     # revisa objetivos y razones
php artisan larapack:verify --strict --format=json
php artisan larapack:ci --owner=@<dueño-o-equipo>
git add .larapack/hand-rolled.lock .github .claude/settings.json
```

Comitea, deja que el workflow corra una vez y protege la rama con la orden que imprime `larapack:ci`. Si el proyecto corre la CI en runners propios, pásalos con `--runs-on`; sin ellos el job va a `ubuntu-latest`. La orden pide `enforce_admins=true`: un push directo a la rama con una cuenta de administración deja de entrar sin el check. Si el proyecto subía así, tiene que pasar por PR, desde una cuenta que no sea la del único dueño de código (GitHub no deja aprobar un PR propio).

Tres cosas que conviene saber antes:

- **`verify --strict` tiene que salir en verde antes de exigirlo.** Si los `<Modelo>EndpointsTest` son de antes de 9.1, `verify` avisará por cada uno con `endpoint-tests-outdated` hasta que se regeneren: guarda lo que les añadiste, bórralos, vuelve a importar (sin `--force` basta) y pégalo de nuevo. Las pruebas nuevas pueden destapar un `authorize()` que no pregunta o un listado sin acotar: es lo que buscan.
- **Un `controllers[]` que deja entrar a cualquiera con sesión** se declara con [`"authorize": "authenticated"`](/larapack/endpoints#authenticated) antes de regenerar: `import --force` reescribe el test de cada endpoint que nadie editó, y el nuevo espera un 403 que ese endpoint no da.
- **Un solo candado por raíz.** El `verify` de la raíz recorre `packages/*`, así que el candado de la raíz aprueba también las excepciones de los paquetes locales, y `larapack:audit` no pide un job `verify-job` por paquete si la raíz corre `verify --strict`. Sólo un paquete que corre `verify --strict` en su propio repositorio necesita el suyo (`--root=packages/<paquete>`).

**Al regenerar** sólo cambia lo generado donde había valores raros: etiquetas de `enum` con `&` o `}` en el formulario Vue, valores de `enum` con saltos de línea y defaults en cadena que no son un número decimal normal. La guardia guarda su estado en otro directorio, así que el de una sesión abierta antes de actualizar se pierde.

**Los defaults que cambian.** Sólo los `default` de modelo en cadena con ceros a la izquierda (`"01"`, `"007"`), con exponente (`"1e3"`) o con espacios (`" 1"`): la 9.0 los escribía sin comillas —`->default(01)` era el entero 1— y ahora van entre comillas. `"10.00"`, `"0.00"` y `"1.10"` siguen saliendo `->default(10.00)`, como en 9.0. Si la migración de creación no se editó, el siguiente `larapack:import` escribe una `_alter_<tabla>_table` con `->change()` para esas columnas; si se editó, la conserva y pide escribir la alteración. Revisa la alteración antes de migrar: `->change()` reescribe la definición entera de la columna, así que una longitud o precisión cambiada a mano en otra migración se pierde. Los pivotes no tienen alteración: sólo cambia la migración de un pivote nuevo, que ahora usa el mismo literal (antes `true` salía `'1'` y `false`, `''`).
