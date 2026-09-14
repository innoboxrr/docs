# Validación

`innoboxrr-js-validator` (2.0.1) valida formularios en el navegador a partir del atributo `data-validators`. Los componentes de Vue y de React escriben ese atributo cuando les pasas `validators`. No depende de ningún framework: trabaja sobre el DOM del formulario.

```bash
npm i innoboxrr-js-validator
```

```js
import JSValidator, { rules, defaultMessages, defaultLimits } from 'innoboxrr-js-validator'
```

## Uso

```html
<form id="createPostForm">
    <input name="title" data-validators="required length" data-min_length="3">
    <input name="email" data-validators="email">
    <button>Guardar</button>
</form>
```

```js
const validator = new JSValidator('createPostForm').init()
```

Las reglas van separadas por espacios o por barras verticales, como en Laravel: `required|email`.

Con los componentes, crea el validador cuando el formulario ya está en el DOM y destrúyelo al desmontar:

::: code-group

```vue [Vue]
<template>
    <form id="createPostForm" @submit.prevent="save">
        <TextInputComponent type="text" name="title" label="Título" validators="required length" :min_length="3" v-model="form.title" />
        <TextInputComponent type="email" name="email" label="Correo" validators="required email" v-model="form.email" />
        <ButtonComponent value="Guardar" />
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
            <TextInputComponent type="text" name="title" label="Título" validators="required length" minLength={3}
                value={form.title} onChange={(title) => setForm({ ...form, title })} />
            <TextInputComponent type="email" name="email" label="Correo" validators="required email"
                value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <ButtonComponent value="Guardar" />
        </form>
    )
}
```

:::

`init()` ya detiene un envío inválido antes de que llegue a tu manejador. Llamar a `validate()` dentro del manejador no sobra: devuelve el resultado, así que tu código no depende del orden en que se registraron los manejadores de `submit`.

## Los atributos

| Atributo | Qué hace |
|---|---|
| `data-validators` | Las reglas del control. |
| `data-min_length`, `data-max_length` | Los límites de `length`. |
| `data-min`, `data-max` | Los límites de `range`. |
| clase `jsValidator` | También marca un control a validar; se mantiene por si alguien la escribió a mano. |

Los componentes que envuelven una librería sin input propio publican su valor en un `<input type="hidden">` con `name` y `data-validators`, para que el validador lo encuentre. Por ejemplo, en React, `SelectSearchInputComponent`, `ColorPickerInputComponent`, `CodeMirrorComponent` y `EditorInputComponent`.

## Las reglas

| Regla | Qué comprueba | ¿Deja pasar el campo vacío? |
|---|---|---|
| `required` | Que no esté vacío (sin contar espacios). En `checkbox` y `radio`, que esté marcado: una casilla sin marcar tiene `value="on"`. | No |
| `checked` | Que la casilla esté marcada. | No |
| `length` | Longitud entre `data-min_length` y `data-max_length` (por defecto 3 y 255). | **No** |
| `range` | Número entre `data-min` y `data-max` (por defecto 0 y 100), comparando **números**. | **No**: un vacío cuenta como 0 |
| `email` | Formato de correo. | Sí |
| `url` | Empieza por `http://`, `https://`, `ftp://` o `sftp://`. | Sí |
| `host` | Un nombre de host, con puerto opcional. | Sí |
| `date` | Formato `d/m/aaaa` o `aaaa/m/d`, con `/`, `-` o `.`. Solo el formato, no que la fecha exista. | Sí |
| `phone` | Empieza por `+` o un dígito y sigue con dígitos, espacios, `-`, `.` o paréntesis. | Sí |
| `integer` | Entero, con signo opcional. | Sí |
| `positive_integer` | Entero mayor que cero. | Sí |
| `decimal` | Número con decimales opcionales, con punto. | Sí |
| `alpha` | Solo letras ASCII, sin espacios. | Sí |
| `alphanumeric` | Letras ASCII y números, sin espacios. | Sí |
| `alpha_dash` | Letras ASCII, `-` y `_`. | Sí |
| `alphanumeric_dash` | Letras ASCII, números, `-` y `_`. | Sí |
| `password_confirmation` | Igual al campo `[name="password"]` del mismo formulario. Si no lo encuentra, da el error `password_missing`. | Compara igual: dos vacíos coinciden |

Las reglas de formato dejan pasar el campo vacío porque de eso se encarga `required`. Sin esa convención, un campo opcional con formato daría error por estar vacío.

::: warning `length` y `range` no dejan pasar el vacío
- **`length`** mide un campo vacío como longitud 0, que es menor que el mínimo por defecto (3). Para una longitud opcional, pon `data-min_length="0"`.
- **`range`** convierte un vacío en 0, que solo pasa si 0 está dentro del rango.
:::

::: tip `alpha` no admite acentos
Las reglas `alpha*` usan `[a-z]` sin distinguir mayúsculas: «José» o «Muñoz» no pasan `alpha`. Para nombres propios, escribe una regla propia.
:::

- **Una regla desconocida** escribe un aviso en la consola y el validador sigue. Antes era un `TypeError` a mitad del envío.
- **Qué valida.** Cada regla lee `control.value`.

## Opciones

```js
new JSValidator('miForm', {
    messages: { required: 'Obligatorio.' },
    limits: { minLength: 1, maxLength: 120 },
    rules: {
        rfc: (value, { messages }) => /^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/.test(value) ? null : 'RFC inválido',
    },
    liveValidation: true,
})
```

| Opción | Por defecto | Qué hace |
|---|---|---|
| `messages` | `defaultMessages` | Se mezclan con los de fábrica. |
| `limits` | `{ minLength: 3, maxLength: 255, min: 0, max: 100 }` | Los límites cuando el control no trae `data-*`. |
| `rules` | `rules` | Se mezclan con las de fábrica; una con el mismo nombre la sustituye. |
| `liveValidation` | `true` | Revalida cada control al escribir, **pero solo después del primer intento de envío**: avisar de «campo requerido» antes de que dé tiempo a escribir es ruido. |

Una regla es una función pura:

```js
(value, { control, form, messages, defaults }) => 'mensaje de error' | null
```

`defaults` son los `limits` ya mezclados. Una regla propia puede leer los `data-*` de `control`.

### Los mensajes

| Clave | Por defecto |
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

`__minLength__`, `__maxLength__`, `__min__` y `__max__` se sustituyen por el límite que se aplicó.

## Errores del servidor

```js
try {
    await guardar()
} catch (error) {
    if (error.response?.status === 422) {
        validator.appendExternalErrors(error.response.data.errors)
    }
}
```

`appendExternalErrors` recibe el objeto `errors` de un 422 de Laravel, `{ campo: [mensajes] }`:

- **Cada mensaje se coloca junto a su control.** Se busca `[name="campo"]` o `[name="campo[]"]`, sea `input`, `select` o `textarea`. Los nombres con corchetes funcionan; antes `fqs[0][question]` rompía el selector.
- **Lo que no encuentra control se muestra al pie del formulario** como `campo: mensaje`, en vez de perderse.
- **Marca `status` como `false`** y devuelve el validador.
- **No borra los errores que ya hubiera.** El siguiente `validate()` limpia todos, también los del servidor.

::: tip Las claves con puntos
Laravel devuelve los errores de un array con puntos, como `items.0.name`. El validador busca el `name` tal cual, así que no los encuentra en un `name="items[0][name]"` y los muestra al pie del formulario.
:::

## Los mensajes son texto

Desde 2.0.1, **todos** los mensajes se insertan como nodos de texto, nunca como HTML:

- los de las reglas;
- los de la opción `messages`;
- los de reglas propias;
- los de `appendExternalErrors`.

Antes se escribían con `innerHTML`. Un mensaje de Laravel que repitiera lo que escribió el usuario, como «El valor `<img src=x onerror=…>` no es válido», se pintaba como marcado en la página.

::: warning Puede afectar a quien ya lo usa
Si tus `messages` llevaban HTML (una negrita, un enlace), ahora se ve literal: `<b>Obligatorio</b>`. Escríbelos como texto plano.
:::

El marcado que produce:

```html
<input name="title" data-validators="required length" aria-invalid="true">
<span class="error-msg" role="alert" data-for="title">Este campo es requerido.<br></span>

<!-- al pie del formulario, para errores sin control -->
<div class="error-msg form-error-msg" role="alert">slug: Ya existe.<br></div>
```

- **El hueco de cada control** se crea una vez, justo detrás del control, y se guarda la referencia. Antes se buscaba con `nextElementSibling`, y en un campo de contraseña el hermano es el botón del ojo, así que los mensajes acababan en el sitio equivocado.
- **Un control con error** lleva `aria-invalid="true"`.

## Ciclo de vida

| Paso | Qué hace |
|---|---|
| `new JSValidator(form, opciones)` | Recibe el `id` del formulario o el propio nodo. **Lanza** si no encuentra el formulario. Busca los controles y crea sus huecos. |
| `init()` | Engancha un manejador de `submit` **en fase de captura**: valida y, si falla, cancela el envío y detiene la propagación. Con `liveValidation`, engancha también `input` y `change` en cada control. Devuelve el validador. |
| `validate()` | Limpia y valida todo. **Devuelve** si es válido. |
| `validateControl(control)` | Limpia y valida un control. Devuelve si es válido. |
| `refresh()` | Vuelve a buscar los controles, para los añadidos después de montar (grupos dinámicos). |
| `reset()` | Borra los mensajes, los `aria-invalid` y el estado. |
| `destroy()` | Quita todo lo que engancharon `init()` y la validación en vivo. |

- **Por qué en captura.** Así el validador corre antes que el manejador del framework, que es quien decide si envía. Antes el orden dependía de quién se registrara primero.
- **Por qué `destroy()`.** Sin él, un formulario que se monta y desmonta varias veces, como un modal o una vista de edición, acumula manejadores.

::: warning `refresh()` no engancha la validación en vivo
`refresh()` añade los controles nuevos a la validación del envío, pero no les engancha `input` ni `change`: esos se enganchan solo en `init()`. Si necesitas validación en vivo en controles añadidos después, llama a `destroy()` y crea un validador nuevo.
:::

### Propiedades y métodos

| | Qué es |
|---|---|
| `status` | El resultado de la última validación. **Empieza en `true`**: nada validado es nada inválido. |
| `errors` | `[{ control, message }]`; `control` es `null` para los errores del pie. |
| `controls` | Los controles que se validan. |
| `form` | El formulario. |
| `addError(control, mensaje)` | Añade un error a un control. |
| `addFormError(mensaje)` | Añade un error al pie del formulario. |
| `clearControl(control)` | Limpia los errores de un control. |
| `appendExternalErrors(errores)` | Los errores de un 422. |

## Qué cambió en 2.0

Los dos primeros cambios hacían que el paquete **no validara nada**:

- **Buscaba los controles por la clase `.jsValidator`,** que no añade nadie en el ecosistema; los componentes emiten `data-validators`. Seleccionaba cero controles, así que cada `validators="required"` de cada formulario generado era decorativo.
- **`status` empezaba en `false`.** Los formularios generados lo leen en su propio manejador de `submit`, que corría antes que el del validador, así que el primer envío siempre se descartaba y **había que pulsar dos veces**.

Y además:

- **Mensajes.** Se guardan en una referencia en vez de buscarse con `nextElementSibling`.
- **`appendExternalErrors`.** Entrecomilla el nombre y busca también en `select` y `textarea`.
- **Reglas desconocidas.** Avisan y el validador sigue.
- **`range`.** Compara números: antes `'9' > 10` daba `true`.
- **`validate()`.** Devuelve el resultado.
- **Envío y ciclo de vida.** El `submit` se intercepta en captura, existe `destroy()` y los errores marcan `aria-invalid`.
- **Módulo.** El paquete declara `type: "module"` y tiene pruebas.
