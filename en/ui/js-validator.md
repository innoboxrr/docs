# Validation

`innoboxrr-js-validator` (2.0.1) validates forms in the browser from the `data-validators` attribute. The Vue and React components write that attribute when you pass them `validators`. It depends on no framework: it works on the form's DOM.

```bash
npm i innoboxrr-js-validator
```

```js
import JSValidator, { rules, defaultMessages, defaultLimits } from 'innoboxrr-js-validator'
```

## Usage

```html
<form id="createPostForm">
    <input name="title" data-validators="required length" data-min_length="3">
    <input name="email" data-validators="email">
    <button>Save</button>
</form>
```

```js
const validator = new JSValidator('createPostForm').init()
```

Rules are separated by spaces or by vertical bars, as in Laravel: `required|email`.

With the components, create the validator once the form is in the DOM and destroy it on unmount:

::: code-group

```vue [Vue]
<template>
    <form id="createPostForm" @submit.prevent="save">
        <TextInputComponent type="text" name="title" label="Title" validators="required length" :min_length="3" v-model="form.title" />
        <TextInputComponent type="email" name="email" label="Email" validators="required email" v-model="form.email" />
        <ButtonComponent value="Save" />
    </form>
</template>

<script setup>
    import { onBeforeUnmount, onMounted, reactive } from 'vue'
    import JSValidator from 'innoboxrr-js-validator'
    import { createModel } from './models/post'

    const form = reactive({ title: '', email: '' })

    let validator = null

    onMounted(() => {
        validator = new JSValidator('createPostForm').init()
    })

    onBeforeUnmount(() => validator?.destroy())

    const save = async () => {
        if (! validator.validate()) {
            return
        }

        try {
            await createModel(form)
        } catch (error) {
            if (error.response?.status === 422) {
                validator.appendExternalErrors(error.response.data.errors)
            }
        }
    }
</script>
```

```jsx [React]
import { useEffect, useRef, useState } from 'react'
import JSValidator from 'innoboxrr-js-validator'
import { ButtonComponent, TextInputComponent } from 'innoboxrr-react-form-elements'
import { createModel } from './models/post'

export default function CreatePostForm() {
    const formRef = useRef(null)
    const validator = useRef(null)
    const [form, setForm] = useState({ title: '', email: '' })

    useEffect(() => {
        validator.current = new JSValidator(formRef.current).init()

        return () => validator.current?.destroy()
    }, [])

    const save = async (event) => {
        event.preventDefault()

        if (! validator.current.validate()) {
            return
        }

        try {
            await createModel(form)
        } catch (error) {
            if (error.response?.status === 422) {
                validator.current.appendExternalErrors(error.response.data.errors)
            }
        }
    }

    return (
        <form ref={formRef} onSubmit={save}>
            <TextInputComponent type="text" name="title" label="Title" validators="required length" minLength={3}
                value={form.title} onChange={(title) => setForm({ ...form, title })} />
            <TextInputComponent type="email" name="email" label="Email" validators="required email"
                value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <ButtonComponent value="Save" />
        </form>
    )
}
```

:::

`init()` already stops an invalid submit before it reaches your handler. Calling `validate()` inside the handler isn't redundant: it returns the result, so your code doesn't depend on the order in which `submit` handlers were registered.

## The attributes

| Attribute | What it does |
|---|---|
| `data-validators` | The control's rules. |
| `data-min_length`, `data-max_length` | The limits for `length`. |
| `data-min`, `data-max` | The limits for `range`. |
| `jsValidator` class | Also marks a control for validation; kept in case someone wrote it by hand. |

Components that wrap a library with no input of their own publish their value in an `<input type="hidden">` with `name` and `data-validators`, so the validator can find it. In React these include `SelectSearchInputComponent`, `ColorPickerInputComponent`, `CodeMirrorComponent` and `EditorInputComponent`.

## The rules

| Rule | What it checks | Lets an empty field pass? |
|---|---|---|
| `required` | Not empty (ignoring spaces). For `checkbox` and `radio`, that it's checked: an unchecked checkbox has `value="on"`. | No |
| `checked` | That the box is checked. | No |
| `length` | Length between `data-min_length` and `data-max_length` (3 and 255 by default). | **No** |
| `range` | A number between `data-min` and `data-max` (0 and 100 by default), comparing **numbers**. | **No**: empty counts as 0 |
| `email` | Email format. | Yes |
| `url` | Starts with `http://`, `https://`, `ftp://` or `sftp://`. | Yes |
| `host` | A host name, with an optional port. | Yes |
| `date` | `d/m/yyyy` or `yyyy/m/d`, with `/`, `-` or `.`. Format only, not whether the date exists. | Yes |
| `phone` | Starts with `+` or a digit, followed by digits, spaces, `-`, `.` or parentheses. | Yes |
| `integer` | An integer, with an optional sign. | Yes |
| `positive_integer` | An integer greater than zero. | Yes |
| `decimal` | A number with optional decimals, using a dot. | Yes |
| `alpha` | ASCII letters only, no spaces. | Yes |
| `alphanumeric` | ASCII letters and digits, no spaces. | Yes |
| `alpha_dash` | ASCII letters, `-` and `_`. | Yes |
| `alphanumeric_dash` | ASCII letters, digits, `-` and `_`. | Yes |
| `password_confirmation` | Equal to the `[name="password"]` field in the same form. If there isn't one, it reports `password_missing`. | It compares: two empty values match |

Format rules let an empty field pass because `required` takes care of that. Without that convention, an optional field with a format would fail just for being empty.

::: warning `length` and `range` don't let empty values pass
- **`length`** measures an empty field as length 0, which is below the default minimum (3). For an optional length, set `data-min_length="0"`.
- **`range`** turns an empty value into 0, which only passes when 0 is inside the range.
:::

::: tip `alpha` doesn't accept accents
The `alpha*` rules use a case-insensitive `[a-z]`: «José» or «Muñoz» don't pass `alpha`. For proper names, write a custom rule.
:::

- **An unknown rule** logs a warning to the console and validation continues. It used to be a `TypeError` in the middle of a submit.
- **What gets validated.** Every rule reads `control.value`.

## Options

```js
new JSValidator('myForm', {
    messages: { required: 'Required.' },
    limits: { minLength: 1, maxLength: 120 },
    rules: {
        rfc: (value, { messages }) => /^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/.test(value) ? null : 'Invalid RFC',
    },
    liveValidation: true,
})
```

| Option | Default | What it does |
|---|---|---|
| `messages` | `defaultMessages` | Merged over the defaults. |
| `limits` | `{ minLength: 3, maxLength: 255, min: 0, max: 100 }` | The limits when a control has no `data-*` attributes. |
| `rules` | `rules` | Merged over the defaults; a rule with the same name replaces the built-in one. |
| `liveValidation` | `true` | Revalidates each control as you type, **but only after the first submit attempt**: warning that a field is required before anyone has had time to type is noise. |

A rule is a pure function:

```js
(value, { control, form, messages, defaults }) => 'error message' | null
```

`defaults` are the merged `limits`. A custom rule can read `data-*` attributes from `control`.

### The messages

| Key | Default |
|---|---|
| `required` | Este campo es requerido. |
| `checked` | Debes marcar esta casilla para continuar. |
| `minLength` | Longitud no válida. Mínimo `__minLength__` caracteres. |
| `maxLength` | Longitud no válida. Máximo `__maxLength__` caracteres. |
| `range` | El valor debe estar entre `__min__` y `__max__`. |
| `email` | El campo de email no es válido. |
| `integer` | Por favor coloca un número entero. |
| `positive_integer` | El número debe ser un entero positivo. |
| `decimal` | El valor debe ser un número decimal. |
| `alphanumeric` | Solo se permiten letras y números sin espacios. |
| `alpha` | Solo se permiten letras sin espacios. |
| `alpha_dash` | Solo se permiten letras, guiones y guiones bajos. |
| `alphanumeric_dash` | Solo se permiten letras, números, guiones y guiones bajos. |
| `url` | Escribe una URL válida. Indica el protocolo http:// o https:// |
| `host` | Escribe un host válido. |
| `date` | El campo debe ser una fecha. |
| `phone` | El valor debe ser un número de teléfono válido. |
| `password_missing` | No se ha encontrado un campo de contraseña para validar. |
| `password_mismatch` | Los campos de contraseña no coinciden. |

The defaults are in Spanish; pass `messages` to translate them. `__minLength__`, `__maxLength__`, `__min__` and `__max__` are replaced with the limit that was applied.

## Server errors

```js
try {
    await save()
} catch (error) {
    if (error.response?.status === 422) {
        validator.appendExternalErrors(error.response.data.errors)
    }
}
```

`appendExternalErrors` takes the `errors` object from a Laravel 422, `{ field: [messages] }`:

- **Each message goes next to its control.** It looks for `[name="field"]` or `[name="field[]"]`, whether an `input`, `select` or `textarea`. Names with brackets work; `fqs[0][question]` used to break the selector.
- **Anything without a matching control is shown at the bottom of the form** as `field: message`, instead of being lost.
- **It sets `status` to `false`** and returns the validator.
- **It doesn't clear existing errors.** The next `validate()` clears them all, server errors included.

::: tip Keys with dots
Laravel returns array errors with dots, like `items.0.name`. The validator looks for the `name` as is, so it doesn't find them on a `name="items[0][name]"` control and shows them at the bottom of the form.
:::

## Messages are text

Since 2.0.1, **every** message is inserted as a text node, never as HTML:

- messages from the rules;
- messages from the `messages` option;
- messages from custom rules;
- messages from `appendExternalErrors`.

They used to be written with `innerHTML`. A Laravel message that echoed what the user typed, such as «The value `<img src=x onerror=…>` is invalid», was rendered as markup on the page.

::: warning May affect existing users
If your `messages` contained HTML (bold text, a link), it now shows literally: `<b>Required</b>`. Write them as plain text.
:::

The markup it produces:

```html
<input name="title" data-validators="required length" aria-invalid="true">
<span class="error-msg" role="alert" data-for="title">Este campo es requerido.<br></span>

<!-- at the bottom of the form, for errors with no control -->
<div class="error-msg form-error-msg" role="alert">slug: Already taken.<br></div>
```

- **Each control's message slot** is created once, right after the control, and the reference is kept. It used to be found with `nextElementSibling`, and on a password field the next sibling is the eye button, so messages ended up in the wrong place.
- **A control with an error** carries `aria-invalid="true"`.

## Lifecycle

| Step | What it does |
|---|---|
| `new JSValidator(form, options)` | Takes the form's `id` or the node itself. It **throws** if the form isn't found. It collects the controls and creates their slots. |
| `init()` | Attaches a `submit` handler **in the capture phase**: it validates and, on failure, cancels the submit and stops propagation. With `liveValidation`, it also attaches `input` and `change` to each control. It returns the validator. |
| `validate()` | Clears and validates everything. It **returns** whether the form is valid. |
| `validateControl(control)` | Clears and validates one control. Returns whether it's valid. |
| `refresh()` | Collects the controls again, for controls added after mounting (dynamic groups). |
| `reset()` | Clears messages, `aria-invalid` attributes and the state. |
| `destroy()` | Removes everything `init()` and live validation attached. |

- **Why the capture phase.** That way the validator runs before the framework's handler, which is the one deciding whether to submit. The order used to depend on who registered first.
- **Why `destroy()`.** Without it, a form mounted and unmounted several times, like a modal or an edit view, piles up handlers.

::: warning `refresh()` doesn't attach live validation
`refresh()` adds new controls to submit validation, but doesn't attach `input` or `change` to them: those are only attached in `init()`. If you need live validation on controls added later, call `destroy()` and create a new validator.
:::

### Properties and methods

| | What it is |
|---|---|
| `status` | The result of the last validation. **It starts as `true`**: nothing validated means nothing invalid. |
| `errors` | `[{ control, message }]`; `control` is `null` for form-level errors. |
| `controls` | The controls being validated. |
| `form` | The form. |
| `addError(control, message)` | Adds an error to a control. |
| `addFormError(message)` | Adds an error at the bottom of the form. |
| `clearControl(control)` | Clears a control's errors. |
| `appendExternalErrors(errors)` | The errors from a 422. |

## What changed in 2.0

The first two issues meant the package **didn't validate anything**:

- **It looked for controls by the `.jsValidator` class,** which nobody in the ecosystem adds; the components emit `data-validators`. It selected zero controls, so every `validators="required"` in every generated form was decorative.
- **`status` started as `false`.** Generated forms read it in their own `submit` handler, which ran before the validator's, so the first submit was always discarded and **you had to click twice**.

And also:

- **Messages.** Their slot is stored as a reference instead of being found with `nextElementSibling`.
- **`appendExternalErrors`.** It quotes the name and also searches `select` and `textarea`.
- **Unknown rules.** They log a warning and validation continues.
- **`range`.** It compares numbers: `'9' > 10` used to be `true`.
- **`validate()`.** It returns the result.
- **Submit and lifecycle.** `submit` is intercepted in the capture phase, `destroy()` exists and errors set `aria-invalid`.
- **Module.** The package declares `type: "module"` and has tests.
