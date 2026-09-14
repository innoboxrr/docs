# Componentes de formulario

`innoboxrr-form-elements` (Vue, 6.8.0) e `innoboxrr-react-form-elements` (React, 3.8.0) exportan los mismos 37 componentes, con los mismos nombres. Tiene una razón: LaraPack escribe el mismo `form_component` del `laraimport.json` en los formularios de Vue y en los de React, y un nombre que faltara en uno rompería el build de ese framework. Un test de paridad en cada repositorio falla si un paquete exporta algo que el otro no.

El aspecto sale del tema de [form-core](/interfaz/form-core). Ningún componente necesita UIkit, Tailwind ni Font Awesome.

## Instalar

::: code-group

```bash [Vue]
npm i innoboxrr-form-elements innoboxrr-form-core
```

```bash [React]
npm i innoboxrr-react-form-elements innoboxrr-form-core
```

:::

::: code-group

```js [Vue]
import 'innoboxrr-form-core/styles'
import FormElements from 'innoboxrr-form-elements'

app.use(FormElements) // registra los 37 componentes de forma global

// o importa solo los que uses
import { TextInputComponent, DrawerComponent } from 'innoboxrr-form-elements'
```

```jsx [React]
import 'innoboxrr-form-core/styles'
import 'innoboxrr-react-form-elements/src/css/form-elements.css'
import '@yaireo/tagify/dist/tagify.css'       // si usas TagsInputComponent
import 'react-phone-number-input/style.css'   // si usas CountrySelectInputComponent

import { TextInputComponent, DrawerComponent } from 'innoboxrr-react-form-elements'
```

:::

| | Vue | React |
|---|---|---|
| Dependencias par | `vue` ^3.5.0, `sortablejs` ^1.14.0, `lightvue` (opcional) | `react` ^19.0.0, `react-dom` ^19.0.0 |
| Registro global | `app.use(FormElements)` | No existe: React no tiene plugin de aplicación |
| Estilos propios de los componentes | En el `<style scoped>` de cada uno | En `src/css/form-elements.css`, que se importa una vez |

## Lo común a todos los controles

| Qué | Vue | React | Por qué |
|---|---|---|---|
| El valor | `v-model` | `value` + `onChange(valor)` | `onChange` recibe el **valor**, no el evento, igual que `update:modelValue`. El generador emite las dos formas desde el mismo JSON, así que tienen que significar lo mismo. |
| Etiqueta y ayuda | `label`, `help` | `label`, `help` | `help` pinta un icono con el texto en `data-tooltip` y `aria-label`. |
| Validación | `validators` | `validators` | Se escribe en `data-validators`, que lee [js-validator](/interfaz/js-validator). |
| Longitud | `min_length`, `max_length` | `minLength`, `maxLength` (se aceptan también los de guion bajo) | Van a `data-min_length` y `data-max_length`. |
| Clase | `customClass` | `customClass` | **Reemplaza** la clase del token del tema; no se suma. |
| Sin valor | — | Se gobierna solo | Un control de React sin `value` es no controlado. El modo se fija en el primer render, para no provocar el aviso de React. |

Para el evento del DOM, React tiene `onInput`, `onFocus`, `onBlur`, `onEnter` y `onPaste` donde el gemelo Vue emite `input`, `focus`, `blur`, `enter` y `paste`.

## El catálogo

| Grupo | Componentes |
|---|---|
| Texto | `TextInputComponent`, `TextareaInputComponent`, `TagsInputComponent`, `CountrySelectInputComponent`, `CodeInputComponent` |
| Selección | `SelectInputComponent`, `SelectSearchInputComponent`, `ModelSearchInputComponent`, `TimezoneSelectInputComponent`, `CheckboxInputComponent`, `RadioInputComponent`, `SingleCheckboxInputComponent`, `MultiCheckboxInputComponent`, `SwitchComponent`, `StarsInputComponent`, `ColorPickerInputComponent` |
| Compuestos | `DynamicGroupInputComponent`, `FqsInputComponent`, `PolymorphicInputComponent` |
| Editores | `EditorInputComponent`, `TextEditorMonoStyleInputComponent`, `CodeMirrorComponent` |
| Archivos | `FileInputComponent`, `FileDropInputComponent`, `SimpleFileInputComponent`, `AvatarInputComponent` |
| Básicos | `ButtonComponent`, `IconComponent`, `InputErrorComponent` |
| Escritorio | `DialogComponent`, `DrawerComponent`, `MenuComponent`, `CommandPaletteComponent`, `SkeletonComponent`, `ClickToEditComponent`, `ToastRegionComponent`, `ConfirmHostComponent` |

Cada componente envuelve, en React, el equivalente de la librería que envuelve su gemelo Vue. Donde la librería no depende del framework, es literalmente la misma:

| Componente | Vue | React |
|---|---|---|
| `TextInputComponent` (máscara) | `innoboxrr-maskjs/vue` | `innoboxrr-maskjs`, el mismo motor |
| `TagsInputComponent` | `@yaireo/tagify` | `@yaireo/tagify/react`, la misma librería |
| `EditorInputComponent` | `@tinymce/tinymce-vue` | `@tinymce/tinymce-react` |
| `CodeMirrorComponent` | `vue-codemirror` | `@uiw/react-codemirror`, el mismo CodeMirror 6 |
| `SelectSearchInputComponent` | `vue-select` | `react-select` |
| `CountrySelectInputComponent` | `vue-tel-input` | `react-phone-number-input`, el mismo `libphonenumber-js` |
| `DynamicGroupInputComponent` | `vuedraggable` | `@dnd-kit/sortable`, con reordenación por teclado |
| `ColorPickerInputComponent` | `lightvue` (opcional; sin él, `<input type="color">`) | `react-colorful` |
| `IconComponent` | `@iconify/vue` | `@iconify/react` |
| `MenuComponent` | atributo `popover` y `@floating-ui/dom` | lo mismo |

## Texto

### TextInputComponent

::: code-group

```vue [Vue]
<TextInputComponent
    type="text"
    name="phone"
    label="Teléfono"
    validators="required"
    :mask-format="{ mask: '(___) ___-____', format: '(***) ***-****' }"
    v-model="form.phone" />
```

```jsx [React]
<TextInputComponent
    type="text"
    name="phone"
    label="Teléfono"
    validators="required"
    maskFormat={{ mask: '(___) ___-____', format: '(***) ***-****' }}
    value={form.phone}
    onChange={(value) => setField('phone', value)} />
```

:::

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `type` | `type` | obligatorio | El tipo del `<input>`. Con `password` aparece un botón para ver la contraseña. |
| `name` | `name` | obligatorio en Vue | |
| `label`, `help`, `icon` | igual | `''`, `null`, `''` | `icon` es un nombre semántico o de Iconify. |
| `placeholder` | `placeholder` | `null` | |
| `validators` | `validators` | `null` | |
| `min_length`, `max_length` | `minLength`, `maxLength` | `null` | En Vue también se escriben en los atributos `min` y `max`. |
| `steps` | `steps` | `null` | El atributo `step`. |
| `readonly` | `readOnly` | sin valor | |
| `autofocus`, `autocomplete` | `autoFocus`, `autoComplete` | sin valor | |
| `maskFormat` | `maskFormat` | `{}` en Vue, `null` en React | Un `{ mask, format }` de [maskjs](/interfaz/http-rutas-i18n). |
| `showPasswordLabel`, `hidePasswordLabel` | igual | `'Show password'`, `'Hide password'` | El `aria-label` del botón del ojo. |
| `customClass` | `customClass` | sin valor | |
| — | `id` | generado | La etiqueta apunta a él. |
| eventos `enter`, `input`, `focus`, `blur`, `paste` | `onEnter`, `onInput`, `onFocus`, `onBlur`, `onPaste` | | Reciben el evento del DOM. `enter` es soltar la tecla Enter. |

### TextareaInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `name` | `name` | obligatorio en Vue |
| `label` | `label`, `help` | `''` |
| `rows` | `rows` | `5` |
| `placeholder`, `validators` | igual | `null` |
| `min_length`, `max_length` | `minLength`, `maxLength` (o con guion bajo) | `null` |
| `customClass` | `customClass`, `id` | sin valor |

### TagsInputComponent

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `name` | `name` | obligatorio en Vue | |
| `label`, `help`, `placeholder` | igual | `''`, `null`, `''` | |
| `customClass` | `customClass` | `'fe-input '` en Vue | |
| `modelValue` (cadena o array) | `value` | `[]` en Vue | |
| — | `validators`, `id` | | |
| — | `whitelist`, `maxTags`, `duplicates` | `duplicates: false` | Opciones de Tagify. |
| — | `tagifyRef` | | Una ref para llegar a la instancia de Tagify. |

### CountrySelectInputComponent

Un teléfono con selector de país, validado con `libphonenumber-js`.

| Vue | React | Por defecto |
|---|---|---|
| `label` | `label`, `help` | `''` |
| `defaultPhone`, `defaultCountry` | igual | `''`, `null` |
| `disabled` | `disabled` | `false` |
| `wrapperClass`, `containerClass`, `labelClass` | igual | `null` |
| `dropdownOptions`, `inputOptions`, `preferredCountries` | — | `{}`, `{}`, `[]` (opciones de vue-tel-input) |
| — | `name`, `id`, `placeholder`, `validators` | `'telephone'`, `null`, `'Ingresa un número telefónico'`, `null` |
| evento `change` | `onCountryChange` | |

::: warning El evento no trae lo mismo en los dos frameworks
- **Vue** emite `change` con `{ phone, country, isValid }`. Con un número válido, `phone` es el **número nacional**. Al salir del campo con un número inválido, lo vacía y emite `{ phone: '', country, isValid: false }`.
- **React** llama a `onCountryChange` con `{ phone, country, callingCode, national, isValid }`. `phone` es el valor completo y el nacional va aparte, en `national`.
:::

### CodeInputComponent

Un código de verificación, un carácter por casilla.

| Vue | React | Por defecto (Vue / React) |
|---|---|---|
| `fields` | `fields` | `3` / `6` |
| `fieldWidth`, `fieldHeight` | igual | `56` / `40` |
| `required` | `required` | `true` / `false` |
| `disabled` | `disabled` | `false` |
| `title`, `className` | igual | sin valor / `null`, `''` |
| — | `autoFocus`, `value` | `false` |
| evento `change(código)` | `onChange(código)` | |
| evento `complete(completo)` | `onComplete(código)` | |

En Vue, `complete` llega en cada cambio con un booleano. En React, `onComplete` solo se llama cuando todas las casillas están llenas, y recibe el código.

## Selección

### SelectInputComponent

::: code-group

```vue [Vue]
<SelectInputComponent name="status" label="Estado" validators="required" v-model="form.status">
    <option value="">Selecciona</option>
    <option value="draft">Borrador</option>
</SelectInputComponent>
```

```jsx [React]
<SelectInputComponent name="status" label="Estado" validators="required" value={form.status} onChange={setStatus}>
    <option value="">Selecciona</option>
    <option value="draft">Borrador</option>
</SelectInputComponent>
```

:::

| Vue | React | Por defecto |
|---|---|---|
| `name` | `name` | obligatorio en Vue |
| `label`, `help` | igual | `''`, `null` |
| `multiple` | `multiple` | `false` |
| `size` | `size` | `null` |
| `validators`, `customClass` | igual | `null` |
| slot por defecto | `children` | Las `<option>` |
| — | `id` | |

### SelectSearchInputComponent

Un select con búsqueda.

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `inputLabel`, `help` | igual | `''`, `null` | La etiqueta del campo. |
| `options` | `options` | `[]` | |
| `label` | `label` | `'label'` | La **clave** de la opción que se muestra. |
| `reduce` | `reduce` | la opción entera | Qué se guarda como valor. |
| `multiple`, `clearable`, `disabled`, `loading`, `appendToBody` | igual | `false`, `true`, `false`, `false`, `false` | |
| `placeholder` | `placeholder` | `''` | |
| `customClass` | `customClass` | sin valor | |
| `ajax`, `route`, `method`, `q`, `searchParams`, `minSearchLength`, `parseBeforeSubmit`, `debounceTime` | — | `false`, `''`, `'post'`, `''`, `{}`, `2`, identidad, `300` | Búsqueda remota en Vue. |
| `noOptionsText` | — | `'Nothing here.'` | |
| evento `search(respuesta)` | `onSearch(término)` | | |
| — | `name`, `validators`, `id` | | |

- **Vue** acepta además el resto de props de vue-select: `taggable`, `pushTags`, `filterable`, `searchable`, `closeOnSelect`, `selectOnTab`, `getOptionLabel`, `getOptionKey`, `filterBy` y demás. Con `ajax`, la búsqueda envía `_token`, `paginate: 0`, la clave `q` con el término y `searchParams`. Con `method: 'get'` todo eso viaja en la query.
- **React** pasa el resto de props a react-select. Publica el valor en un `<input type="hidden">` con `name` y `data-validators`, porque la librería no expone un input donde ponerlos.

### ModelSearchInputComponent

Busca registros de un modelo contra una ruta del API.

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `labelStr`, `placeholderStr` | igual | obligatorios en Vue | |
| `route` | `route` | obligatorio en Vue | La URL de búsqueda. |
| `method` | `method` | `'get'` | |
| `q` | `q` | `'id'` | El parámetro que lleva el término. |
| `externalFilters` | `externalFilters` | `{}` | Filtros que se suman a la búsqueda. |
| `reduce` | `reduce` | `(option) => option.id` | |
| `getOptionLabel` | `optionLabel` | `` (option) => `ID: ${option.id}` `` en Vue; `'name'` en React | En Vue es una función; en React, la clave del registro. |
| `multiple`, `hideOnEmit` | igual | `false` | |
| `debounceTime` | `debounce` | `300` | Milisegundos. |
| — | `minLength` | `1` | Longitud mínima para buscar. |
| `noOptionsText` | — | `'Nothing results found'` | |
| eventos `submit`, `selected` | `onSubmit`, `onSelected` | | |
| `customClass` | `customClass` | `null` | |

### TimezoneSelectInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `name` | `name` | obligatorio en Vue |
| `label`, `help` | igual | `''`, `null` |
| `placeholder` | `placeholder` | `'Select a timezone'` |
| `validators` | `validators` | `''` |
| `multiple`, `size` | — | `false`, `null` |

### CheckboxInputComponent y RadioInputComponent

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `name` | `name` | obligatorio en Vue | |
| `text` | `text` | `''` | El texto junto a la casilla. |
| `val` | `val` | `null` en Checkbox; obligatorio en Radio | El valor que aporta esta opción. |
| `validators`, `customClass` | igual | `null` | |
| `checked` (solo Radio) | — | `false` | |
| slot por defecto | `children` | | |

### SingleCheckboxInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `id` | `id` | obligatorio en Vue |
| `label` | `label` | `''` |
| `v-model:checked` | `checked` + `onCheckedChange(marcado)` | `false` |
| `value` | `value` | `null` |

### MultiCheckboxInputComponent

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `options` | `options` | obligatorio en Vue | `[{ id, name }]`. En Vue un validador exige las dos claves. |
| `v-model:value` | `value` + `onChange` | obligatorio en Vue | Los ids marcados. |
| `id` | `id` | `''` | |

React deriva la selección del valor. La versión Vue la recalcula con `document.querySelectorAll`, así que dos grupos con el mismo `id` se pisan.

### SwitchComponent

| Vue | React | Qué hace |
|---|---|---|
| `v-model` | `value` + `onChange(booleano)` | |
| evento `change(evento)` | `onToggle(evento)` | El evento del DOM. |
| — | el resto de props | Van al `<input type="checkbox">`. |

### StarsInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `max` | `max` | `5` |
| `v-model` (número) | `value` + `onChange` | `0` en Vue |
| `name` | `name` | `'rating'` |
| `char`, `inactiveChar` | igual | `'★'`, `null` |
| `readonly` | `readOnly` | `false` |
| `starsSize` | `starsSize` | `'50px'` |
| `activeColor`, `inactiveColor`, `shadowColor`, `hoverColor` | — | `null` |
| slots `activeLabel`, `inactiveLabel` | — | |

### ColorPickerInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `label` | `label`, `help`, `id` | `''` |
| `clearable` | `clearable` | `true` |
| `colors` | `colors` | 16 colores de Material |
| `bottomBar` | — | `true` |
| `v-model` | `value` + `onChange` | `'#607C8A'` en Vue |
| — | `name`, `validators` | `'color'`, `null` |

Sin `lightvue`, la versión Vue cae a `<input type="color">`, que abre el diálogo del sistema operativo y no se puede estilar ni probar. React usa `react-colorful`, de 2,8 kB y sin dependencias, y publica el valor en un input oculto con `name` y `data-validators`.

## Compuestos

### DynamicGroupInputComponent

Una lista de grupos de campos que se añaden, se quitan y se reordenan.

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `v-model` (array) | `value` + `onChange` | obligatorio en Vue | Un objeto por grupo. |
| `inputsConfig` | `inputsConfig` | obligatorio en Vue | Un campo por entrada, con `key`, `type`, `label` y `options`; en Vue, también `attributes`. |
| `label` | `label` | `''` | |
| `addButtonLabel`, `removeButtonLabel`, `itemLabel` | igual | `'Añadir'`, `'Eliminar'`, `'Item'` | |
| `hasSufix` | — | `true` | |

En React, el asa de arrastre es un `<button>` alcanzable con el tabulador: `@dnd-kit` reordena también con el teclado. Un formulario que solo se reordena con el ratón no es accesible.

### FqsInputComponent

Preguntas frecuentes: una lista de `{ question, answer }`.

| Vue | React | Por defecto |
|---|---|---|
| `v-model` (array) | `value` + `onChange` | obligatorio en Vue |
| `inputClass` | `inputClass` | `'fe-input '` |
| `labels` | `labels` | `{ title: 'Add frequency asked questions', question: 'Question', answer: 'Answer', add: 'Add Question', remove: 'Remove question' }` |
| `uploadUrl` | — | `null` |
| — | `name` | `'fqs'` |

### PolymorphicInputComponent

Un solo componente que decide qué control pintar a partir de una configuración.

::: code-group

```vue [Vue]
<PolymorphicInputComponent
    :props="{ type: 'select', name: 'size', label: 'Talla', options: ['S', 'M', 'L'] }"
    v-model="answer"
    @save="guardar" />
```

```jsx [React]
<PolymorphicInputComponent
    config={{ type: 'select', name: 'size', label: 'Talla', options: ['S', 'M', 'L'] }}
    value={answer}
    onChange={setAnswer}
    onSave={guardar} />
```

:::

| Clave de la configuración | Uso |
|---|---|
| `type` | Vue: `text`, `number`, `date`, `time`, `url`, `email`, `textarea`, `radio`, `select`, `checkbox`, `file`. React: los mismos, más `switch` y `editor`. |
| `label`, `name`, `placeholder`, `validators`, `customClass`, `icon` | Pasan al control. |
| `minLength`, `maxLength`, `readonly` | Pasan al control de texto. |
| `options` | Para `radio`, `select` y `checkbox`. En React, una opción de `select` puede ser `{ value, label }`. |

- **El prop.** En Vue se llama literalmente `props`, y se conserva así por compatibilidad. En React se llama `config` y acepta `props` como alias.
- **Guardar.** Tras un cambio aparece un botón que llama a `save` (`onSave` en React) con el valor.
- **Vue, tipo `checkbox`.** El valor es un array en JSON y cada cambio emite `save` al momento.
- **Vue, tipo `file`.** Sube con `FileInputComponent` y guarda el `id` del archivo.
- **React, tipo `file`.** Usa `SimpleFileInputComponent`.

## Editores

### EditorInputComponent

Un editor de texto enriquecido con TinyMCE.

| Vue | React | Por defecto (Vue / React) |
|---|---|---|
| `id`, `name` | igual | obligatorios en Vue |
| `label`, `help` | igual | `''`, `null` |
| `height` | `height` | `400` / `300` |
| `disabled` | `disabled` | `false` |
| `initialValue` | `initialValue` | `''` |
| `plugins`, `toolbar` | igual | Distintos en cada paquete |
| `menubar`, `inline` | — | `true`, `false` |
| `output` | — | `'html'` (o `'text'`) |
| `tinymceCdn` | `tinymceScriptSrc` | Vue carga TinyMCE 6.3.2 desde cdnjs |
| — | `apiKey` | |
| `uploadUrl`, `uri`, `file`, `onFileUploadSuccess` | — | `null`, `'/'`, `false`, `null` |
| `showSpeechRecognition` | — | `false` |
| `extraConfig` | el resto de props | `{}` |
| evento `error` | — | |
| — | `validators` | |

### TextEditorMonoStyleInputComponent

::: warning Los dos gemelos no son el mismo editor
- **Vue.** Envuelve `EditorInputComponent` (TinyMCE) con dictado por voz. Sus props son `label`, `name`, `id` (`'tmce'`), `placeholder`, `validators`, `min_length`, `max_length`, `defaultShowEditor` (`false`), `showSpeechRecognition` (`true`), `height` (`200`), `plugins`, `toolbar`, `menubar`, `inline`, `output`, `file`, `disabled`, `initialValue` y `customClass`.
- **React.** Es `CodeMirrorComponent` con `language="html"`. Sus props son `label`, `help`, `name`, `height` (`'400px'`), `readOnly`, `value` y `onChange`.
:::

### CodeMirrorComponent

::: code-group

```vue [Vue]
<CodeMirrorComponent v-model="config" lang="json" label="Configuración del sitio" />
```

```jsx [React]
<CodeMirrorComponent
    language="json"
    label="Configuración del sitio"
    name="config"
    value={config}
    onChange={setConfig} />
```

:::

| Vue | React | Por defecto (Vue / React) | Qué hace |
|---|---|---|---|
| `lang` | `language` | `'html'` / `'javascript'` | `html`, `css`, `javascript` o `json`, cargado bajo demanda. |
| `theme` | `theme` | `'auto'` / `'dark'` | Vue: `auto`, `dark` o `light`. React: `dark` o `light`. |
| `autofocus` | — | `false` | Si el editor pide el foco al montarse. |
| `placeholder` | — | `'Escriba su codigo aqui...'` | |
| `label` | `label`, `help` | `''` | |
| — | `height`, `readOnly` | `'300px'`, `false` | En Vue el alto es fijo: 400 px. |
| — | `name`, `validators` | | React publica el valor en un input oculto con `name` y `data-validators`. |
| expone `view` | — | | La `EditorView` de CodeMirror. |

En Vue la tabulación indenta y el tamaño de tabulación es 4. En React, el resto de props llega a `@uiw/react-codemirror`.

#### Qué cambió en 6.8.0 (Vue)

- **El lenguaje se carga bajo demanda.**
  - **Antes.** El componente importaba de forma estática html, css, javascript, json y one-dark. En la aplicación base, un editor que solo edita JSON generó un chunk de 580 kB (200 kB con gzip).
  - **Ahora.** `lang` llega con `import()` y cada lenguaje es un chunk aparte. Una aplicación que solo monta el editor con `lang="json"` pasa de 637,3 kB (222,7 kB con gzip) a 498,5 kB (167,7 kB con gzip) en modo claro. En oscuro se suman 2,7 kB (1,2 kB con gzip) de one-dark.
- **Mientras llega el lenguaje, el editor funciona como texto plano.** Cuando llega, se reconfigura sin rehacer la vista, así que no se pierden ni el cursor ni el historial.
- **Lo ya cargado se recuerda.** Un editor que se vuelve a montar arranca directamente con su lenguaje; por ejemplo, dentro de un diálogo, cuyo contenido solo existe mientras está abierto.
- **Solo cuenta la última petición:** un lenguaje lento no pisa al siguiente.
- **Un `lang` fuera de la lista cae a `html` sin lanzar.** Antes, `constructor` o `__proto__` encontraban algo en el mapa de lenguajes y rompían el editor.
- **El editor sigue el tema.**
  - **Antes.** Se pintaba siempre con one-dark, también en una aplicación clara.
  - **Ahora.** `theme="auto"` aplica la misma regla que las variables de form-core: manda `data-theme` en `<html>` y, sin él, `prefers-color-scheme`. Cambia en caliente cuando cambia cualquiera de los dos. `dark` y `light` lo fuerzan. one-dark solo se descarga la primera vez que hay que pintar en oscuro.
- **`autofocus` vale `false`.** Antes el editor pedía el foco al montarse, aunque estuviera al final de un formulario.
- **La etiqueta nombra al editor con `aria-labelledby`, y un clic en ella lo enfoca.** Un `<label for>` no puede apuntar al `contenteditable` de CodeMirror. Antes, un lector de pantalla anunciaba un campo sin nombre. Sin texto de etiqueta no se añade el atributo, que nombraría al editor con nada.

::: warning Puede afectar a quien ya lo usa
- **El foco.** Si una pantalla dependía de que el editor se llevara el foco al montarse, ahora hay que pedirlo:

  ```vue
  <CodeMirrorComponent v-model="html" autofocus />
  ```

- **El aspecto.** Para recuperar el oscuro de siempre en una aplicación clara, fuérzalo con `theme="dark"`.
:::

#### Qué cambió en 3.8.0 (React)

- **El lenguaje también se carga bajo demanda.** Una aplicación que solo monta el editor con `language="json"` pasa de 804,6 kB (270,9 kB con gzip) a 666,6 kB (215,9 kB con gzip). html, css y javascript quedan en chunks que nadie pide.
- **Mientras llega, texto plano.** Un `language` fuera de la lista deja el editor en texto plano, sin lanzar.
- **`theme` sigue siendo `dark` (por defecto) o `light`.** one-dark sigue en el bundle porque `@uiw/react-codemirror` lo importa y lo reexporta: cargarlo con `import()` desde este paquete no quitaría un solo byte.

::: warning En React la etiqueta aún no nombra al editor
En React, `CodeMirrorComponent` pinta la etiqueta sin asociarla al editor: un lector de pantalla lo anuncia sin nombre. La asociación con `aria-labelledby` solo existe en Vue.
:::

## Archivos

### FileInputComponent

Soltar o elegir archivos, validarlos con `describeFiles` de form-core y subirlos a `uploadUrl`.

| Vue | React | Por defecto |
|---|---|---|
| `uploadUrl` | `uploadUrl` | obligatorio en Vue |
| `method` | `method` | `'POST'` |
| `autoUpload` | `autoUpload` | `false` |
| `name` | `name` | `'file'` |
| `visibility` | `visibility` | `'public'` |
| `maxSize`, `totalMaxSize` | igual | `0` (sin límite) |
| `maxFiles` | `maxFiles` | `1` |
| `validMimes` | `validMimes` | Texto, imágenes, audio, vídeo, PDF, Office y gzip |
| `message`, `onDropMessage`, `onUploadMessage`, `maxFilesMessage`, `errorsTitle` | `labels` | Vue: textos sueltos. React: `{ drop, maxFiles, overTotal, upload, uploading, failed }` |
| `dropzoneClass`, `previewGridClass`, `hideOnMaxFilesReached`, `showTopPreview`, `showBottomPreview` | — | `'drop-zone'`, `'fe-w-quarter'`, `false`, `false`, `false` |
| slots `normalSlot`, `onDropSlot`, `onUploadSlot` | — | |
| eventos `startUpload`, `updateFileList`, `endUpload` | `onStartUpload`, `onFileListChange`, `onEndUpload` | |

### FileDropInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `multiple` | `multiple` | `false` |
| `mainText`, `subText` | igual | `'Arrastra y suelta el archivo aqui'`, `'o haz clic para seleccionar los archivos.'` |
| — | `accept` | |
| evento `change(archivos)` | `onFilesChange(archivos)` | Un array de `File`. |

### SimpleFileInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `inputName` | `inputName` | `'file'` |
| `label` | `label` | `'Seleccionar archivo'` |
| `customClass` | `customClass` | `null` |
| — | `accept` | |
| evento `input(archivo)` | `onInput(archivo)` | |

### AvatarInputComponent

| Vue | React | Por defecto |
|---|---|---|
| `avatarUrl`, `uploadUrl` | igual | obligatorios en Vue |
| `uploadMethod` | `uploadMethod` | `'POST'` |
| — | `name` | `'avatar'` |
| evento `upload(json)` | `onUpload(json)` | La respuesta del servidor, ya en JSON. |

En Vue, el archivo viaja en un `FormData` con el campo `file`. Un fallo solo se escribe en la consola.

## Básicos

### ButtonComponent

::: code-group

```vue [Vue]
<ButtonComponent value="Guardar" />
<ButtonComponent variant="secondary" type="button" value="Cancelar" @click="cerrar" />
```

```jsx [React]
<ButtonComponent value="Guardar" />
<ButtonComponent variant="secondary" type="button" value="Cancelar" onClick={cerrar} />
```

:::

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `variant` | `variant` | `'primary'` | `secondary`, `danger` o `link` eligen el token del tema; cualquier otro valor usa `button`. |
| `value` | `value` | `'Enviar'` en Vue | El texto. |
| `type` | `type` | `'submit'` | |
| `disabled` | `disabled` | `false` | |
| `customClass` | `customClass` | sin valor | |
| slot por defecto | `children` | | |

### IconComponent

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `name` | `name` | obligatorio | Un nombre del mapa de iconos o uno de Iconify. |
| `size` | `size` | `null` | Ancho y alto. |
| `customClass` | `className` | `null` | |

Es `aria-hidden` a propósito: un icono decorativo junto a su texto no debe leerse dos veces. Si el icono es la única pista, como en un botón sin texto, la etiqueta va en el `aria-label` del botón. Un `setIcons()` en caliente lo repinta.

### InputErrorComponent

| Prop | Qué hace |
|---|---|
| `errors` | El objeto de errores de un 422 de Laravel, `{ campo: [mensajes] }`. |
| `type` | La clave que mira este componente. |

Pinta un párrafo por mensaje, con la clase del token `error`, y nada si no hay errores.

## Piezas de escritorio

Se apoyan en lo que ya hace el navegador, sin librerías de interfaz:

- **`<dialog>` con `showModal()`** pone la capa superior, el fondo inerte, el foco atrapado, Escape y la devolución del foco.
- **El atributo `popover`** pone el cierre al pulsar fuera.
- **Floating UI** coloca los menús.

Donde no hay `showModal()` o `popover`, como en jsdom o en un navegador antiguo, los componentes caen a los atributos `open` y `hidden`.

### DialogComponent y DrawerComponent

::: code-group

```vue [Vue]
<DrawerComponent v-model:open="abierto" title="Nuevo producto">
    <CreateForm @submit="guardar" />

    <template #footer="{ close }">
        <ButtonComponent variant="secondary" type="button" value="Cancelar" @click="close" />
    </template>
</DrawerComponent>
```

```jsx [React]
<DrawerComponent
    open={abierto}
    onOpenChange={setAbierto}
    title="Nuevo producto"
    footer={({ close }) => (
        <ButtonComponent variant="secondary" type="button" value="Cancelar" onClick={close} />
    )}>
    <CreateForm onSubmit={guardar} />
</DrawerComponent>
```

:::

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `v-model:open` | `open` + `onOpenChange(abierto)` | `false` | |
| `title` | `title` | `null` | Nombra el diálogo con `aria-labelledby`. |
| `label` | `label` | `null` | `aria-label` cuando no hay `title`. |
| `size` (solo diálogo) | `size` | `'md'` | `sm`, `md` o `lg`. |
| `side` (solo drawer) | `side` | `'end'` | `end` a la derecha, `start` a la izquierda. |
| `dismissible` | `dismissible` | `true` | Con `false` no se cierra con Escape ni con el fondo, y no hay X. |
| `closeLabel` | `closeLabel` | `'Cerrar'` | El `aria-label` de la X. |
| evento `close` | `onClose` | | Se emite junto a `update:open` con `false`. |
| slot `header` | `header` | | Sustituye al título. |
| slot por defecto con `{ close }` | `children` (nodo o función `({ close }) => …`) | | |
| slot `footer` con `{ close }` | `footer` (nodo o función) | | |

- **Manda `open`.** Escape, un clic en el fondo o la X solo **piden** cerrar con `update:open` / `onOpenChange(false)`: cierra quien abrió. Si el estado lo guardara el `<dialog>`, se separaría del booleano de tu formulario.
- **El contenido solo existe mientras está abierto.** Un formulario vuelve limpio cada vez, y dos copias del mismo formulario no se pisan los `id` en el DOM.
- **El foco al abrir.** En Vue, usa el atributo `autofocus` de siempre. En React, marca el elemento con `data-autofocus`: React no escribe `autofocus` en el DOM.

### MenuComponent

::: code-group

```vue [Vue]
<MenuComponent
    :items="[
        { id: 'edit', label: 'Editar', icon: 'edit', action: editar },
        { separator: true },
        { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true, disabled: ! puede, disabledReason: 'Sin permiso' },
    ]"
    :before-open="cargarPermisos"
    @select="(item) => console.log(item.id)" />
```

```jsx [React]
<MenuComponent
    items={[
        { id: 'edit', label: 'Editar', icon: 'edit', action: editar },
        { separator: true },
        { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true, disabled: ! puede, disabledReason: 'Sin permiso' },
    ]}
    beforeOpen={cargarPermisos}
    onSelect={(item) => console.log(item.id)} />
```

:::

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `items` | `items` | `[]` | Los elementos (abajo). |
| `label` | `label` | `'Acciones'` | Nombre del menú y del botón. |
| `icon` | `icon` | `'more'` | El icono del botón por defecto. |
| `placement` | `placement` | `'bottom-end'` | La colocación de Floating UI. |
| `beforeOpen` | `beforeOpen` | `null` | Función (puede ser asíncrona) que se espera antes de abrir. |
| eventos `select`, `open`, `close` | `onSelect`, `onOpen`, `onClose` | | |
| slot `trigger` con `{ toggle, open, loading, triggerProps }` | `renderTrigger({ toggle, open, loading, triggerProps })` | | Sustituye al botón. Pon `triggerProps` en tu botón: son los atributos ARIA. |
| expone `open()` y `close()` | — | | |

Un elemento puede ser:

- **Una acción:** `{ id, label, icon, shortcut, danger, disabled, disabledReason, action }`. `action(item)` se llama al elegirlo, después de `select`.
- **Un separador:** `{ separator: true }`.
- **Un título de grupo:** `{ group: 'Texto' }`.

Y así se comporta:

- **`beforeOpen` se espera antes de abrir.** Mientras tanto el botón está deshabilitado. Es para los permisos de una fila: abrir con todo deshabilitado y habilitarlo después hace que el usuario vea parpadear lo que no puede hacer.
- **Un elemento sin permiso no desaparece.** Se ve deshabilitado (`aria-disabled`) y explica por qué en `data-tooltip`: quien no puede tiene que saber que la acción existe.
- **Teclado.** Las flechas, Inicio y Fin recorren los elementos que se pueden usar. Al abrir, el foco va al primero; al cerrar, vuelve al botón.

### CommandPaletteComponent

::: code-group

```vue [Vue]
<CommandPaletteComponent
    v-model:open="paleta"
    :items="[
        { id: 'products', label: 'Productos', group: 'Ir a', icon: 'box', action: irAProductos },
        { id: 'new', label: 'Nuevo producto', group: 'Crear', shortcut: 'N', keywords: ['alta'], action: nuevo },
    ]" />
```

```jsx [React]
<CommandPaletteComponent
    open={paleta}
    onOpenChange={setPaleta}
    items={[
        { id: 'products', label: 'Productos', group: 'Ir a', icon: 'box', action: irAProductos },
        { id: 'new', label: 'Nuevo producto', group: 'Crear', shortcut: 'N', keywords: ['alta'], action: nuevo },
    ]} />
```

:::

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `v-model:open` | `open` + `onOpenChange` | `false` | |
| `items` | `items` | `[]` | `{ id, label, group, icon, shortcut, keywords, action }` |
| `placeholder` | `placeholder` | `'Buscar…'` | |
| `emptyText` | `emptyText` | `'Sin resultados'` | |
| `label` | `label` | `'Paleta de comandos'` | |
| `hotkey` | `hotkey` | `'k'` | Con Ctrl o Cmd abre y cierra la paleta. `null` quita el atajo. |
| evento `select` | `onSelect` | | Se emite antes de llamar a `action(item)`. |

- **El filtro** no distingue mayúsculas ni acentos: quien escribe «configuracion» encuentra «Configuración». Busca en `label`, `group` y `keywords`.
- **Los grupos** se muestran en el orden en que aparecen.
- **Teclado.** Las flechas recorren la lista y Enter ejecuta. Al abrir, la búsqueda se vacía y el foco va al campo.

### SkeletonComponent

::: code-group

```vue [Vue]
<SkeletonComponent :lines="3" />
<SkeletonComponent shape="circle" :width="40" :height="40" />
<SkeletonComponent shape="block" height="12rem" />
```

```jsx [React]
<SkeletonComponent lines={3} />
<SkeletonComponent shape="circle" width={40} height={40} />
<SkeletonComponent shape="block" height="12rem" />
```

:::

| Prop | Por defecto | Qué hace |
|---|---|---|
| `shape` | `'text'` | `text`, `circle` o `block`. |
| `lines` | `1` | Solo con `text`. Con varias, la última mide el 60 %: se lee como un párrafo y no como una tabla. |
| `width`, `height` | `null` | Un número son píxeles; una cadena, cualquier medida CSS. |

Es `aria-hidden`: lo que anuncia la carga a un lector de pantalla es el `aria-busy` del contenedor que la espera, no cada rectángulo.

### ClickToEditComponent

Un valor que se edita donde está: en la celda de una tabla o en una ficha.

::: code-group

```vue [Vue]
<ClickToEditComponent
    :value="producto.title"
    label="Título"
    :save="(title) => updateModel(producto.id, { title })" />
```

```jsx [React]
<ClickToEditComponent
    value={producto.title}
    label="Título"
    onSave={(title) => updateModel(producto.id, { title })} />
```

:::

| Vue | React | Por defecto | Qué hace |
|---|---|---|---|
| `value` | `value` | `''` | |
| `type` | `type` | `'text'` | El tipo del campo de edición. |
| `placeholder` | `placeholder` | `'—'` | Lo que se ve cuando el valor está vacío. |
| `label` | `label` | `'Editar'` | El `aria-label` del botón y del campo. |
| `save` | `onSave` | `null` | Función que guarda; se espera. |
| evento `input` | `onInput` | | El valor confirmado. |
| `customClass` | `customClass` | sin valor | Reemplaza la clase del campo. |
| expone `start()` | — | | Abre la edición. |

- **Confirmar y cancelar.** Enter o salir del campo confirman; Escape cancela.
- **Sin cambios, no pasa nada.** Un valor igual al que había no guarda ni emite.
- **Con `save`, la confirmación espera a que termine.** Mientras guarda, el campo está deshabilitado.
- **Si `save` lanza, la celda se queda abierta** con el `message` del error, o «No se pudo guardar». Cerrarla mostraría un valor que no se guardó.
- **Antes, Vue y React no se comportaban igual:** salir del campo lo dejaba abierto en Vue y lo confirmaba en React. Ahora es igual en los dos.

### ToastRegionComponent y ConfirmHostComponent

::: code-group

```vue [Vue]
<!-- En la raíz de la aplicación, una sola vez -->
<ToastRegionComponent label="Avisos" close-label="Cerrar" />
<ConfirmHostComponent close-label="Cerrar" />
```

```jsx [React]
{/* En la raíz de la aplicación, una sola vez */}
<ToastRegionComponent label="Avisos" closeLabel="Cerrar" />
<ConfirmHostComponent closeLabel="Cerrar" />
```

:::

| Componente | Props | Qué pinta |
|---|---|---|
| `ToastRegionComponent` | `label` (`'Avisos'`), `closeLabel` (`'Cerrar'`) | La cola de `notify()` de form-core |
| `ConfirmHostComponent` | `closeLabel` (`'Cerrar'`) | La pregunta de `confirmAction()` de form-core |

- **La región de avisos vive en la capa superior** con `popover="manual"`. Si no, un aviso que llega con un drawer abierto quedaría debajo del fondo inerte, que es justo donde se guarda un formulario. Si se abre un diálogo después, la región vuelve a mostrarse para quedar encima.
- **Roles.** Un aviso de peligro tiene `role="alert"`; los demás, `role="status"`.
- **La confirmación es un diálogo pequeño** y empieza con el foco en **cancelar**: un Enter por inercia no debe borrar nada. Escape o un clic fuera cuentan como cancelar.

### Qué se monta una sola vez

| Componente | Una sola vez | Por qué |
|---|---|---|
| `ToastRegionComponent` | Sí, en la raíz | La cola de avisos es una sola para toda la aplicación. Dos regiones pintarían cada aviso dos veces; ninguna, no pintaría nada, aunque `notify()` siga llenando la cola. |
| `ConfirmHostComponent` | Sí, en la raíz | Todos los anfitriones escuchan la misma confirmación: con dos, la pregunta se abre dos veces. Sin ninguno, `confirmAction()` cae a `window.confirm`. |
| `CommandPaletteComponent` | Sí | Escucha el atajo en `window` al montarse. Dos paletas montadas responderían las dos a Ctrl+K. |
| `DialogComponent`, `DrawerComponent`, `MenuComponent` | No | Cada instancia es independiente; su contenido solo existe mientras está abierto. |

## Equivalencias Vue ↔ React

### La forma general

| Vue | React |
|---|---|
| `v-model` | `value` + `onChange(valor)` |
| `v-model:open` | `open` + `onOpenChange(abierto)` |
| `:custom-class` | `customClass` |
| `min_length` / `max_length` | `minLength` / `maxLength` (se aceptan también los de guion bajo) |
| slot por defecto | `children` |
| slot con ámbito (`footer`, `header` con `{ close }`) | prop con un nodo o una función `({ close }) => …` |
| slot `trigger` de `MenuComponent` | `renderTrigger({ toggle, open, loading, triggerProps })` |
| `@evento` | `onEvento` |
| `:mask-format` (directiva `v-format` por dentro) | `maskFormat` |
| atributo `autofocus` dentro de un diálogo | `data-autofocus` |
| `defineExpose` (`view`, `open()`, `close()`, `start()`) | no existe en estos componentes |
| `app.use(FormElements)` | no existe |

### Diferencias por componente

| Componente | Vue | React |
|---|---|---|
| `TextInputComponent` | `readonly`, `autofocus`, `autocomplete` | `readOnly`, `autoFocus`, `autoComplete`, `id` |
| `SelectSearchInputComponent` | `inputLabel` y todas las props de vue-select; búsqueda remota con `ajax`; `@search(respuesta)` | `inputLabel`, props de react-select; `onSearch(término)`; input oculto con `name` |
| `ModelSearchInputComponent` | `getOptionLabel` (función), `debounceTime`, `noOptionsText` | `optionLabel` (clave), `debounce`, `minLength` |
| `SingleCheckboxInputComponent` | `v-model:checked` | `checked` + `onCheckedChange` |
| `MultiCheckboxInputComponent` | `v-model:value` | `value` + `onChange` |
| `SwitchComponent` | `@change(evento)` | `onToggle(evento)` |
| `StarsInputComponent` | `readonly`, colores y slots | `readOnly` |
| `CountrySelectInputComponent` | `@change({ phone, country, isValid })` con `phone` nacional | `onCountryChange({ phone, country, callingCode, national, isValid })` |
| `CodeInputComponent` | 3 casillas de 56 px; `@complete(booleano)` | 6 casillas de 40 px; `onComplete(código)` al completarse |
| `PolymorphicInputComponent` | prop `props` | prop `config` (acepta `props`); tipos `switch` y `editor` |
| `EditorInputComponent` | `tinymceCdn`, subida de archivos, `output`, `extraConfig` | `tinymceScriptSrc`, `apiKey`, `validators` |
| `TextEditorMonoStyleInputComponent` | TinyMCE con dictado | CodeMirror en html |
| `CodeMirrorComponent` | `lang`, `theme` `auto`/`dark`/`light`, `autofocus`, expone `view` | `language`, `theme` `dark`/`light`, `height`, `readOnly`, `name` |
| `FileInputComponent` | textos sueltos y slots; `@updateFileList` | `labels`; `onFileListChange` |
| `FileDropInputComponent`, `SimpleFileInputComponent` | `@change`, `@input` | `onFilesChange`, `onInput`, `accept` |
| `AvatarInputComponent` | `@upload` | `onUpload`, `name` |
| `IconComponent` | `customClass` | `className` |
| `ClickToEditComponent` | `:save`, `@input`, expone `start()` | `onSave`, `onInput` |
| `MenuComponent` | `@select`, `@open`, `@close`, expone `open()` y `close()` | `onSelect`, `onOpen`, `onClose` |

::: tip Por qué hay diferencias deliberadas
- **`MultiCheckboxInputComponent`.** React deriva la selección del valor en vez de leer el DOM, así que dos grupos con el mismo `id` no se pisan.
- **Los componentes que envuelven una librería sin input propio** publican el valor en un `<input type="hidden">` con `name` y `data-validators` para que el validador lo encuentre. En React son `SelectSearchInputComponent`, `ColorPickerInputComponent`, `CodeMirrorComponent` y `EditorInputComponent`.
- **En React, pasar `id`** cambia a la vez el del control y el `for` de su etiqueta. Sin eso, la etiqueta apuntaría a la nada.
:::
