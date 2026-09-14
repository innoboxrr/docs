# Form components

`innoboxrr-form-elements` (Vue, 6.8.0) and `innoboxrr-react-form-elements` (React, 3.8.0) export the same 37 components, with the same names. There's a reason for that: LaraPack writes the same `form_component` from `laraimport.json` into both the Vue and the React forms, and a name missing from one package would break that framework's build. A parity test in each repository fails if one package exports something the other doesn't.

Styling comes from the [form-core](/en/ui/form-core) theme. No component needs UIkit, Tailwind or Font Awesome.

## Install

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

app.use(FormElements) // registers all 37 components globally

// or import only the ones you use
import { TextInputComponent, DrawerComponent } from 'innoboxrr-form-elements'
```

```jsx [React]
import 'innoboxrr-form-core/styles'
import 'innoboxrr-react-form-elements/src/css/form-elements.css'
import '@yaireo/tagify/dist/tagify.css'       // if you use TagsInputComponent
import 'react-phone-number-input/style.css'   // if you use CountrySelectInputComponent

import { TextInputComponent, DrawerComponent } from 'innoboxrr-react-form-elements'
```

:::

| | Vue | React |
|---|---|---|
| Peer dependencies | `vue` ^3.5.0, `sortablejs` ^1.14.0, `lightvue` (optional) | `react` ^19.0.0, `react-dom` ^19.0.0 |
| Global registration | `app.use(FormElements)` | None: React has no app plugin |
| The components' own styles | In each component's `<style scoped>` | In `src/css/form-elements.css`, imported once |

## What every control shares

| What | Vue | React | Why |
|---|---|---|---|
| The value | `v-model` | `value` + `onChange(value)` | `onChange` receives the **value**, not the event, just like `update:modelValue`. The generator emits both forms from the same JSON, so they have to mean the same thing. |
| Label and help | `label`, `help` | `label`, `help` | `help` renders an icon carrying the text in `data-tooltip` and `aria-label`. |
| Validation | `validators` | `validators` | Written to `data-validators`, which [js-validator](/en/ui/js-validator) reads. |
| Length | `min_length`, `max_length` | `minLength`, `maxLength` (the underscore names are accepted too) | Written to `data-min_length` and `data-max_length`. |
| Class | `customClass` | `customClass` | **Replaces** the theme token's class; it isn't added to it. |
| No value | — | Manages itself | A React control without `value` is uncontrolled. The mode is fixed on the first render, to avoid React's warning. |

For the DOM event, React has `onInput`, `onFocus`, `onBlur`, `onEnter` and `onPaste` where the Vue twin emits `input`, `focus`, `blur`, `enter` and `paste`.

## The catalogue

| Group | Components |
|---|---|
| Text | `TextInputComponent`, `TextareaInputComponent`, `TagsInputComponent`, `CountrySelectInputComponent`, `CodeInputComponent` |
| Selection | `SelectInputComponent`, `SelectSearchInputComponent`, `ModelSearchInputComponent`, `TimezoneSelectInputComponent`, `CheckboxInputComponent`, `RadioInputComponent`, `SingleCheckboxInputComponent`, `MultiCheckboxInputComponent`, `SwitchComponent`, `StarsInputComponent`, `ColorPickerInputComponent` |
| Composite | `DynamicGroupInputComponent`, `FqsInputComponent`, `PolymorphicInputComponent` |
| Editors | `EditorInputComponent`, `TextEditorMonoStyleInputComponent`, `CodeMirrorComponent` |
| Files | `FileInputComponent`, `FileDropInputComponent`, `SimpleFileInputComponent`, `AvatarInputComponent` |
| Basics | `ButtonComponent`, `IconComponent`, `InputErrorComponent` |
| Desktop | `DialogComponent`, `DrawerComponent`, `MenuComponent`, `CommandPaletteComponent`, `SkeletonComponent`, `ClickToEditComponent`, `ToastRegionComponent`, `ConfirmHostComponent` |

In React, each component wraps the equivalent of the library its Vue twin wraps. Where the library is framework-agnostic, it is literally the same one:

| Component | Vue | React |
|---|---|---|
| `TextInputComponent` (mask) | `innoboxrr-maskjs/vue` | `innoboxrr-maskjs`, the same engine |
| `TagsInputComponent` | `@yaireo/tagify` | `@yaireo/tagify/react`, the same library |
| `EditorInputComponent` | `@tinymce/tinymce-vue` | `@tinymce/tinymce-react` |
| `CodeMirrorComponent` | `vue-codemirror` | `@uiw/react-codemirror`, the same CodeMirror 6 |
| `SelectSearchInputComponent` | `vue-select` | `react-select` |
| `CountrySelectInputComponent` | `vue-tel-input` | `react-phone-number-input`, the same `libphonenumber-js` |
| `DynamicGroupInputComponent` | `vuedraggable` | `@dnd-kit/sortable`, with keyboard reordering |
| `ColorPickerInputComponent` | `lightvue` (optional; without it, `<input type="color">`) | `react-colorful` |
| `IconComponent` | `@iconify/vue` | `@iconify/react` |
| `MenuComponent` | the `popover` attribute and `@floating-ui/dom` | the same |

## Text

### TextInputComponent

::: code-group

```vue [Vue]
<TextInputComponent
    type="text"
    name="phone"
    label="Phone"
    validators="required"
    :mask-format="{ mask: '(___) ___-____', format: '(***) ***-****' }"
    v-model="form.phone" />
```

```jsx [React]
<TextInputComponent
    type="text"
    name="phone"
    label="Phone"
    validators="required"
    maskFormat={{ mask: '(___) ___-____', format: '(***) ***-****' }}
    value={form.phone}
    onChange={(value) => setField('phone', value)} />
```

:::

| Vue | React | Default | What it does |
|---|---|---|---|
| `type` | `type` | required | The `<input>` type. With `password`, a button to reveal the password appears. |
| `name` | `name` | required in Vue | |
| `label`, `help`, `icon` | same | `''`, `null`, `''` | `icon` is a semantic or Iconify name. |
| `placeholder` | `placeholder` | `null` | |
| `validators` | `validators` | `null` | |
| `min_length`, `max_length` | `minLength`, `maxLength` | `null` | In Vue they're also written to the `min` and `max` attributes. |
| `steps` | `steps` | `null` | The `step` attribute. |
| `readonly` | `readOnly` | unset | |
| `autofocus`, `autocomplete` | `autoFocus`, `autoComplete` | unset | |
| `maskFormat` | `maskFormat` | `{}` in Vue, `null` in React | A maskjs `{ mask, format }`; see [maskjs](/en/ui/http-routes-i18n). |
| `showPasswordLabel`, `hidePasswordLabel` | same | `'Show password'`, `'Hide password'` | The eye button's `aria-label`. |
| `customClass` | `customClass` | unset | |
| — | `id` | generated | The label points at it. |
| events `enter`, `input`, `focus`, `blur`, `paste` | `onEnter`, `onInput`, `onFocus`, `onBlur`, `onPaste` | | They receive the DOM event. `enter` is releasing the Enter key. |

### TextareaInputComponent

| Vue | React | Default |
|---|---|---|
| `name` | `name` | required in Vue |
| `label` | `label`, `help` | `''` |
| `rows` | `rows` | `5` |
| `placeholder`, `validators` | same | `null` |
| `min_length`, `max_length` | `minLength`, `maxLength` (or the underscore names) | `null` |
| `customClass` | `customClass`, `id` | unset |

### TagsInputComponent

| Vue | React | Default | What it does |
|---|---|---|---|
| `name` | `name` | required in Vue | |
| `label`, `help`, `placeholder` | same | `''`, `null`, `''` | |
| `customClass` | `customClass` | `'fe-input '` in Vue | |
| `modelValue` (string or array) | `value` | `[]` in Vue | |
| — | `validators`, `id` | | |
| — | `whitelist`, `maxTags`, `duplicates` | `duplicates: false` | Tagify options. |
| — | `tagifyRef` | | A ref to reach the Tagify instance. |

### CountrySelectInputComponent

A phone number with a country selector, validated with `libphonenumber-js`.

| Vue | React | Default |
|---|---|---|
| `label` | `label`, `help` | `''` |
| `defaultPhone`, `defaultCountry` | same | `''`, `null` |
| `disabled` | `disabled` | `false` |
| `wrapperClass`, `containerClass`, `labelClass` | same | `null` |
| `dropdownOptions`, `inputOptions`, `preferredCountries` | — | `{}`, `{}`, `[]` (vue-tel-input options) |
| — | `name`, `id`, `placeholder`, `validators` | `'telephone'`, `null`, `'Ingresa un número telefónico'`, `null` |
| `change` event | `onCountryChange` | |

::: warning The event carries different data in each framework
- **Vue** emits `change` with `{ phone, country, isValid }`. With a valid number, `phone` is the **national number**. Leaving the field with an invalid number clears it and emits `{ phone: '', country, isValid: false }`.
- **React** calls `onCountryChange` with `{ phone, country, callingCode, national, isValid }`. `phone` is the full value and the national number comes separately, in `national`.
:::

### CodeInputComponent

A verification code, one character per box.

| Vue | React | Default (Vue / React) |
|---|---|---|
| `fields` | `fields` | `3` / `6` |
| `fieldWidth`, `fieldHeight` | same | `56` / `40` |
| `required` | `required` | `true` / `false` |
| `disabled` | `disabled` | `false` |
| `title`, `className` | same | unset / `null`, `''` |
| — | `autoFocus`, `value` | `false` |
| `change(code)` event | `onChange(code)` | |
| `complete(isComplete)` event | `onComplete(code)` | |

In Vue, `complete` fires on every change with a boolean. In React, `onComplete` is called only once every box is filled, and it receives the code.

## Selection

### SelectInputComponent

::: code-group

```vue [Vue]
<SelectInputComponent name="status" label="Status" validators="required" v-model="form.status">
    <option value="">Choose one</option>
    <option value="draft">Draft</option>
</SelectInputComponent>
```

```jsx [React]
<SelectInputComponent name="status" label="Status" validators="required" value={form.status} onChange={setStatus}>
    <option value="">Choose one</option>
    <option value="draft">Draft</option>
</SelectInputComponent>
```

:::

| Vue | React | Default |
|---|---|---|
| `name` | `name` | required in Vue |
| `label`, `help` | same | `''`, `null` |
| `multiple` | `multiple` | `false` |
| `size` | `size` | `null` |
| `validators`, `customClass` | same | `null` |
| default slot | `children` | The `<option>` elements |
| — | `id` | |

### SelectSearchInputComponent

A select with search.

| Vue | React | Default | What it does |
|---|---|---|---|
| `inputLabel`, `help` | same | `''`, `null` | The field label. |
| `options` | `options` | `[]` | |
| `label` | `label` | `'label'` | The option **key** that is displayed. |
| `reduce` | `reduce` | the whole option | What is stored as the value. |
| `multiple`, `clearable`, `disabled`, `loading`, `appendToBody` | same | `false`, `true`, `false`, `false`, `false` | |
| `placeholder` | `placeholder` | `''` | |
| `customClass` | `customClass` | unset | |
| `ajax`, `route`, `method`, `q`, `searchParams`, `minSearchLength`, `parseBeforeSubmit`, `debounceTime` | — | `false`, `''`, `'post'`, `''`, `{}`, `2`, identity, `300` | Remote search in Vue. |
| `noOptionsText` | — | `'Nothing here.'` | |
| `search(response)` event | `onSearch(term)` | | |
| — | `name`, `validators`, `id` | | |

- **Vue** also accepts the rest of vue-select's props: `taggable`, `pushTags`, `filterable`, `searchable`, `closeOnSelect`, `selectOnTab`, `getOptionLabel`, `getOptionKey`, `filterBy` and so on. With `ajax`, the search sends `_token`, `paginate: 0`, the `q` key with the term, and `searchParams`. With `method: 'get'`, all of that goes in the query string.
- **React** passes remaining props to react-select. It publishes the value in an `<input type="hidden">` with `name` and `data-validators`, because the library doesn't expose an input to put them on.

### ModelSearchInputComponent

Searches a model's records against an API route.

| Vue | React | Default | What it does |
|---|---|---|---|
| `labelStr`, `placeholderStr` | same | required in Vue | |
| `route` | `route` | required in Vue | The search URL. |
| `method` | `method` | `'get'` | |
| `q` | `q` | `'id'` | The parameter that carries the term. |
| `externalFilters` | `externalFilters` | `{}` | Filters added to the search. |
| `reduce` | `reduce` | `(option) => option.id` | |
| `getOptionLabel` | `optionLabel` | `` (option) => `ID: ${option.id}` `` in Vue; `'name'` in React | A function in Vue; a record key in React. |
| `multiple`, `hideOnEmit` | same | `false` | |
| `debounceTime` | `debounce` | `300` | Milliseconds. |
| — | `minLength` | `1` | Minimum length before searching. |
| `noOptionsText` | — | `'Nothing results found'` | |
| events `submit`, `selected` | `onSubmit`, `onSelected` | | |
| `customClass` | `customClass` | `null` | |

### TimezoneSelectInputComponent

| Vue | React | Default |
|---|---|---|
| `name` | `name` | required in Vue |
| `label`, `help` | same | `''`, `null` |
| `placeholder` | `placeholder` | `'Select a timezone'` |
| `validators` | `validators` | `''` |
| `multiple`, `size` | — | `false`, `null` |

### CheckboxInputComponent and RadioInputComponent

| Vue | React | Default | What it does |
|---|---|---|---|
| `name` | `name` | required in Vue | |
| `text` | `text` | `''` | The text next to the box. |
| `val` | `val` | `null` for Checkbox; required for Radio | The value this option contributes. |
| `validators`, `customClass` | same | `null` | |
| `checked` (Radio only) | — | `false` | |
| default slot | `children` | | |

### SingleCheckboxInputComponent

| Vue | React | Default |
|---|---|---|
| `id` | `id` | required in Vue |
| `label` | `label` | `''` |
| `v-model:checked` | `checked` + `onCheckedChange(checked)` | `false` |
| `value` | `value` | `null` |

### MultiCheckboxInputComponent

| Vue | React | Default | What it does |
|---|---|---|---|
| `options` | `options` | required in Vue | `[{ id, name }]`. In Vue a validator requires both keys. |
| `v-model:value` | `value` + `onChange` | required in Vue | The checked ids. |
| `id` | `id` | `''` | |

React derives the selection from the value. The Vue version recomputes it with `document.querySelectorAll`, so two groups with the same `id` interfere with each other.

### SwitchComponent

| Vue | React | What it does |
|---|---|---|
| `v-model` | `value` + `onChange(boolean)` | |
| `change(event)` event | `onToggle(event)` | The DOM event. |
| — | remaining props | Passed to the `<input type="checkbox">`. |

### StarsInputComponent

| Vue | React | Default |
|---|---|---|
| `max` | `max` | `5` |
| `v-model` (number) | `value` + `onChange` | `0` in Vue |
| `name` | `name` | `'rating'` |
| `char`, `inactiveChar` | same | `'★'`, `null` |
| `readonly` | `readOnly` | `false` |
| `starsSize` | `starsSize` | `'50px'` |
| `activeColor`, `inactiveColor`, `shadowColor`, `hoverColor` | — | `null` |
| slots `activeLabel`, `inactiveLabel` | — | |

### ColorPickerInputComponent

| Vue | React | Default |
|---|---|---|
| `label` | `label`, `help`, `id` | `''` |
| `clearable` | `clearable` | `true` |
| `colors` | `colors` | 16 Material colors |
| `bottomBar` | — | `true` |
| `v-model` | `value` + `onChange` | `'#607C8A'` in Vue |
| — | `name`, `validators` | `'color'`, `null` |

Without `lightvue`, the Vue version falls back to `<input type="color">`, which opens the operating system's dialog and can't be styled or tested. React uses `react-colorful`, 2.8 kB with no dependencies, and publishes the value in a hidden input with `name` and `data-validators`.

## Composite

### DynamicGroupInputComponent

A list of field groups that can be added, removed and reordered.

| Vue | React | Default | What it does |
|---|---|---|---|
| `v-model` (array) | `value` + `onChange` | required in Vue | One object per group. |
| `inputsConfig` | `inputsConfig` | required in Vue | One field per entry, with `key`, `type`, `label` and `options`; in Vue, also `attributes`. |
| `label` | `label` | `''` | |
| `addButtonLabel`, `removeButtonLabel`, `itemLabel` | same | `'Añadir'`, `'Eliminar'`, `'Item'` | |
| `hasSufix` | — | `true` | |

In React the drag handle is a `<button>` you can reach with Tab: `@dnd-kit` also reorders with the keyboard. A form that can only be reordered with a mouse isn't accessible.

### FqsInputComponent

Frequently asked questions: a list of `{ question, answer }`.

| Vue | React | Default |
|---|---|---|
| `v-model` (array) | `value` + `onChange` | required in Vue |
| `inputClass` | `inputClass` | `'fe-input '` |
| `labels` | `labels` | `{ title: 'Add frequency asked questions', question: 'Question', answer: 'Answer', add: 'Add Question', remove: 'Remove question' }` |
| `uploadUrl` | — | `null` |
| — | `name` | `'fqs'` |

### PolymorphicInputComponent

A single component that decides which control to render from a configuration.

::: code-group

```vue [Vue]
<PolymorphicInputComponent
    :props="{ type: 'select', name: 'size', label: 'Size', options: ['S', 'M', 'L'] }"
    v-model="answer"
    @save="save" />
```

```jsx [React]
<PolymorphicInputComponent
    config={{ type: 'select', name: 'size', label: 'Size', options: ['S', 'M', 'L'] }}
    value={answer}
    onChange={setAnswer}
    onSave={save} />
```

:::

| Configuration key | Use |
|---|---|
| `type` | Vue: `text`, `number`, `date`, `time`, `url`, `email`, `textarea`, `radio`, `select`, `checkbox`, `file`. React: the same, plus `switch` and `editor`. |
| `label`, `name`, `placeholder`, `validators`, `customClass`, `icon` | Passed to the control. |
| `minLength`, `maxLength`, `readonly` | Passed to the text control. |
| `options` | For `radio`, `select` and `checkbox`. In React a `select` option can be `{ value, label }`. |

- **The prop.** In Vue it is literally called `props`, kept for compatibility. In React it is called `config` and accepts `props` as an alias.
- **Saving.** After a change, a button appears that calls `save` (`onSave` in React) with the value.
- **Vue, `checkbox` type.** The value is a JSON array, and each change emits `save` immediately.
- **Vue, `file` type.** It uploads with `FileInputComponent` and stores the file `id`.
- **React, `file` type.** It uses `SimpleFileInputComponent`.

## Editors

### EditorInputComponent

A rich text editor built on TinyMCE.

| Vue | React | Default (Vue / React) |
|---|---|---|
| `id`, `name` | same | required in Vue |
| `label`, `help` | same | `''`, `null` |
| `height` | `height` | `400` / `300` |
| `disabled` | `disabled` | `false` |
| `initialValue` | `initialValue` | `''` |
| `plugins`, `toolbar` | same | Different in each package |
| `menubar`, `inline` | — | `true`, `false` |
| `output` | — | `'html'` (or `'text'`) |
| `tinymceCdn` | `tinymceScriptSrc` | Vue loads TinyMCE 6.3.2 from cdnjs |
| — | `apiKey` | |
| `uploadUrl`, `uri`, `file`, `onFileUploadSuccess` | — | `null`, `'/'`, `false`, `null` |
| `showSpeechRecognition` | — | `false` |
| `extraConfig` | remaining props | `{}` |
| `error` event | — | |
| — | `validators` | |

### TextEditorMonoStyleInputComponent

::: warning The twins are not the same editor
- **Vue.** It wraps `EditorInputComponent` (TinyMCE) with speech dictation. Its props are `label`, `name`, `id` (`'tmce'`), `placeholder`, `validators`, `min_length`, `max_length`, `defaultShowEditor` (`false`), `showSpeechRecognition` (`true`), `height` (`200`), `plugins`, `toolbar`, `menubar`, `inline`, `output`, `file`, `disabled`, `initialValue` and `customClass`.
- **React.** It is `CodeMirrorComponent` with `language="html"`. Its props are `label`, `help`, `name`, `height` (`'400px'`), `readOnly`, `value` and `onChange`.
:::

### CodeMirrorComponent

::: code-group

```vue [Vue]
<CodeMirrorComponent v-model="config" lang="json" label="Site configuration" />
```

```jsx [React]
<CodeMirrorComponent
    language="json"
    label="Site configuration"
    name="config"
    value={config}
    onChange={setConfig} />
```

:::

| Vue | React | Default (Vue / React) | What it does |
|---|---|---|---|
| `lang` | `language` | `'html'` / `'javascript'` | `html`, `css`, `javascript` or `json`, loaded on demand. |
| `theme` | `theme` | `'auto'` / `'dark'` | Vue: `auto`, `dark` or `light`. React: `dark` or `light`. |
| `autofocus` | — | `false` | Whether the editor takes focus on mount. |
| `placeholder` | — | `'Escriba su codigo aqui...'` | |
| `label` | `label`, `help` | `''` | |
| — | `height`, `readOnly` | `'300px'`, `false` | In Vue the height is fixed at 400 px. |
| — | `name`, `validators` | | React publishes the value in a hidden input with `name` and `data-validators`. |
| exposes `view` | — | | CodeMirror's `EditorView`. |

In Vue, Tab indents and the tab size is 4. In React, remaining props go to `@uiw/react-codemirror`.

#### What changed in 6.8.0 (Vue)

- **The language loads on demand.**
  - **Before.** The component statically imported html, css, javascript, json and one-dark. In the base application, an editor that only edits JSON produced a 580 kB chunk (200 kB gzipped).
  - **Now.** `lang` arrives through `import()`, and each language is its own chunk. An application that only mounts the editor with `lang="json"` goes from 637.3 kB (222.7 kB gzipped) to 498.5 kB (167.7 kB gzipped) in light mode. Dark mode adds 2.7 kB (1.2 kB gzipped) for one-dark.
- **While the language loads, the editor works as plain text.** When it arrives, the editor reconfigures without rebuilding the view, so neither the cursor nor the history is lost.
- **Loaded languages are remembered.** An editor that mounts again starts directly with its language; for example inside a dialog, whose content only exists while it is open.
- **Only the latest request counts:** a slow language doesn't overwrite the next one.
- **A `lang` outside the list falls back to `html` without throwing.** Previously, `constructor` or `__proto__` found something in the language map and broke the editor.
- **The editor follows the theme.**
  - **Before.** It was always painted with one-dark, even in a light application.
  - **Now.** `theme="auto"` applies the same rule as form-core's variables: `data-theme` on `<html>` wins, and without it `prefers-color-scheme` decides. It switches live when either changes. `dark` and `light` force a mode. one-dark is only downloaded the first time the editor has to paint in dark mode.
- **`autofocus` defaults to `false`.** Before, the editor took focus on mount, even at the bottom of a form.
- **The label names the editor through `aria-labelledby`, and clicking it focuses the editor.** A `<label for>` can't point at CodeMirror's `contenteditable`. Before, a screen reader announced a field with no name. With no label text the attribute isn't added, since it would name the editor with nothing.

::: warning May affect existing users
- **Focus.** If a screen relied on the editor taking focus on mount, you now have to ask for it:

  ```vue
  <CodeMirrorComponent v-model="html" autofocus />
  ```

- **Appearance.** To get the old dark look back in a light application, force it with `theme="dark"`.
:::

#### What changed in 3.8.0 (React)

- **The language also loads on demand.** An application that only mounts the editor with `language="json"` goes from 804.6 kB (270.9 kB gzipped) to 666.6 kB (215.9 kB gzipped). html, css and javascript stay in chunks nobody requests.
- **Plain text while loading.** A `language` outside the list leaves the editor as plain text, without throwing.
- **`theme` is still `dark` (the default) or `light`.** one-dark stays in the bundle because `@uiw/react-codemirror` imports and re-exports it: loading it with `import()` from this package wouldn't save a single byte.

::: warning In React the label doesn't name the editor yet
In React, `CodeMirrorComponent` renders the label without associating it with the editor, so a screen reader announces it with no name. The `aria-labelledby` association only exists in Vue.
:::

## Files

### FileInputComponent

Drop or pick files, validate them with form-core's `describeFiles` and upload them to `uploadUrl`.

| Vue | React | Default |
|---|---|---|
| `uploadUrl` | `uploadUrl` | required in Vue |
| `method` | `method` | `'POST'` |
| `autoUpload` | `autoUpload` | `false` |
| `name` | `name` | `'file'` |
| `visibility` | `visibility` | `'public'` |
| `maxSize`, `totalMaxSize` | same | `0` (no limit) |
| `maxFiles` | `maxFiles` | `1` |
| `validMimes` | `validMimes` | Text, images, audio, video, PDF, Office and gzip |
| `message`, `onDropMessage`, `onUploadMessage`, `maxFilesMessage`, `errorsTitle` | `labels` | Vue: separate strings. React: `{ drop, maxFiles, overTotal, upload, uploading, failed }` |
| `dropzoneClass`, `previewGridClass`, `hideOnMaxFilesReached`, `showTopPreview`, `showBottomPreview` | — | `'drop-zone'`, `'fe-w-quarter'`, `false`, `false`, `false` |
| slots `normalSlot`, `onDropSlot`, `onUploadSlot` | — | |
| events `startUpload`, `updateFileList`, `endUpload` | `onStartUpload`, `onFileListChange`, `onEndUpload` | |

### FileDropInputComponent

| Vue | React | Default |
|---|---|---|
| `multiple` | `multiple` | `false` |
| `mainText`, `subText` | same | `'Arrastra y suelta el archivo aqui'`, `'o haz clic para seleccionar los archivos.'` |
| — | `accept` | |
| `change(files)` event | `onFilesChange(files)` | An array of `File`. |

### SimpleFileInputComponent

| Vue | React | Default |
|---|---|---|
| `inputName` | `inputName` | `'file'` |
| `label` | `label` | `'Seleccionar archivo'` |
| `customClass` | `customClass` | `null` |
| — | `accept` | |
| `input(file)` event | `onInput(file)` | |

### AvatarInputComponent

| Vue | React | Default |
|---|---|---|
| `avatarUrl`, `uploadUrl` | same | required in Vue |
| `uploadMethod` | `uploadMethod` | `'POST'` |
| — | `name` | `'avatar'` |
| `upload(json)` event | `onUpload(json)` | The server response, already parsed as JSON. |

In Vue the file is sent in a `FormData` under the `file` field. A failure is only logged to the console.

## Basics

### ButtonComponent

::: code-group

```vue [Vue]
<ButtonComponent value="Save" />
<ButtonComponent variant="secondary" type="button" value="Cancel" @click="close" />
```

```jsx [React]
<ButtonComponent value="Save" />
<ButtonComponent variant="secondary" type="button" value="Cancel" onClick={close} />
```

:::

| Vue | React | Default | What it does |
|---|---|---|---|
| `variant` | `variant` | `'primary'` | `secondary`, `danger` or `link` pick the theme token; any other value uses `button`. |
| `value` | `value` | `'Enviar'` in Vue | The text. |
| `type` | `type` | `'submit'` | |
| `disabled` | `disabled` | `false` | |
| `customClass` | `customClass` | unset | |
| default slot | `children` | | |

### IconComponent

| Vue | React | Default | What it does |
|---|---|---|---|
| `name` | `name` | required | A name from the icon map, or an Iconify name. |
| `size` | `size` | `null` | Width and height. |
| `customClass` | `className` | `null` | |

It is `aria-hidden` on purpose: a decorative icon next to its text shouldn't be read twice. When the icon is the only cue, such as a button with no text, the label belongs in the button's `aria-label`. A live `setIcons()` repaints it.

### InputErrorComponent

| Prop | What it does |
|---|---|
| `errors` | The errors object from a Laravel 422, `{ field: [messages] }`. |
| `type` | The key this component looks at. |

It renders one paragraph per message, with the `error` token's class, and nothing when there are no errors.

## Desktop pieces

They rely on what the browser already does, with no UI library:

- **`<dialog>` with `showModal()`** provides the top layer, the inert background, trapped focus, Escape and focus return.
- **The `popover` attribute** provides light dismiss.
- **Floating UI** positions menus.

Where `showModal()` or `popover` don't exist, as in jsdom or an old browser, the components fall back to the `open` and `hidden` attributes.

### DialogComponent and DrawerComponent

::: code-group

```vue [Vue]
<DrawerComponent v-model:open="open" title="New product">
    <CreateForm @submit="save" />

    <template #footer="{ close }">
        <ButtonComponent variant="secondary" type="button" value="Cancel" @click="close" />
    </template>
</DrawerComponent>
```

```jsx [React]
<DrawerComponent
    open={open}
    onOpenChange={setOpen}
    title="New product"
    footer={({ close }) => (
        <ButtonComponent variant="secondary" type="button" value="Cancel" onClick={close} />
    )}>
    <CreateForm onSubmit={save} />
</DrawerComponent>
```

:::

| Vue | React | Default | What it does |
|---|---|---|---|
| `v-model:open` | `open` + `onOpenChange(open)` | `false` | |
| `title` | `title` | `null` | Names the dialog through `aria-labelledby`. |
| `label` | `label` | `null` | `aria-label` when there's no `title`. |
| `size` (dialog only) | `size` | `'md'` | `sm`, `md` or `lg`. |
| `side` (drawer only) | `side` | `'end'` | `end` on the right, `start` on the left. |
| `dismissible` | `dismissible` | `true` | With `false`, Escape and the backdrop don't close it and there's no X. |
| `closeLabel` | `closeLabel` | `'Cerrar'` | The X button's `aria-label`. |
| `close` event | `onClose` | | Emitted together with `update:open` set to `false`. |
| `header` slot | `header` | | Replaces the title. |
| default slot with `{ close }` | `children` (node or `({ close }) => …` function) | | |
| `footer` slot with `{ close }` | `footer` (node or function) | | |

- **`open` is in charge.** Escape, a backdrop click or the X only **request** closing through `update:open` / `onOpenChange(false)`: whoever opened it closes it. If the `<dialog>` kept its own state, it would drift from your form's boolean.
- **The content only exists while it is open.** A form comes back clean every time, and two copies of the same form don't collide on DOM `id`s.
- **Focus on open.** In Vue, use the usual `autofocus` attribute. In React, mark the element with `data-autofocus`: React doesn't write `autofocus` to the DOM.

### MenuComponent

::: code-group

```vue [Vue]
<MenuComponent
    :items="[
        { id: 'edit', label: 'Edit', icon: 'edit', action: edit },
        { separator: true },
        { id: 'delete', label: 'Delete', icon: 'delete', danger: true, disabled: ! allowed, disabledReason: 'Not allowed' },
    ]"
    :before-open="loadPermissions"
    @select="(item) => console.log(item.id)" />
```

```jsx [React]
<MenuComponent
    items={[
        { id: 'edit', label: 'Edit', icon: 'edit', action: edit },
        { separator: true },
        { id: 'delete', label: 'Delete', icon: 'delete', danger: true, disabled: ! allowed, disabledReason: 'Not allowed' },
    ]}
    beforeOpen={loadPermissions}
    onSelect={(item) => console.log(item.id)} />
```

:::

| Vue | React | Default | What it does |
|---|---|---|---|
| `items` | `items` | `[]` | The items (below). |
| `label` | `label` | `'Acciones'` | Name of the menu and its button. |
| `icon` | `icon` | `'more'` | The default button's icon. |
| `placement` | `placement` | `'bottom-end'` | Floating UI placement. |
| `beforeOpen` | `beforeOpen` | `null` | A function (can be async) awaited before opening. |
| events `select`, `open`, `close` | `onSelect`, `onOpen`, `onClose` | | |
| `trigger` slot with `{ toggle, open, loading, triggerProps }` | `renderTrigger({ toggle, open, loading, triggerProps })` | | Replaces the button. Put `triggerProps` on your button: they're the ARIA attributes. |
| exposes `open()` and `close()` | — | | |

An item can be:

- **An action:** `{ id, label, icon, shortcut, danger, disabled, disabledReason, action }`. `action(item)` is called when it's chosen, after `select`.
- **A separator:** `{ separator: true }`.
- **A group heading:** `{ group: 'Text' }`.

And this is how it behaves:

- **`beforeOpen` is awaited before opening.** Meanwhile the button is disabled. It's there for a row's permissions: opening with everything disabled and enabling it later makes users watch what they can't do flicker.
- **An item without permission doesn't disappear.** It shows as disabled (`aria-disabled`) and explains why in `data-tooltip`: someone who can't do something should know the action exists.
- **Keyboard.** Arrow keys, Home and End move through the usable items. Opening moves focus to the first item; closing returns it to the button.

### CommandPaletteComponent

::: code-group

```vue [Vue]
<CommandPaletteComponent
    v-model:open="palette"
    :items="[
        { id: 'products', label: 'Products', group: 'Go to', icon: 'box', action: goToProducts },
        { id: 'new', label: 'New product', group: 'Create', shortcut: 'N', keywords: ['add'], action: createProduct },
    ]" />
```

```jsx [React]
<CommandPaletteComponent
    open={palette}
    onOpenChange={setPalette}
    items={[
        { id: 'products', label: 'Products', group: 'Go to', icon: 'box', action: goToProducts },
        { id: 'new', label: 'New product', group: 'Create', shortcut: 'N', keywords: ['add'], action: createProduct },
    ]} />
```

:::

| Vue | React | Default | What it does |
|---|---|---|---|
| `v-model:open` | `open` + `onOpenChange` | `false` | |
| `items` | `items` | `[]` | `{ id, label, group, icon, shortcut, keywords, action }` |
| `placeholder` | `placeholder` | `'Buscar…'` | |
| `emptyText` | `emptyText` | `'Sin resultados'` | |
| `label` | `label` | `'Paleta de comandos'` | |
| `hotkey` | `hotkey` | `'k'` | With Ctrl or Cmd it opens and closes the palette. `null` removes the shortcut. |
| `select` event | `onSelect` | | Emitted before `action(item)` is called. |

- **The filter** ignores case and accents: typing «configuracion» finds «Configuración». It searches `label`, `group` and `keywords`.
- **Groups** are shown in the order they first appear.
- **Keyboard.** Arrow keys move through the list and Enter runs the item. Opening clears the search and focuses the input.

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

| Prop | Default | What it does |
|---|---|---|
| `shape` | `'text'` | `text`, `circle` or `block`. |
| `lines` | `1` | Only with `text`. With several lines, the last one is 60% wide, so it reads as a paragraph rather than a table. |
| `width`, `height` | `null` | A number means pixels; a string, any CSS length. |

It is `aria-hidden`: what announces loading to a screen reader is the `aria-busy` of the container waiting for it, not each rectangle.

### ClickToEditComponent

A value that is edited where it is: in a table cell or on a detail card.

::: code-group

```vue [Vue]
<ClickToEditComponent
    :value="product.title"
    label="Title"
    :save="(title) => updateModel(product.id, { title })" />
```

```jsx [React]
<ClickToEditComponent
    value={product.title}
    label="Title"
    onSave={(title) => updateModel(product.id, { title })} />
```

:::

| Vue | React | Default | What it does |
|---|---|---|---|
| `value` | `value` | `''` | |
| `type` | `type` | `'text'` | The edit field's type. |
| `placeholder` | `placeholder` | `'—'` | What shows when the value is empty. |
| `label` | `label` | `'Editar'` | The `aria-label` of the button and the field. |
| `save` | `onSave` | `null` | Function that saves; it is awaited. |
| `input` event | `onInput` | | The confirmed value. |
| `customClass` | `customClass` | unset | Replaces the field's class. |
| exposes `start()` | — | | Opens editing. |

- **Confirm and cancel.** Enter or leaving the field confirms; Escape cancels.
- **No change, nothing happens.** A value equal to the previous one neither saves nor emits.
- **With `save`, confirming waits for it to finish.** While saving, the field is disabled.
- **If `save` throws, the cell stays open** showing the error's `message`, or «No se pudo guardar». Closing it would show a value that wasn't saved.
- **Vue and React used to behave differently:** leaving the field kept it open in Vue and confirmed it in React. Now both behave the same.

### ToastRegionComponent and ConfirmHostComponent

::: code-group

```vue [Vue]
<!-- At the application root, exactly once -->
<ToastRegionComponent label="Notifications" close-label="Close" />
<ConfirmHostComponent close-label="Close" />
```

```jsx [React]
{/* At the application root, exactly once */}
<ToastRegionComponent label="Notifications" closeLabel="Close" />
<ConfirmHostComponent closeLabel="Close" />
```

:::

| Component | Props | What it renders |
|---|---|---|
| `ToastRegionComponent` | `label` (`'Avisos'`), `closeLabel` (`'Cerrar'`) | form-core's `notify()` queue |
| `ConfirmHostComponent` | `closeLabel` (`'Cerrar'`) | form-core's `confirmAction()` question |

- **The toast region lives in the top layer** with `popover="manual"`. Otherwise a toast arriving while a drawer is open would sit under the inert backdrop, which is exactly where a form gets saved. If a dialog opens afterwards, the region shows itself again to stay on top.
- **Roles.** A danger toast has `role="alert"`; the others, `role="status"`.
- **The confirmation is a small dialog** that starts with focus on **cancel**: a reflexive Enter shouldn't delete anything. Escape or a click outside count as cancel.

### What gets mounted once

| Component | Only once | Why |
|---|---|---|
| `ToastRegionComponent` | Yes, at the root | There is a single toast queue for the whole application. Two regions would render every toast twice; none would render nothing, even though `notify()` keeps filling the queue. |
| `ConfirmHostComponent` | Yes, at the root | Every host listens to the same confirmation: with two, the question opens twice. With none, `confirmAction()` falls back to `window.confirm`. |
| `CommandPaletteComponent` | Yes | It listens for the shortcut on `window` when mounted. Two mounted palettes would both respond to Ctrl+K. |
| `DialogComponent`, `DrawerComponent`, `MenuComponent` | No | Each instance is independent; its content only exists while open. |

## Vue ↔ React mapping

### The general shape

| Vue | React |
|---|---|
| `v-model` | `value` + `onChange(value)` |
| `v-model:open` | `open` + `onOpenChange(open)` |
| `:custom-class` | `customClass` |
| `min_length` / `max_length` | `minLength` / `maxLength` (the underscore names are accepted too) |
| default slot | `children` |
| scoped slot (`footer`, `header` with `{ close }`) | a prop with a node or a `({ close }) => …` function |
| `MenuComponent`'s `trigger` slot | `renderTrigger({ toggle, open, loading, triggerProps })` |
| `@event` | `onEvent` |
| `:mask-format` (the `v-format` directive inside) | `maskFormat` |
| `autofocus` attribute inside a dialog | `data-autofocus` |
| `defineExpose` (`view`, `open()`, `close()`, `start()`) | not available in these components |
| `app.use(FormElements)` | not available |

### Per-component differences

| Component | Vue | React |
|---|---|---|
| `TextInputComponent` | `readonly`, `autofocus`, `autocomplete` | `readOnly`, `autoFocus`, `autoComplete`, `id` |
| `SelectSearchInputComponent` | `inputLabel` and all vue-select props; remote search with `ajax`; `@search(response)` | `inputLabel`, react-select props; `onSearch(term)`; hidden input with `name` |
| `ModelSearchInputComponent` | `getOptionLabel` (function), `debounceTime`, `noOptionsText` | `optionLabel` (key), `debounce`, `minLength` |
| `SingleCheckboxInputComponent` | `v-model:checked` | `checked` + `onCheckedChange` |
| `MultiCheckboxInputComponent` | `v-model:value` | `value` + `onChange` |
| `SwitchComponent` | `@change(event)` | `onToggle(event)` |
| `StarsInputComponent` | `readonly`, colors and slots | `readOnly` |
| `CountrySelectInputComponent` | `@change({ phone, country, isValid })` with a national `phone` | `onCountryChange({ phone, country, callingCode, national, isValid })` |
| `CodeInputComponent` | 3 boxes of 56 px; `@complete(boolean)` | 6 boxes of 40 px; `onComplete(code)` when complete |
| `PolymorphicInputComponent` | `props` prop | `config` prop (accepts `props`); `switch` and `editor` types |
| `EditorInputComponent` | `tinymceCdn`, file upload, `output`, `extraConfig` | `tinymceScriptSrc`, `apiKey`, `validators` |
| `TextEditorMonoStyleInputComponent` | TinyMCE with dictation | CodeMirror in html mode |
| `CodeMirrorComponent` | `lang`, `theme` `auto`/`dark`/`light`, `autofocus`, exposes `view` | `language`, `theme` `dark`/`light`, `height`, `readOnly`, `name` |
| `FileInputComponent` | separate strings and slots; `@updateFileList` | `labels`; `onFileListChange` |
| `FileDropInputComponent`, `SimpleFileInputComponent` | `@change`, `@input` | `onFilesChange`, `onInput`, `accept` |
| `AvatarInputComponent` | `@upload` | `onUpload`, `name` |
| `IconComponent` | `customClass` | `className` |
| `ClickToEditComponent` | `:save`, `@input`, exposes `start()` | `onSave`, `onInput` |
| `MenuComponent` | `@select`, `@open`, `@close`, exposes `open()` and `close()` | `onSelect`, `onOpen`, `onClose` |

::: tip Why some differences are deliberate
- **`MultiCheckboxInputComponent`.** React derives the selection from the value instead of reading the DOM, so two groups with the same `id` don't interfere.
- **Components that wrap a library with no input of its own** publish the value in an `<input type="hidden">` with `name` and `data-validators`, so the validator can find it. In React these are `SelectSearchInputComponent`, `ColorPickerInputComponent`, `CodeMirrorComponent` and `EditorInputComponent`.
- **In React, passing `id`** changes both the control's id and its label's `for`. Without that, the label would point at nothing.
:::
