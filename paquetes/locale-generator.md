# locale-generator

`innoboxrr/locale-generator` **2.1.0** reúne en `<idioma>.json` las claves de traducción que usan tu aplicación y su SPA. Conserva las traducciones que ya tienes y puede rellenar las que faltan con Google Translate.

```bash
php artisan locale:generate es      # añade a es.json las claves que encuentra en el código
php artisan locale:translate es     # traduce las que siguen vacías
```

Es el generador de PHP. El front tiene su equivalente en npm, `innoboxrr-locale-generator` (`locale-gen`); ver [Peticiones, rutas e idiomas](/interfaz/http-rutas-i18n).

## Instalar

```bash
composer require innoboxrr/locale-generator
```

Requiere PHP `^8.3`, `illuminate/support ^13.0` y `guzzlehttp/guzzle ^7.7`. Los proveedores se descubren solos.

## Configuración

`config/locale-generator.php`:

| Clave | Por omisión | Qué decide |
|---|---|---|
| `lang_path` | `env('LOCALE_GENERATOR_LANG_PATH')`; vacía, `lang_path()` | Directorio de los `<idioma>.json`. Una ruta relativa se resuelve contra la raíz del proyecto |
| `routes` | `[resource_path()]` | Directorios que se recorren. `node_modules` y `vendor` nunca se recorren |
| `extensions` | `php`, `vue`, `js`, `jsx`, `ts`, `tsx` | Extensiones de los archivos que se leen |
| `google_api_key` | `env('GOOGLE_TRANSLATE_API_KEY')` | La clave que usa `locale:translate` |

Una lista `routes` o `extensions` vacía, como en una configuración publicada por una versión anterior, equivale al valor por omisión.

## Variables de entorno

| Variable | Uso |
|---|---|
| `LOCALE_GENERATOR_LANG_PATH` | `lang_path`, por ejemplo `resources/locales` |
| `GOOGLE_TRANSLATE_API_KEY` | `google_api_key`. Sin ella, `locale:translate` falla sin llamar a Google |

::: warning La clave de Google no se llama igual en PHP y en npm
Este paquete lee `GOOGLE_TRANSLATE_API_KEY`. El generador de npm (`innoboxrr-locale-generator`) lee `GOOGLE_TRANSLATE_KEY`. Si usas los dos, define las dos variables.
:::

## Publicar

| Tag | Qué copia |
|---|---|
| `config` | `config/locale-generator.php` |

```bash
php artisan vendor:publish --provider="Innoboxrr\LocaleGenerator\Providers\AppServiceProvider" --tag=config
```

## Migraciones

No trae migraciones.

## Comandos

### `locale:generate {locale}`

Extrae las claves literales de `__('…')`, `trans('…')`, `t('…')` y `$t('…')` (también `this.$t('…')`), con comillas simples o dobles, y las mezcla en `<lang_path>/<locale>.json`.

- **La clave tiene que ser una cadena literal completa como primer argumento.** `t('Hola ' + nombre)` y las plantillas con acento grave se saltan: adivinarlas escribiría basura.
- **El nombre de la función no puede ir pegado a otra cosa.** `alert('x')`, `emit('x')`, `import('x')` o `i18n.t('x')` no son claves.
- **Lee el archivo entero**, así que una llamada partida en varias líneas también cuenta.
- **Lo que ya tiene el archivo se queda tal cual**, incluidas las claves que ya no aparecen en el código. Las nuevas se añaden al final con valor vacío. Mientras no se traduzcan, `__()` de Laravel muestra la propia clave.
- **Un archivo existente que no es JSON válido** se deja intacto y el comando falla.
- **Crea el directorio** si no existe, y escribe UTF-8 sin escapar con salto de línea final.

### `locale:translate {filename} {--force}`

Traduce los valores vacíos de `<lang_path>/<filename>.json` con Google Cloud Translation (v2), una petición por clave.

- **Idioma destino.** Es el nombre del archivo: `es`, o `pt_BR`, que se envía como `pt-BR`. Acepta `es` o `es.json`. El idioma de origen lo detecta Google.
- **Texto.** Envía `format=text`, así que no devuelve entidades HTML.
- **Traducciones existentes.** No se sobrescriben. `--force` vuelve a traducir todas las claves.
- **Grupos anidados.** Sólo traduce cadenas; un grupo anidado se deja como está.
- **Errores.** Si Google falla a mitad, guarda lo ya traducido y termina con error. También termina con código distinto de 0 si el archivo no existe, no es JSON o falta la clave de API.

## Rutas HTTP

No registra rutas.

## Políticas y gates

No define políticas ni habilidades.

## Puntos de extensión

Sólo la configuración: qué se recorre (`routes`, `extensions`) y dónde se escribe (`lang_path`).

## En la aplicación base

`app:setup` pide `innoboxrr/locale-generator ^2.1`, pero **ningún paso de la instalación lo ejecuta**. Las traducciones de la aplicación base viven en tres sitios:

| Archivo | Qué traduce | Quién lo lee |
|---|---|---|
| `lang/es.json` | Los mensajes de Laravel en el backend | `__()` de Laravel |
| `resources/<ui>/app/lang/*.json` | Los textos de la interfaz base, escritos como `t('English key')` | La SPA, con `addTranslations` |
| `resources/<ui>/src/locales/{en,es}.json` | Las etiquetas del módulo que genera LaraPack | La SPA, antes que las de la aplicación |

::: warning Con la configuración por omisión, las claves de la SPA acaban en lang/es.json
`routes` recorre todo `resources/`: la interfaz base, el módulo generado y las vistas de Blade. `lang_path` apunta a `lang/`. Por eso `php artisan locale:generate es` escribe las claves de la SPA en el archivo de Laravel, que la SPA no lee. Para alimentar la interfaz base, apunta los dos a su carpeta:

```dotenv
LOCALE_GENERATOR_LANG_PATH=resources/vue/app/lang
```

y en `config/locale-generator.php`, `'routes' => [resource_path('vue/app')]`.
:::

Las claves del módulo generado se dejan vacías en `es.json` a propósito: tradúcelas en `src/locales/es.json` o en el archivo de la aplicación.

## Actualizar

### De 1.x a 2.1

- **`locale:translate` sólo traduce las claves vacías.** Antes las traducía todas y pisaba las corregidas a mano. `--force` recupera ese comportamiento.
- **`locale:translate` termina con código distinto de 0 cuando falla.** Antes terminaba con 0.
- **`locale:generate` conserva todo lo que ya tiene el archivo.** Antes borraba las claves que ya no aparecían en el código.
- **La extracción es más estricta.** Sólo cuentan `__`, `t`, `$t` y `trans` con una cadena literal completa.
- **`lang_path` en `null` usa `lang_path()`.** Antes intentaba escribir `/es.json` en la raíz del disco.
- **Variables nuevas.** `google_api_key` se lee de `GOOGLE_TRANSLATE_API_KEY` y `lang_path` de `LOCALE_GENERATOR_LANG_PATH`.

Las firmas de los dos comandos se mantienen; se añade `--force`.

## Problemas frecuentes

- **Una clave no se extrae.** Se construye con concatenación o con una plantilla, o se llama desde otro objeto (`i18n.t('x')`).
- **Las claves nuevas aparecen en otro archivo.** Revisa `lang_path` y `routes` (ver el aviso de arriba).
- **El archivo tiene claves que ya no se usan.** El comando nunca borra: límpialas a mano.
- **«Set GOOGLE_TRANSLATE_API_KEY in your .env».** Falta la variable, o definiste la del generador de npm.
- **La traducción cuesta más de lo esperado.** Es una petición por clave. Sin `--force` sólo se piden las vacías.
- **El comando falla y dice que el archivo no es JSON válido.** Alguien lo editó a mano. El comando no lo toca: corrígelo y vuelve a ejecutarlo.
