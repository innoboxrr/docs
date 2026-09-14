# form-core: tema y estilos

`innoboxrr-form-core` (2.8.0) es lo que comparten los componentes de Vue, los de React y los dos datatables. No depende de ningún framework ni de ninguna librería. Contiene:

- las hojas de estilo y sus variables;
- el mapa de clases del tema;
- los iconos;
- los avisos y las confirmaciones;
- la descripción de archivos;
- la lista de zonas horarias.

Estaba copiado dentro de cada paquete, y así es exactamente como dos copias empiezan a divergir.

```bash
npm i innoboxrr-form-core
```

## Qué exporta

| Punto de entrada | Contenido |
|---|---|
| `innoboxrr-form-core` | Todo lo de JavaScript: tema, iconos, avisos, archivos y `timezones` |
| `innoboxrr-form-core/theme` | `setTheme`, `getTheme`, `classFor`, `resetTheme`, `onThemeChange`, `defaultTheme` |
| `innoboxrr-form-core/icons` | `setIcons`, `iconFor`, `getIcon`, `onIconChange`, `resetIcons`, `defaultIcons` |
| `innoboxrr-form-core/feedback` | `notify`, `notifySuccess`, `notifyError`, `dismiss`, `getToasts`, `onToastsChange`, `resetToasts`, `confirmAction`, `resolveConfirmation`, `getConfirmation`, `onConfirmationChange`, `resetConfirmation` |
| `innoboxrr-form-core/files` | `describeFiles`, `validateFiles`, `errorsFor`, `previewFor`, `isImage`, `isVideo`, `sizeParser`, `FILE_ICON` |
| `innoboxrr-form-core/timezone` | La lista de zonas horarias (export por defecto) |
| `innoboxrr-form-core/styles` | Las tres hojas: `tokens.css`, `layout.css` y `components.css` |
| `innoboxrr-form-core/tokens.css`, `/layout.css`, `/components.css` | Cada hoja por separado |

`sideEffects` solo marca `*.css`: el JavaScript se puede podar sin miedo.

## Estilos

```js
import 'innoboxrr-form-core/styles'
```

Una línea en el arranque y todo tiene aspecto: los componentes de Vue y de React, las tablas y lo que genera LaraPack. Nada necesita UIkit, Tailwind ni Font Awesome.

- **`tokens.css`** define las variables.
- **`layout.css`** trae utilidades de maquetación como `fe-grid`, `fe-flex`, `fe-card`, `fe-container` o `fe-text-muted`.
- **`components.css`** dibuja los componentes.

Si tu aplicación ya tiene su propio sistema visual, puedes no importar las hojas y apuntar los tokens a tus clases con `setTheme()`.

## Tema

El tema es un mapa de **tokens** a clases CSS. Cada token apunta a una clase propia (`fe-*`), así que lo normal es no tocarlo. Sirve para lo otro: que un token use las clases de un sistema visual que la aplicación ya tiene. Se ajusta **una vez**, al arrancar.

```js
import { setTheme } from 'innoboxrr-form-core'

setTheme({
    input: 'form-control',
    button: 'btn btn-primary',
})
```

| Función | Qué hace |
|---|---|
| `setTheme(tokens)` | Mezcla los tokens con el tema actual y avisa a los suscritos. Se puede cambiar uno sin repetir los demás. |
| `getTheme()` / `getTheme('input')` | El tema completo, o la clase de un token (`''` si no existe). |
| `classFor(token, customClass)` | La clase del token, salvo que llegue `customClass`. Es lo que llaman los componentes. |
| `resetTheme()` | Vuelve a los valores de fábrica. Sobre todo para pruebas: el tema es estado de módulo y se filtraría de una prueba a otra. |
| `onThemeChange(fn)` | Se suscribe a los cambios y devuelve la función para dejar de escuchar. |
| `defaultTheme` | El mapa de fábrica. |

Los componentes se suscriben, así que **un `setTheme()` en caliente repinta lo que ya está montado**.

::: warning `customClass` reemplaza, no suma
`classFor` devuelve `customClass ?? token`. Si pasas `customClass`, la clase del tema desaparece de ese control. Una cadena vacía también cuenta: deja el control sin clase.
:::

### Los tokens

Casi todos siguen la regla `nombreEnCamello` → `fe-nombre-en-guiones`, por ejemplo `buttonSecondary` → `fe-button-secondary`. Las excepciones:

- `tableNumeric` → `fe-numeric`
- `actionMenuItem` → `fe-action-item`
- `actionMenuDanger` → `fe-action-danger`
- `dialogSmall` → `fe-dialog-sm`
- `dialogLarge` → `fe-dialog-lg`

| Grupo | Tokens |
|---|---|
| Envoltorios | `field`, `fieldInner`, `label`, `help`, `helpIcon`, `error` |
| Controles | `input`, `select`, `textarea`, `checkbox`, `radio`, `file` |
| Campos compuestos | `fileDrop`, `fileDropHint`, `avatarPreview`, `codeInput`, `codeCell`, `group`, `groupTitle`, `dragHandle`, `phone`, `phoneInvalid` |
| Botones | `button`, `buttonSecondary`, `buttonDanger`, `buttonLink`, `iconButton`, `iconButtonDanger` |
| Navegación | `breadcrumb`, `breadcrumbLink`, `breadcrumbCurrent`, `breadcrumbSeparator`, `actionMenu`, `actionMenuItem`, `actionMenuDanger`, `kbd` |
| Superficies | `surface`, `surfaceRaised`, `toolbar`, `badge`, `badgePrimary`, `badgeSuccess`, `badgeDanger`, `badgeWarning` |
| Esqueletos | `skeleton`, `skeletonText`, `skeletonCircle`, `skeletonBlock` |
| Diálogos y drawers | `overlay`, `dialog`, `dialogSmall`, `dialogLarge`, `dialogHeader`, `dialogTitle`, `dialogBody`, `dialogFooter`, `drawer`, `drawerStart`, `drawerHeader`, `drawerTitle`, `drawerBody`, `drawerFooter` |
| Menús | `menu`, `menuList`, `menuItem`, `menuItemDanger`, `menuSeparator`, `menuLabel` |
| Paleta de comandos | `command`, `commandInput`, `commandList`, `commandGroup`, `commandItem`, `commandEmpty` |
| Avisos | `toast`, `toastSuccess`, `toastDanger`, `toastWarning`, `toastTitle`, `toastClose`, `toastRegion` |
| Tabla | `table`, `tableNumeric`, `tableSticky`, `tableSelect`, `tableResizer`, `tableEmpty`, `bulkBar`, `bulkCount`, `tableSort`, `tableContainer`, `tableFooter`, `tablePager` |
| Listado | `datatable`, `datatableFilters`, `toolbarSpacer` |
| Edición en línea | `editable` |
| Shell de aplicación | `shell`, `shellHeader`, `shellSidebar`, `shellMain` |

## Iconos

Los componentes piden un icono por **nombre semántico** (`plus`, `delete`) y un mapa decide qué dibujo le corresponde. Los valores son nombres de [Iconify](https://icon-sets.iconify.design/) con la forma `coleccion:icono`.

Antes pintar un icono necesitaba tres dependencias: UIkit, Font Awesome y un puente entre las dos. Faltaba una y el icono dejaba de verse. Ahora cambiar el juego de iconos de todo el proyecto es cambiar el mapa:

```js
import { setIcons, iconFor } from 'innoboxrr-form-core'

setIcons({ plus: 'lucide:plus', delete: 'lucide:trash-2' })

iconFor('plus')      // 'lucide:plus'
iconFor('mdi:home')  // 'mdi:home': un nombre de Iconify pasa tal cual
iconFor('fa-plus')   // 'fa-plus': lo desconocido se devuelve igual, para que el fallo se vea
iconFor(null)        // ''
```

| Función | Qué hace |
|---|---|
| `setIcons(map)` | Mezcla con el mapa actual y avisa a los suscritos. |
| `iconFor(nombre)` | El icono del mapa; si no está, el mismo nombre. |
| `getIcon()` / `getIcon('plus')` | El mapa completo, o el valor de un nombre (`''` si no existe). |
| `onIconChange(fn)` | Se suscribe y devuelve la función para dejar de escuchar. `IconComponent` lo usa para repintar en caliente. |
| `resetIcons()` | Vuelve al mapa de fábrica. |
| `defaultIcons` | El mapa de fábrica. |

::: details Los iconos de fábrica
| Grupo | Nombre → icono |
|---|---|
| Acciones | `plus` → `fa6-solid:plus`, `download` → `fa6-solid:download`, `upload` → `fa6-solid:upload`, `edit` → `fa6-solid:pen`, `delete` → `fa6-solid:trash`, `show` → `fa6-solid:eye`, `hide` → `fa6-solid:eye-slash`, `actions` → `fa6-solid:gears`, `refresh` → `fa6-solid:rotate`, `restore` → `fa6-solid:rotate-left`, `search` → `fa6-solid:magnifying-glass`, `filter` → `fa6-solid:filter`, `more` → `fa6-solid:ellipsis`, `external` → `fa6-solid:arrow-up-right-from-square`, `logout` → `fa6-solid:right-from-bracket` |
| Estado | `help` → `fa6-solid:circle-question`, `warning` → `fa6-solid:triangle-exclamation`, `error` → `fa6-solid:circle-exclamation`, `success` → `fa6-solid:circle-check`, `info` → `fa6-solid:circle-info`, `locked` → `fa6-solid:lock` |
| Navegación | `previous` → `fa6-solid:chevron-left`, `next` → `fa6-solid:chevron-right`, `up` → `fa6-solid:chevron-up`, `down` → `fa6-solid:chevron-down`, `close` → `fa6-solid:xmark`, `home` → `fa6-solid:house`, `menu` → `fa6-solid:bars`, `sidebar` → `fa6-solid:table-columns`, `command` → `fa6-solid:terminal`, `settings` → `fa6-solid:gear` |
| Selección y orden | `check` → `fa6-solid:check`, `minus` → `fa6-solid:minus`, `sort` → `fa6-solid:sort`, `sortUp` → `fa6-solid:sort-up`, `sortDown` → `fa6-solid:sort-down` |
| Objetos | `box` → `fa6-solid:box`, `users` → `fa6-solid:users`, `gift` → `fa6-solid:gift`, `file` → `fa6-solid:file`, `media` → `fa6-solid:photo-film` |
| Edición | `save` → `fa6-solid:floppy-disk`, `copy` → `fa6-solid:clone`, `drag` → `fa6-solid:grip-vertical` |
| Grabación | `record` → `fa6-solid:microphone`, `pause` → `fa6-solid:pause`, `play` → `fa6-solid:play` |
:::

## Avisos

Los avisos son estado de toda la aplicación, fuera del framework. Quien avisa no necesita saber si detrás hay Vue o React: un store, el contrato de un modelo o la tabla. Los pinta el `ToastRegionComponent` que la aplicación monta una vez.

```js
import { notify, notifySuccess, notifyError, dismiss } from 'innoboxrr-form-core'

notifySuccess('Producto creado')
notifyError('No se pudo guardar', { title: 'Producto' })

const id = notify({ message: 'Exportación en curso', variant: 'info', duration: 8000 })
dismiss(id)
```

| Función | Qué hace |
|---|---|
| `notify(opciones)` | Muestra un aviso y devuelve su id. Acepta una cadena o `{ message, title, variant, duration }`. |
| `notifySuccess(mensaje, { title, duration })` | `notify` con `variant: 'success'`. |
| `notifyError(mensaje, { title, duration })` | `notify` con `variant: 'danger'`. |
| `dismiss(id)` | Cierra un aviso. |
| `getToasts()` / `onToastsChange(fn)` | La cola actual y la suscripción, para pintarla desde otro sitio. |
| `resetToasts()` | Vacía la cola y cancela los temporizadores. Para pruebas. |

Las reglas, y por qué:

- **Variantes.** `variant` es `info`, `success`, `warning` o `danger`. Cualquier otro valor se trata como `info`.
- **Duración.** Un aviso se cierra a los **5 segundos**, salvo **uno de peligro, que se queda** hasta que se cierra a mano: quien no lo leyó a tiempo no sabría qué falló. `duration: 0` deja fijo cualquier aviso.
- **Límite.** No hay **más de cinco** a la vez; al llegar el sexto, sale el más antiguo. Más avisos tapan la pantalla y no se leen.
- **Mensaje.** `message` se convierte a texto y se pinta como texto.
- **La cola se sustituye, no se muta.** React compara la instantánea por referencia y, con el mismo array, no repintaría.

## Confirmaciones

```js
import { confirmAction } from 'innoboxrr-form-core'

if (await confirmAction({
    title: 'Borrar producto',
    message: '¿Seguro que quieres borrarlo?',
    confirmLabel: 'Sí, borrar',
    cancelLabel: 'Cancelar',
    variant: 'danger',
})) {
    // …
}
```

| Opción | Por defecto |
|---|---|
| `message` | `''` (también se acepta una cadena en lugar del objeto) |
| `title` | `'¿Confirmas?'` |
| `confirmLabel` | `'Confirmar'` |
| `cancelLabel` | `'Cancelar'` |
| `variant` | `'primary'`; `'danger'` pinta el botón de confirmar en rojo |

- **Respuesta.** `confirmAction` resuelve `true` o `false`. La pinta el `ConfirmHostComponent` que la aplicación monta una vez.
- **Sin anfitrión montado,** usa `window.confirm`; sin `window`, resuelve `false`. Una promesa que nunca se resolviera dejaría colgada la acción que la espera.
- **Una pregunta nueva con otra pendiente** da la anterior por cancelada (`false`): dos confirmaciones a la vez no tienen una respuesta clara.
- **Para pintarla desde otro sitio** están `getConfirmation()`, `onConfirmationChange(fn)` y `resolveConfirmation(valor)`. `resetConfirmation()` cancela lo pendiente, para pruebas.

::: tip El patrón del código generado
Los contratos de modelo que genera LaraPack confirman con `confirmAction` y, si la respuesta es `false`, lanzan `RequestCancelledError` de `innoboxrr-http-request`. La tabla y las vistas reconocen ese error y no avisan de una operación que el usuario decidió no hacer.

Los textos de fábrica están en español; el código generado pasa los suyos con `t()`.
:::

## Archivos

```js
import { describeFiles, sizeParser } from 'innoboxrr-form-core'

const entries = describeFiles(input.files, {
    maxSize: 2 * 1024 * 1024,              // bytes; 0 o ausente: sin límite
    validMimes: ['image/png', 'image/jpeg'], // ausente: cualquiera
})

// [{ file, name, size, type, preview, uploaded, validation, errors, path, id }]

const form = new FormData()
entries.filter((entry) => entry.validation).forEach((entry) => form.append('files[]', entry.file))

sizeParser(1536) // '2 KB'
```

`describeFiles` **no toca los `File`**. La versión anterior les escribía propiedades encima con `Object.assign`, y eso tenía dos problemas: el `File` es del navegador y no es sitio para campos inventados, y el mismo archivo no se podía describir dos veces con reglas distintas. El original sigue en `.file`, que es lo que va en el `FormData`.

| Función | Qué hace |
|---|---|
| `describeFiles(files, reglas)` | Un descriptor por archivo. `validation` es `true` si `errors` está vacío. `uploaded` empieza en `false` y `path` e `id` en `undefined`, para que los rellene quien sube. |
| `validateFiles(files, reglas)` | Lo mismo, devuelto en una promesa. Existe por compatibilidad: no hay nada asíncrono. |
| `errorsFor(file, reglas)` | Los códigos de error: `'failMimeValidation'` y `'failMaxSizeValidation'`. |
| `previewFor(file)` | Para gif, jpeg, jpg, png, webp y avif, una URL de `URL.createObjectURL`; para el resto, `FILE_ICON`. Fuera del navegador (Node, jsdom, SSR) también devuelve `FILE_ICON` en vez de lanzar. |
| `isImage(file)`, `isVideo(file)` | Miran el prefijo del tipo MIME. |
| `sizeParser(bytes)` | Bytes legibles: `'0 Byte'`, `'512 Bytes'`, `'2 MB'`. |
| `FILE_ICON` | Un SVG en data URI. Antes era una URL de un tercero que se pedía por cada archivo. |

::: tip Libera las vistas previas
form-core crea las vistas previas con `URL.createObjectURL` y no las libera. Si describes muchos archivos en una misma página, llama a `URL.revokeObjectURL(entry.preview)` cuando dejes de mostrarlas.
:::

## Zonas horarias

```js
import { timezones } from 'innoboxrr-form-core'

// [{ label: 'Africa/Abidjan', value: 'Africa/Abidjan' }, …, { label: 'UTC', value: 'UTC' }]
```

Son los nombres IANA agrupados por región: África, América, Antártida, Ártico, Asia, Atlántico, Australia, Europa, Índico y Pacífico. La lista termina en `UTC`.

## Variables CSS

Cada decisión visual vive una vez, en `tokens.css`. Hay dos tipos de variables:

- **Los colores, el overlay y las sombras** cambian en modo oscuro.
- **Las demás** son iguales en los dos modos.

### Superficies y bordes

| Variable | Claro | Oscuro |
|---|---|---|
| `--fe-bg` | `#f7f8fa` | `#101116` |
| `--fe-surface` | `#ffffff` | `#181a21` |
| `--fe-surface-raised` | `#ffffff` | `#1f222b` |
| `--fe-surface-sunk` | `#f1f2f6` | `#14161c` |
| `--fe-surface-hover` | `#f1f2f6` | `#22252f` |
| `--fe-border` | `#e3e5eb` | `#2b2e39` |
| `--fe-border-strong` | `#c8cbd4` | `#3d4150` |

### Texto

| Variable | Claro | Oscuro |
|---|---|---|
| `--fe-text` | `#1b1c22` | `#e8e9ef` |
| `--fe-text-muted` | `#5c5f6b` | `#a7aab8` |
| `--fe-text-subtle` | `#8b8e9a` | `#767a89` |
| `--fe-text-inverse` | `#ffffff` | `#101116` |

### Principal y peligro

| Variable | Claro | Oscuro |
|---|---|---|
| `--fe-primary` | `#4b5bd7` | `#8b95f0` |
| `--fe-primary-hover` | `#3f4dc0` | `#a0a8f5` |
| `--fe-primary-text` | `#ffffff` | `#101116` |
| `--fe-primary-soft` | `#eceefb` | `#21243a` |
| `--fe-danger` | `#c0392f` | `#e08b83` |
| `--fe-danger-hover` | `#a32e26` | `#eda29a` |
| `--fe-danger-text` | `#ffffff` | `#101116` |
| `--fe-danger-soft` | `#fbeceb` | `#2c1d1c` |

### Estados, foco y overlay

| Variable | Claro | Oscuro |
|---|---|---|
| `--fe-success` | `#17714d` | `#5ec79c` |
| `--fe-success-soft` | `#e6f2ec` | `#142b23` |
| `--fe-warning` | `#8a6212` | `#d9ac53` |
| `--fe-warning-soft` | `#f8f0dd` | `#2a2417` |
| `--fe-info` | `#1f6fb2` | `#7cb3e6` |
| `--fe-info-soft` | `#e5f0f9` | `#16222e` |
| `--fe-focus` | `#4b5bd7` | `#8b95f0` |
| `--fe-overlay` | `rgba(16, 18, 27, 0.45)` | `rgba(0, 0, 0, 0.6)` |

`--fe-overlay` es lo que queda detrás de un diálogo o un drawer abierto.

### Elevación

| Variable | Claro | Oscuro |
|---|---|---|
| `--fe-shadow-sm` | `0 1px 2px rgba(16, 18, 27, 0.06)` | `0 1px 2px rgba(0, 0, 0, 0.4)` |
| `--fe-shadow` | `0 4px 12px rgba(16, 18, 27, 0.08)` | `0 4px 12px rgba(0, 0, 0, 0.45)` |
| `--fe-shadow-lg` | `0 16px 40px rgba(16, 18, 27, 0.16)` | `0 16px 40px rgba(0, 0, 0, 0.55)` |

### Forma y espacio

| Variable | Valor |
|---|---|
| `--fe-radius-sm` | `4px` |
| `--fe-radius` | `6px` |
| `--fe-radius-lg` | `10px` |
| `--fe-radius-full` | `9999px` |
| `--fe-space-1` | `0.25rem` |
| `--fe-space-2` | `0.5rem` |
| `--fe-space-3` | `0.75rem` |
| `--fe-space-4` | `1rem` |
| `--fe-space-5` | `1.5rem` |
| `--fe-space-6` | `2rem` |

### Tipografía

| Variable | Valor |
|---|---|
| `--fe-font` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `--fe-font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| `--fe-text-xs` | `0.75rem` |
| `--fe-text-sm` | `0.8125rem` |
| `--fe-text-base` | `0.875rem` |
| `--fe-text-lg` | `1rem` |
| `--fe-text-xl` | `1.25rem` |

### Densidad

| Variable | Valor |
|---|---|
| `--fe-density` | `1` |
| `--fe-control-height` | `calc(2.25rem * var(--fe-density))` |
| `--fe-control-padding-x` | `calc(0.75rem * var(--fe-density))` |

La densidad es una variable y no un conjunto de clases. `0.875` compacta una tabla sin que sus celdas dejen de ser pulsables. La clase `fe-dense` la pone a `0.875` en un contenedor, y todo lo de dentro encoge sin que ningún componente se entere.

### Movimiento

| Variable | Valor |
|---|---|
| `--fe-transition` | `120ms ease` |
| `--fe-duration-fast` | `120ms` |
| `--fe-duration` | `200ms` |
| `--fe-ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

### Capas

| Variable | Valor |
|---|---|
| `--fe-z-sticky` | `10` |
| `--fe-z-dropdown` | `40` |
| `--fe-z-overlay` | `50` |
| `--fe-z-tooltip` | `60` |
| `--fe-z-toast` | `70` |

Lo que se abre con `showModal()` o con el atributo `popover` ya vive en la capa superior del navegador y no necesita `z-index`. Esta escala es para lo demás: la cabecera fija de una tabla, un overlay dibujado a mano, los tooltips. Nunca un número suelto.

### Medidas de aplicación

| Variable | Valor |
|---|---|
| `--fe-dialog-width` | `32rem`; `fe-dialog-sm` la cambia a `24rem` y `fe-dialog-lg` a `48rem` |
| `--fe-drawer-width` | `32rem` |
| `--fe-command-width` | `40rem`; la paleta de comandos la usa como ancho de diálogo |
| `--fe-sidebar-width` | `15rem` |
| `--fe-table-max-height` | `none`; con un límite, la cabecera fija de la tabla funciona también al bajar |

## Modo oscuro

El visitante tiene tres estados, y `tokens.css` define los tres:

| Estado | Selector | Qué ve |
|---|---|---|
| No eligió nada | `@media (prefers-color-scheme: dark)` sobre `:root:not([data-theme='light'])` | Lo que diga el sistema operativo |
| Eligió oscuro | `:root[data-theme='dark']` | Oscuro, aunque el sistema esté en claro |
| Eligió claro | `:root[data-theme='light']` | Claro, aunque el sistema esté en oscuro |

El `:not()` es lo que hace que la elección explícita gane: sin él, quien pide claro seguiría viendo oscuro en un sistema oscuro.

El atributo va en `<html>`:

```js
document.documentElement.setAttribute('data-theme', 'dark')  // forzar oscuro
document.documentElement.setAttribute('data-theme', 'light') // forzar claro
document.documentElement.removeAttribute('data-theme')       // seguir al sistema
```

El editor de código de Vue (`CodeMirrorComponent`, con `theme="auto"`) aplica la misma regla desde JavaScript y cambia en caliente. La aplicación base guarda la elección en `localStorage.theme` y la aplica antes de pintar para no mostrar un destello claro: [Personalizar y ampliar](/app-base/personalizar).

## Cambiar el aspecto

### El color principal, en los dos modos

```css
/* Después de importar innoboxrr-form-core/styles */
:root {
    --fe-primary: #7c3aed;
    --fe-primary-hover: #6d28d9;
    --fe-primary-soft: #f1eafe;
    --fe-focus: #7c3aed;
}

@media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
        --fe-primary: #a78bfa;
        --fe-primary-hover: #c4b5fd;
        --fe-primary-soft: #2a2140;
        --fe-focus: #a78bfa;
    }
}

:root[data-theme='dark'] {
    --fe-primary: #a78bfa;
    --fe-primary-hover: #c4b5fd;
    --fe-primary-soft: #2a2140;
    --fe-focus: #a78bfa;
}
```

::: warning Redefine el color también en oscuro
- **En oscuro,** los selectores de `tokens.css` (`:root[data-theme='dark']` y `:root:not([data-theme='light'])`) son más específicos que un `:root` suelto. Un color redefinido solo en `:root` se ve en claro y desaparece en oscuro.
- **En claro,** tu `:root` y el de `tokens.css` pesan lo mismo, así que gana el que se carga después. Importa tu CSS detrás de los estilos de form-core.
:::

### Formas y densidad

```css
:root {
    --fe-radius: 10px;
    --fe-radius-lg: 14px;
}

/* Un listado compacto, sin tocar ningún componente */
.listado-denso {
    --fe-density: 0.875;
}
```

```html
<section class="fe-dense">
    <!-- todo lo de dentro encoge -->
</section>
```

### Medidas de un sitio concreto

```css
/* Drawers más anchos solo en la sección de pedidos */
.pedidos {
    --fe-drawer-width: 48rem;
}

/* Cabecera fija al desplazarse dentro del listado */
.fe-datatable {
    --fe-table-max-height: 70vh;
}
```

### Las clases de otro sistema

```js
import { setTheme, setIcons } from 'innoboxrr-form-core'

setTheme({
    input: 'form-control',
    select: 'form-select',
    button: 'btn btn-primary',
    buttonSecondary: 'btn btn-secondary',
    buttonDanger: 'btn btn-danger',
})

setIcons({
    plus: 'lucide:plus',
    delete: 'lucide:trash-2',
    edit: 'lucide:pencil',
})
```

### En un módulo generado

LaraPack deja en cada módulo un `src/theme.js` que importa `innoboxrr-form-core/styles` y llama a `setTheme({})` y `setIcons({})` vacíos. Es el sitio para lo anterior. El módulo lo declara en `sideEffects`: si faltara, el bundler podría quitar la importación y el administrador se quedaría sin estilos.

```js
// resources/vue/src/theme.js (o resources/react/src/theme.js)
import 'innoboxrr-form-core/styles'

import { setIcons, setTheme } from 'innoboxrr-form-core'

setTheme({
    // input: 'form-control',
})

setIcons({
    plus: 'lucide:plus',
    delete: 'lucide:trash-2',
})

export { getIcon, getTheme, iconFor, setIcons, setTheme } from 'innoboxrr-form-core'
```

## El marcado de las piezas de escritorio

Diálogos, drawers, menús y avisos se apoyan en lo que ya hace el navegador, sin librerías de interfaz. Las hojas solo los dibujan, y los componentes de Vue y de React envuelven exactamente este marcado:

- **`<dialog>` con `showModal()`** pone la capa superior, el fondo inerte, el foco atrapado, Escape para cerrar y la devolución del foco.
- **El atributo `popover`** pone el cierre al pulsar fuera.

```html
<dialog class="fe-drawer">
    <header class="fe-drawer-header">
        <h2 class="fe-drawer-title">Nuevo producto</h2>
        <button class="fe-icon-button" aria-label="Cerrar">…</button>
    </header>
    <div class="fe-drawer-body">…</div>
    <footer class="fe-drawer-footer">…</footer>
</dialog>
```

- **Diálogo.** `fe-dialog`, con `fe-dialog-sm` o `fe-dialog-lg` para el ancho.
- **Drawer.** `fe-drawer` sale a la derecha; `fe-drawer-start` lo pega a la izquierda.
- **Paleta de comandos.** `<dialog class="fe-dialog fe-command">` con `fe-command-input` y una `fe-command-list` de `fe-command-item`. El elemento activo lleva `aria-selected="true"`.
- **Avisos.** Una `fe-toast-region` con `popover="manual"`, para seguir encima de un drawer abierto con `showModal()`.
- **Menús.** `fe-menu` con `popover`, colocado con Floating UI.
- **Tabla.**
  - `fe-table-select` es la columna de casillas.
  - La fila seleccionada lleva `data-selected`.
  - `fe-bulk-bar` agrupa lo que se hace con la selección.
  - `fe-table-resizer` cambia el ancho de una columna.
  - Una columna ordenable lleva `aria-sort` en el `<th>` y dentro un `<button class="fe-table-sort">`, para ordenar también con el teclado.
- **Listado.** `fe-datatable` agrupa:
  - la `fe-toolbar`, con un `fe-toolbar-spacer` que empuja a la derecha lo que va detrás;
  - el panel `fe-datatable-filters`;
  - la tabla, dentro de un `fe-table-container`;
  - el `fe-table-footer`, con el resumen y el `fe-table-pager`.

::: tip Por qué ninguna regla fija `display` fuera de `[open]`
Un `<dialog>` cerrado está oculto porque el navegador le pone `display: none`. Una regla que fijara `display` sin mirar `[open]` lo dejaría visible cerrado.
:::
