# Paquetes de interfaz

LaraPack genera el mismo módulo para Vue y para React desde el mismo `laraimport.json`. Por eso la interfaz está partida así:

- **Lo que no depende de un framework vive una sola vez:** el tema, los avisos, las peticiones, las rutas, los idiomas, la validación y las máscaras.
- **Los componentes y las tablas tienen un gemelo por framework,** con los mismos nombres y el mismo contrato.

Dos copias del mismo código acaban divergiendo; un núcleo compartido no. Y un modelo generado se comporta igual en los dos frameworks.

## Los paquetes

| Paquete | Versión | Vue / React | Qué hace | Dependencias par |
|---|---|---|---|---|
| [`innoboxrr-form-core`](/interfaz/form-core) | 2.8.0 | Los dos, sin framework | Tema de clases, variables CSS `--fe-*`, iconos, avisos y confirmaciones, archivos, zonas horarias | — |
| [`innoboxrr-form-elements`](/interfaz/form-elements) | 6.8.0 | Vue | Los 37 componentes: controles de formulario y piezas de escritorio | `vue` ^3.5.0, `sortablejs` ^1.14.0, `lightvue` (opcional) |
| [`innoboxrr-react-form-elements`](/interfaz/form-elements) | 3.8.0 | React | Los mismos 37 componentes, con los mismos nombres | `react` ^19.0.0, `react-dom` ^19.0.0 |
| [`innoboxrr-vue-datatable`](/interfaz/datatables) | 3.1.1 | Vue | El listado de administración sobre el contrato del modelo | `innoboxrr-form-core` ^2.6.0, `innoboxrr-form-elements` ^6.4.0, `vue` ^3.5.0, `vue-router` ^4.5.0 |
| [`innoboxrr-react-datatable`](/interfaz/datatables) | 3.1.1 | React | El mismo listado | `innoboxrr-form-core` ^2.6.0, `innoboxrr-react-form-elements` ^3.4.0, `react` ^19.0.0, `react-dom` ^19.0.0, `react-router-dom` ^7.0.0 |
| [`innoboxrr-http-request`](/interfaz/http-rutas-i18n) | 2.0.0 | Los dos; plugin de Vue aparte | `makeHttpRequest` con reintentos, confirmación y cancelación | `vue` ^3.5.0 (opcional) |
| [`innoboxrr-route-resolver`](/interfaz/http-rutas-i18n) | 2.0.0 | Los dos | `route(nombre, params)` sobre el `routes.json` de Laravel | — |
| [`innoboxrr-i18n`](/interfaz/http-rutas-i18n) | 1.2.0 | Los dos | `t()`, `addTranslations`, `setLocale` | — |
| [`innoboxrr-js-validator`](/interfaz/js-validator) | 2.0.1 | Los dos | Valida formularios a partir de `data-validators` | — |
| [`innoboxrr-locale-generator`](/interfaz/http-rutas-i18n) | 2.0.0 | CLI de Node | `locale-gen`: extrae las claves de `t('…')` a `locales/*.json` | — |
| [`innoboxrr-maskjs`](/interfaz/http-rutas-i18n) | 2.0.0 | Los dos; adaptadores `./vue` y `./react` | Máscaras de entrada | `vue` ^3.5.0 y `react` ^18 o ^19, las dos opcionales |

- Todos declaran `"engines": { "node": ">=20" }`.
- Todos son módulos ES, salvo `innoboxrr-locale-generator`, que es un CLI en CommonJS.

::: tip Los componentes se publican como código fuente
`innoboxrr-form-elements`, `innoboxrr-react-form-elements` y los dos datatables publican sus `.vue` y `.jsx` sin compilar. Los compila el Vite de tu aplicación, igual que tus propios componentes. Por eso los estilos se importan aparte, una vez.
:::

## Cómo encajan

```text
innoboxrr-form-core              tema, variables --fe-*, iconos, avisos, archivos
          │
innoboxrr-form-elements          los 37 componentes (Vue)
innoboxrr-react-form-elements    los mismos 37 (React)
          │
innoboxrr-vue-datatable          el listado sobre el contrato del modelo
innoboxrr-react-datatable
          │
módulo generado por LaraPack     contrato del modelo, formularios, vistas, theme.js, i18n.js
          │
shell de la aplicación base      arranque: rutas, idiomas, estilos, avisos y confirmaciones
```

### 1. El tema

`innoboxrr-form-core` no tiene dependencias. Guarda como estado de módulo lo que tiene que ser uno solo en toda la aplicación:

- el mapa de clases del tema;
- el mapa de iconos;
- la cola de avisos;
- la confirmación pendiente.

Vive fuera de Vue y de React para que cualquier pieza pueda avisar sin saber qué framework hay detrás, sea un store, el contrato de un modelo o la tabla. Sus variables CSS definen colores, formas, densidad, capas y movimiento. El modo oscuro se define ahí una sola vez.

### 2. Los componentes

- **Tema e iconos.** Los componentes leen el tema y los iconos de form-core y se suscriben a sus cambios: un `setTheme()` o un `setIcons()` en caliente repinta lo que ya está montado.
- **Avisos y confirmaciones.** `ToastRegionComponent` y `ConfirmHostComponent` pintan la cola de form-core.
- **Validación y máscaras.** Los controles escriben `data-validators`, que lee `innoboxrr-js-validator`. Las máscaras las aplica `innoboxrr-maskjs`.

### 3. La tabla

Los datatables usan [TanStack Table](https://tanstack.com/table) v9 para el estado:

- las columnas visibles;
- el orden;
- la selección.

El menú, los iconos y los esqueletos los ponen los componentes, y los avisos, form-core. La lógica que no depende del framework está en `src/table.js`, que es el mismo archivo byte a byte en los dos paquetes.

### 4. El módulo generado

LaraPack escribe, por cada modelo, `src/models/<modelo>/index.js`: el contrato del modelo. Es **el mismo archivo** para Vue y para React: funciones puras y llamadas con `innoboxrr-http-request`, rutas con `innoboxrr-route-resolver`, textos con `innoboxrr-i18n` y confirmaciones con `confirmAction` de form-core.

Alrededor del contrato, LaraPack genera:

- el widget de la tabla;
- los formularios con los componentes y `innoboxrr-js-validator`;
- `src/theme.js`, que importa los estilos de form-core;
- `src/i18n.js`, con las traducciones y los textos de la tabla;
- el script `npm run locale`, que ejecuta `locale-gen`.

El detalle está en [La interfaz generada](/larapack/interfaz).

Lo que declara el `package.json` del módulo (en modo aplicación, lo declara la aplicación):

| | Vue | React |
|---|---|---|
| `dependencies` | `innoboxrr-form-core` ^2.8.0, `innoboxrr-form-elements` ^6.7.0, `innoboxrr-vue-datatable` ^3.1.0, `innoboxrr-http-request` ^2.0.0, `innoboxrr-i18n` ^1.2.0, `innoboxrr-js-validator` ^2.0.0, `innoboxrr-route-resolver` ^2.0.0 | `innoboxrr-form-core` ^2.8.0, `innoboxrr-react-form-elements` ^3.7.0, `innoboxrr-react-datatable` ^3.1.0, `innoboxrr-http-request` ^2.0.0, `innoboxrr-i18n` ^1.2.0, `innoboxrr-js-validator` ^2.0.0, `innoboxrr-route-resolver` ^2.0.0 |
| `peerDependencies` | `pinia` ^3.0.0, `vue` ^3.5.0, `vue-router` ^4.5.0 | `react` ^19.0.0, `react-dom` ^19.0.0, `react-router-dom` ^7.0.0, `zustand` ^5.0.0 |
| `devDependencies` | `@vitejs/plugin-vue` ^6.0.0, `innoboxrr-locale-generator` ^2.0.0, `vite` ^8.0.0 | `@vitejs/plugin-react` ^6.0.0, `innoboxrr-locale-generator` ^2.0.0, `vite` ^8.0.0 |

::: tip Las versiones nuevas entran sin regenerar
Los rangos con `^` admiten 6.8.0, 3.8.0, 3.1.1 y 2.0.1. Un `npm update` en la aplicación basta para recibirlas.
:::

### 5. El shell

La aplicación base arranca en este orden:

1. **Rutas.** Carga `routes.json` con `setRoutes()`.
2. **Idiomas.** Suma primero las traducciones del módulo y después las suyas, y llama a `setLocale()` con el `lang` de `<html>`.
3. **Estilos.** Importa los estilos de form-core y el `theme.js` del módulo.
4. **Avisos y confirmaciones.** Monta `ToastRegionComponent` y `ConfirmHostComponent` una sola vez.

El modo oscuro lo decide un `data-theme` en `<html>`. El contrato completo está en [El contrato de las interfaces](/app-base/contrato).

## Arrancar una aplicación a mano

Sin la aplicación base, este es el mínimo para que los componentes, la tabla y el contrato del modelo funcionen. Las rutas `./routes.json` y `./lang/*.json` son de ejemplo.

::: code-group

```js [Vue: main.js]
import { createApp } from 'vue'
import 'innoboxrr-form-core/styles'
import FormElements from 'innoboxrr-form-elements'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'

import routes from './routes.json'
import App from './App.vue'

setRoutes(routes)
addTranslations(import.meta.glob('./lang/*.json', { eager: true }))
setLocale(document.documentElement.lang)

createApp(App).use(FormElements).mount('#app')
```

```vue [Vue: App.vue]
<template>
    <RouterView />

    <!-- Una sola vez en toda la aplicación -->
    <ToastRegionComponent />
    <ConfirmHostComponent />
</template>
```

```jsx [React: main.jsx]
import { createRoot } from 'react-dom/client'
import 'innoboxrr-form-core/styles'
import 'innoboxrr-react-form-elements/src/css/form-elements.css'
import { ConfirmHostComponent, ToastRegionComponent } from 'innoboxrr-react-form-elements'
import { setRoutes } from 'innoboxrr-route-resolver'
import { addTranslations, setLocale } from 'innoboxrr-i18n'

import routes from './routes.json'
import App from './App.jsx'

setRoutes(routes)
addTranslations(import.meta.glob('./lang/*.json', { eager: true }))
setLocale(document.documentElement.lang)

createRoot(document.getElementById('app')).render(
    <>
        <App />

        {/* Una sola vez en toda la aplicación */}
        <ToastRegionComponent />
        <ConfirmHostComponent />
    </>
)
```

:::

## Lo nuevo en esta ronda

- **innoboxrr-form-elements 6.8.0.** El editor de código carga el lenguaje bajo demanda y sigue el tema de la aplicación. `autofocus` pasa a valer `false`, un cambio de comportamiento: [los detalles](/interfaz/form-elements).
- **innoboxrr-react-form-elements 3.8.0.** El editor de código también carga el lenguaje bajo demanda. `theme` sigue siendo `dark` o `light`.
- **innoboxrr-vue-datatable e innoboxrr-react-datatable 3.1.1.** Las peticiones GET y HEAD ya no llevan `_token` en la query, y `setFilters()` ya no lo recibe. POST lo sigue mandando: [los detalles](/interfaz/datatables).
- **innoboxrr-js-validator 2.0.1.** Todos los mensajes se escriben como texto, también los de `appendExternalErrors`. Un HTML en la opción `messages` ahora se ve literal: [los detalles](/interfaz/js-validator).

## Vite y Vitest

Hay dos cadenas de herramientas, y no es un descuido:

- **Los paquetes de esta sección se prueban con Vite 7 y Vitest 3.** Vitest 4 con Vite 8.3 no se instala con npm 10, que es el que traen Node 20 y 22 en la CI.
- **Los módulos generados y las aplicaciones usan Vite 8,** el de Laravel 13. No instalan Vitest, así que no les afecta ese bloqueo.

Para ti no cambia nada: tu aplicación compila los componentes con su propio Vite 8. La tabla completa de versiones está en [Versiones y compatibilidad](/ayuda/versiones).
