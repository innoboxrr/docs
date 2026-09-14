# Peticiones, rutas e idiomas

Cinco paquetes pequeños, ninguno atado a un framework. Son los que usa el contrato de cada modelo generado:

| Paquete | Versión | Para qué |
|---|---|---|
| `innoboxrr-http-request` | 2.0.0 | Hacer peticiones con reintentos, confirmación y cancelación |
| `innoboxrr-route-resolver` | 2.0.0 | Convertir el nombre de una ruta de Laravel en una URL |
| `innoboxrr-i18n` | 1.2.0 | Traducir con claves al estilo de Laravel |
| `innoboxrr-locale-generator` | 2.0.0 | Extraer las claves de `t('…')` a archivos JSON |
| `innoboxrr-maskjs` | 2.0.0 | Máscaras de entrada |

## Peticiones: innoboxrr-http-request

```bash
npm i innoboxrr-http-request
```

```js
import makeHttpRequest from 'innoboxrr-http-request'

// GET: los datos viajan en la query. Hasta 3 reintentos, cada 1,5 s.
const posts = await makeHttpRequest('get', route('api.blog.post.index'), { page: 2 }, {}, 3, 1500)

// PUT con el cuerpo en JSON
await makeHttpRequest('put', route('api.blog.post.update'), { post_id: 1, title: 'Nuevo' })
```

Devuelve el **cuerpo** de la respuesta (`response.data`), no la respuesta de axios.

```text
makeHttpRequest(method, url, data, headers, maxRetries, retryInterval, confirmOptions, options)
```

| Parámetro | Por defecto | Qué hace |
|---|---|---|
| `method` | obligatorio | Se pasa a minúsculas. |
| `url` | obligatorio | |
| `data` | `{}` | En GET y HEAD va en la query; en el resto, DELETE incluido, en el cuerpo. Las rutas generadas leen el id del cuerpo. |
| `headers` | `{}` | |
| `maxRetries` | `0` | Reintentos como máximo, además del primer intento. |
| `retryInterval` | `1500` | Milisegundos entre reintentos. |
| `confirmOptions` | `null` | Las opciones de `Swal.fire()` de SweetAlert2. Se pregunta **una vez**, antes de enviar. |
| `options.timeout` | `30000` | Milisegundos. Antes no había timeout y una petición podía quedarse colgada para siempre. |
| `options.signal` | — | Un `AbortSignal` para cancelar. |
| `options.withCredentials` | — | Se pasa a axios. |

### Reintentos

Solo se reintenta lo que puede ser transitorio:

| Resultado | ¿Se reintenta? |
|---|---|
| Sin respuesta (red, timeout) | Sí |
| `5xx` | Sí |
| `429` | Sí, esperando los segundos de `Retry-After` si el servidor los manda; si no, `retryInterval` |
| Otro `4xx` | **No** |
| Confirmación cancelada | **No** |

Reintentar un `422` tres veces es recibir tres veces el mismo error de validación, y un `403` no se arregla solo. `isRetryable(error)` está exportada, por si quieres la misma regla en otro sitio.

### Confirmación y cancelación

```js
import makeHttpRequest, { RequestCancelledError } from 'innoboxrr-http-request'

try {
    await makeHttpRequest('delete', url, { post_id: 1 }, {}, 0, 1500, {
        title: 'Confirmar operación',
        text: '¿Seguro que quieres borrarlo?',
        icon: 'warning',
        showCancelButton: true,
    })
} catch (error) {
    if (error instanceof RequestCancelledError) {
        return // el usuario dijo que no: no es un fallo
    }

    mostrarError(error)
}
```

- **La confirmación usa SweetAlert2.** Toma el `window.Swal` de la aplicación si existe; si no, el `sweetalert2` que trae el paquete.
- **Si no se confirma,** la función lanza `RequestCancelledError`, con `name === 'RequestCancelledError'` y `cancelled === true`. Antes era un `Error` genérico, indistinguible de un fallo de red.

::: tip Los módulos generados confirman con el tema
El contrato de modelo que genera LaraPack no usa `confirmOptions`. Pregunta con `confirmAction()` de form-core, que se pinta con el tema y en modo oscuro, y lanza `RequestCancelledError` si la respuesta es no. Las tablas reconocen `RequestCancelledError` y `CanceledError` y no avisan.
:::

Para cancelar una petición en curso:

```js
const controller = new AbortController()

const pending = makeHttpRequest('get', url, { q: 'mesa' }, {}, 0, 1500, null, { signal: controller.signal })

controller.abort() // axios rechaza con un error de nombre 'CanceledError'
```

::: warning Con `maxRetries`, una petición abortada también se reintenta
`isRetryable` solo mira si hubo respuesta, y una petición abortada no la tiene. Si vas a cancelar con `signal`, deja `maxRetries` en `0`.
:::

### Plugin de Vue

```js
import { VueHttpRequestPlugin } from 'innoboxrr-http-request/vue'

app.use(VueHttpRequestPlugin) // this.$httpRequest
```

Vive en su propio punto de entrada para que un proyecto React no lo arrastre. El plugin de Vuex se retiró en 2.0: el ecosistema usa Pinia, y en un store de Pinia se importa la función directamente.

| Exporta | |
|---|---|
| `innoboxrr-http-request` | `makeHttpRequest` (también por defecto), `RequestCancelledError`, `isRetryable` |
| `innoboxrr-http-request/vue` | `VueHttpRequestPlugin` (también por defecto) |

## Rutas: innoboxrr-route-resolver

El front nunca escribe una URL a mano. Laravel exporta sus rutas con nombre y el navegador las resuelve por nombre, así que el backend puede mover una ruta sin romper nada en la interfaz.

```bash
npm i innoboxrr-route-resolver
php artisan route:json
```

`php artisan route:json` es el comando de [routes-to-json](/paquetes/routes-to-json): escribe el mapa nombre → URI que carga `setRoutes()`. Vuelve a ejecutarlo cada vez que añadas o cambies una ruta.

```js
import route, { setRoutes } from 'innoboxrr-route-resolver'
import routes from './routes.json'

setRoutes(routes)

route('api.blog.post.index')
```

### `route(nombre, ...args)`

Ejemplo con estas rutas:

```js
setRoutes({
    'api.deals.deal.index': 'api/deals/deal/index',
    'api.deals.deal.show': 'api/deals/deal/{deal}',
    'api.deals.deal.tags': 'api/deals/deal/{deal}/tags/{tag?}',
})

route('api.deals.deal.index')                        // '//<host>/api/deals/deal/index'
route('api.deals.deal.show', 7)                      // '//<host>/api/deals/deal/7'                posicional
route('api.deals.deal.show', { deal: 7 })            // '//<host>/api/deals/deal/7'                nombrado
route('api.deals.deal.tags', { deal: 7 })            // '//<host>/api/deals/deal/7/tags'           el opcional se omite
route('api.deals.deal.index', { page: 2, ids: [1, 2] })
// '//<host>/api/deals/deal/index?page=2&ids%5B%5D=1&ids%5B%5D=2'
```

- **Modo nombrado o posicional.** Un único argumento que sea un objeto (y no un array) es modo nombrado. Cualquier otra cosa es modo posicional: cada argumento rellena el siguiente parámetro, en orden.
- **Parámetros opcionales.** Un `{param?}` sin valor desaparece de la URL. Antes consumía un argumento igualmente y dejaba `undefined` en la ruta.
- **Parámetros obligatorios.** Si falta uno, se **lanza** `Missing required parameter "deal" for route api.deals.deal.show`, en vez de dejar `undefined` en la URL.
- **Valores.** Pasan por `encodeURIComponent`.
- **Lo que sobra.** En modo nombrado, lo que no es parámetro va a la query: los arrays como `clave[]` y los `null` o `undefined` se omiten. En modo posicional, los argumentos de más se ignoran.
- **El resultado es una URL sin protocolo:** `//host/uri`, que el navegador completa con el protocolo de la página.

### Host y modo estricto

| Función | Qué hace |
|---|---|
| `setRoutes(mapa)` | Carga el mapa nombre → URI. |
| `hasRoute(nombre)` | Si el nombre existe. |
| `setBaseUrl('api.ejemplo.test')` | Fija el host. Sin argumento, vuelve a `location.host`. |
| `setStrict(true)` | Una ruta desconocida lanza `Unknown route <nombre>` en vez de escribirlo en la consola y devolver `undefined`. |

- **El host por defecto es `location.host`,** que a diferencia de `hostname` incluye el puerto. Sin él, en local contra `:8000` las URLs salían rotas. Se lee al llamar a `route()` y no al importar el módulo, porque en SSR o en una prueba `window` puede no existir todavía.
- **El modo estricto está desactivado por defecto,** para no cambiar el comportamiento de las aplicaciones que ya toleraban rutas desconocidas. Actívalo en las pruebas.

::: warning `setBaseUrl` recibe un host, no una URL
La URL se arma como `//` + host + `/` + URI. `setBaseUrl('https://api.ejemplo.test')` daría `//https://api.ejemplo.test/…`. Pasa solo `api.ejemplo.test`, con el puerto si hace falta.
:::

## Idiomas: innoboxrr-i18n

```bash
npm i innoboxrr-i18n
```

```js
import t, { addTranslations, setLocale } from 'innoboxrr-i18n'
import { translations as catalog } from 'acme-catalog'

addTranslations(catalog)                                                         // las del módulo, primero
addTranslations(import.meta.glob('/resources/locales/*.json', { eager: true }))  // las de la aplicación, después
setLocale(document.documentElement.lang)

t('Welcome')
t('Hello :name', { name: 'Ada' })
```

| Exporta | Qué hace |
|---|---|
| `t(clave, reemplazos)` (por defecto) | La traducción en el idioma actual o, si no hay, la propia clave. Cada `:nombre` se sustituye por su valor, en todas sus apariciones. |
| `addTranslations(origen)` | Suma traducciones a las que ya hay. Una clave cargada después gana. |
| `setTranslations(origen)` | Sustituye todo lo cargado. |
| `setLocale(idioma)` / `getLocale()` | El idioma actual. Un valor vacío se ignora. Por defecto es `'en-US'`. |
| `hasTranslation(clave)` | Si la clave tiene una traducción no vacía en el idioma actual. |

`origen` es un objeto por idioma, como `{ en: {…}, es: {…} }`, o el glob `eager` de Vite sobre archivos JSON.

### Varios orígenes

- **Orden.** Carga primero las traducciones de los módulos y después las de la aplicación: así la aplicación tiene la última palabra y puede corregir cualquier texto de un módulo.
- **Una traducción vacía significa «pendiente de traducir».** Por ejemplo, `"Create": ""`, que es lo que escribe `locale-gen` para una clave nueva. Nunca pisa una traducción cargada antes y, sin otra, `t()` muestra la clave en vez de un hueco en blanco.
- **Los módulos generados usan claves en inglés.** Por eso, mientras `es.json` tenga una clave vacía, se ve el texto en inglés.

### Cómo se elige el idioma

- **El idioma es el nombre del archivo:** `/resources/locales/es.json` es `es` y el resto de la ruta se ignora. Antes se buscaba el idioma dentro de la ruta entera, y `es` aparece en «resources» y en «locales».
- **Las variantes se apilan sobre su idioma base:** con `es-MX` se usan las claves de `es` y ganan las de `es-MX` donde existan las dos.
- **Una variante sirve de base:** si se pide `es` y solo existe `es-MX`, se usa esa.
- **No importan las mayúsculas ni el `_`:** `es_MX.json` coincide con `setLocale('es-mx')`.

::: warning No es reactivo
`t()` lee el catálogo en el momento de llamarla. Un componente ya pintado no se retraduce después de un `setLocale()`. Fija el idioma antes de montar la aplicación; para cambiarlo, recarga la página o vuelve a pintar lo que muestra texto.
:::

::: tip Nombres de reemplazo que no se pisen
Cada reemplazo es un `replaceAll` de `:nombre`, así que `:name` también sustituiría el principio de `:names`. Usa nombres que no sean prefijo uno de otro.
:::

## Claves de traducción: locale-gen

`innoboxrr-locale-generator` recorre el código, encuentra las llamadas a `t('…')` y escribe un `<idioma>.json` por idioma. Las claves nuevas se añaden y **las existentes no se tocan**. Los módulos generados lo traen como `npm run locale`.

```bash
npm i -D innoboxrr-locale-generator

npx locale-gen                       # es y en, desde ./src hacia ./src/locales
npx locale-gen es en fr -f ./src -o ./src/locales -m t
npx locale-gen es -t                 # traduce las claves nuevas con Google Translate
npx locale-gen -v                    # lista cuántas cadenas hay en cada archivo
```

| Opción | Por defecto | Qué hace |
|---|---|---|
| `[idiomas…]` | `es en` | Los idiomas destino, separados por espacios. |
| `-f <ruta>` | `./src` | Archivo o directorio a analizar. |
| `-o <ruta>` | `./src/locales` | Dónde escribir los `.json`. Se crea si no existe. |
| `-m <método>` | `t` | El nombre de la función de traducción. |
| `-t` | desactivado | Traduce con Google Translate las claves que no existían. |
| `-v` | desactivado | Lista las cadenas encontradas en cada archivo. |
| `-h`, `--help` | | La ayuda. |

La configuración se resuelve en este orden, y lo posterior gana: los valores por defecto, `locale.config.js` en el directorio actual y la línea de comandos.

```js
// locale.config.js
module.exports = {
    languages: ['es', 'en'],
    method: 't',
    sourcePath: './src',
    outputPath: './src/locales',
    translate: false,
}
```

- **Archivos que analiza.** `.vue`, `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.html` y `.php`. Salta `node_modules`, `dist`, `docs`, `.git`, `vendor` y `coverage`.
- **Qué encuentra.** Llamadas cuyo primer argumento es una cadena literal, entre comillas simples, dobles o invertidas.
- **El nombre del método se escapa,** así que `-m $t` funciona. Antes `$t` se leía como un ancla de fin de línea y la extracción devolvía cero cadenas sin avisar.
- **Solo coincide una llamada completa:** con `t` como método, `split('a')` no cuenta como `t('a')`.
- **Formato.** Los archivos se escriben con sangría de 4 espacios. Una clave nueva sin `-t` se escribe como `""`.
- **`-t` necesita `GOOGLE_TRANSLATE_KEY`,** que se lee del `.env` del directorio actual. Sin ella, o si la API falla, el proceso termina con código 1.

::: warning Dos nombres para la clave de Google
- **Este CLI de npm** lee `GOOGLE_TRANSLATE_KEY`.
- **El paquete de Laravel** (`locale:translate`) lee `GOOGLE_TRANSLATE_API_KEY`: ver [locale-generator](/paquetes/locale-generator).

Si usas los dos, define las dos variables.
:::

::: warning Si vienes del README del paquete
El README de `innoboxrr-locale-generator` está desactualizado. El código dice esto:

- **El método por defecto** es `t`, no `__lang`.
- **Hay dos opciones que el README no menciona:** `-o` y `-v`.
- **La salida por defecto** es `./src/locales`.
- **No analiza archivos `.py`,** y sí `.jsx`, `.tsx`, `.mjs` y `.php`.
:::

Para usarlo desde código, el paquete exporta `extractStrings(archivo, método)`, `extractStringsFromDirectory(directorio, método, { onFile })`, `generateLocaleJSON(cadenas, idioma, traducir, directorio)` y `translateString(texto, idioma)`.

## Máscaras: innoboxrr-maskjs

```bash
npm i innoboxrr-maskjs
```

Una máscara son dos cadenas **de la misma longitud**:

```js
const PHONE = {
    format: '(***) ***-****', // qué se admite en cada posición
    mask: '(___) ___-____',   // la plantilla que se ve
}
```

| En `format` | Admite |
|---|---|
| `*` | Un dígito |
| `a` | Una letra, con acentos y ñ |
| `A` | Una letra o un dígito |
| Cualquier otro carácter | Es un literal: se escribe el que ocupa esa posición en `mask` |

```js
import { applyMask, unmask, isComplete, isMaskSpec } from 'innoboxrr-maskjs'

applyMask('5512345678', PHONE)   // { value: '(551) 234-5678', cursor: 14, complete: true }
unmask('(551) 234-5678', PHONE)  // '5512345678': lo que se envía al backend
isComplete('551234', PHONE)      // false
isMaskSpec(PHONE)                // true
```

- **`applyMask` no sabe cómo llegó el valor,** ya sea tecleado, pegado, borrado o cargado de la API: extrae los caracteres que valen y los recoloca. Es idempotente, así que se puede llamar en cada pulsación. Con una máscara inválida lanza `TypeError`.
- **`maskElement(input, spec)`** engancha la máscara a un `<input>` del DOM y devuelve la función para soltarla. Aplica el formato al escribir y al pegar, y coloca el cursor.

::: code-group

```vue [Vue]
<script setup>
    import { ref } from 'vue'
    import { formatDirective as vFormat } from 'innoboxrr-maskjs/vue'

    const phone = ref('')
    const PHONE = { mask: '(___) ___-____', format: '(***) ***-****' }
</script>

<template>
    <input v-format="PHONE" v-model="phone">
</template>
```

```jsx [React]
import { useState } from 'react'
import { applyMask } from 'innoboxrr-maskjs'
import { useMask } from 'innoboxrr-maskjs/react'

const PHONE = { mask: '(___) ___-____', format: '(***) ***-****' }

// Controlado, que es lo normal: no hace falta hook
export function Controlled() {
    const [phone, setPhone] = useState('')

    return <input value={phone} onChange={(e) => setPhone(applyMask(e.target.value, PHONE).value)} />
}

// No controlado
export function Uncontrolled() {
    const ref = useMask(PHONE)

    return <input ref={ref} />
}
```

:::

- **La directiva de Vue** se actualiza si cambia la máscara y se desengancha al desmontar.
- **`TextInputComponent`** la usa por dentro con el prop `maskFormat`, en los dos frameworks.
