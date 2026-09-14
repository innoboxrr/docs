# El sitio y su editor

Las páginas públicas no están en el código. Se pintan desde una opción de [laravel-options](/paquetes/laravel-options) llamada `theme`, que siembra `SiteOptionsSeeder` y edita un administrador en `/admin/site`. El formato es el del theme-manager de siempre, así que el contenido de una aplicación antigua se sigue viendo.

## Las opciones

| Opción | Valor | Dónde se usa |
|---|---|---|
| `site_name` | Texto | Marca de la cabecera y del pie, título de la pestaña, cabecera del administrador y del acceso |
| `site_description` | Texto | Se edita en el editor del sitio. Ninguna pantalla la pinta: está para tu código. |
| `theme` | Objeto JSON | Las páginas del sitio y sus secciones |

Las interfaces las leen al arrancar con `api.laravel-options.option.index` y `paginate: 0`, una ruta **pública**. Por eso todo lo que guardes en opciones lo puede leer cualquiera.

::: danger Nunca guardes secretos en opciones
El índice de laravel-options no pide sesión. Una clave de API guardada como opción queda expuesta a cualquier visitante.
:::

## El formato de `theme`

```json
{
    "home": {
        "title": "Inicio",
        "sections": [
            {
                "theme": "legacy",
                "group": "hero",
                "name": "HeroOne",
                "props": { "display": true, "title": "Tu aplicación, lista para crecer" }
            }
        ]
    },
    "privacy": { "title": "Aviso de privacidad", "sections": [] },
    "terms": { "title": "Términos y condiciones", "sections": [] },
    "contact": { "title": "Contacto", "sections": [] },
    "join": { "title": "Únete", "sections": [] }
}
```

| Página | Ruta | Nombre de ruta |
|---|---|---|
| `home` | `/` | `site.home` |
| `privacy` | `/privacy` | `site.privacy` |
| `terms` | `/terms` | `site.terms` |
| `contact` | `/contact` | `site.contact` |
| `join` | `/join` | `site.join` |

Una página que no está en la opción enseña «Esta página todavía no tiene contenido» con un botón al inicio. Añadir una página nueva está en [Personalizar y ampliar](/app-base/personalizar).

## Cómo se pinta una página

- **Registro.** Cada sección se busca por `<theme>/<group>/<name>`, por ejemplo `legacy/hero/HeroOne`. Una que no está registrada no se pinta y avisa en consola: `[site] The section "…" is not registered; it is not rendered.`
- **`display`.** Con `props.display` en `false` o `"false"` no se pinta; sin la clave, sí. El formato antiguo guardaba los booleanos como texto.
- **Orden y regiones.** Se pinta en el orden del arreglo. Las secciones de grupo `header` del principio van antes de `<main id="content">`, y las de grupo `footer` y `cookie-consent` del final van después. El resto es el contenido de `<main>`.
- **Errores.** Una sección que falla al pintarse queda en blanco y el resto de la página se sigue viendo. El error queda en consola.
- **Título.** La pestaña dice `<título de la página> · <site_name>`.
- **Imágenes.** Todas son opcionales: sin ellas la sección se ve bien, sin huecos rotos.
- **Enlaces.** Uno que empieza por `/` (y no por `//`) navega con el router. Cualquier otro es un enlace normal. Un `javascript:`, `vbscript:` o `data:` se descarta y el texto se pinta sin enlace.
- **Estilos.** Salen de las variables `--fe-*` de form-core, así que el sitio tiene modo oscuro. Los iconos son los de form-elements.
- **Props mal escritas.** Cada sección normaliza sus props: un tipo inesperado se trata como vacío y no rompe la página.

## Las 13 secciones

Todas aceptan `display`. Un texto vacío no se pinta.

### `legacy/header/HeaderOne`

La cabecera: marca, navegación, redes y el botón de acceso.

| Prop | Tipo | Qué hace |
|---|---|---|
| `logo` | URL | Imagen de la marca. Sin ella, `site_name` como texto. |
| `nav` | `[{ label, link }]` | Enlaces del menú. Se salta un elemento sin `label`. |
| `facebook`, `twitter`, `instagram`, `youtube`, `whatsapp`, `linkedin`, `tiktok` | URL | Iconos de redes, en otra pestaña. `twitter` se muestra como «X». |

Muestra «Entrar» (a `/auth/login`) o «Administrador» (a `/admin`) según la sesión. En móvil el menú se abre con un botón. La versión React añade el botón de modo oscuro.

### `legacy/hero/HeroOne`

| Prop | Tipo | Qué hace |
|---|---|---|
| `badge` | Texto | Etiqueta destacada, enlazada a `badge_link` |
| `badge_value` | Texto | Texto junto a la etiqueta, enlazado a `badge_link` |
| `badge_link` | Enlace | Destino de la etiqueta |
| `title` | Texto | Título principal (`h1`) |
| `message` | Texto | Párrafo bajo el título |
| `primary_button_text`, `primary_button_link` | Texto, enlace | Botón principal |
| `secondary_button_text`, `secondary_button_link` | Texto, enlace | Enlace secundario con flecha |
| `videos` | `[URL]` | Uno al azar por visita, en bucle, silenciado y en reproducción automática |

### `legacy/hero/HeroTwo`

Las de HeroOne **sin `videos`**, más:

| Prop | Tipo | Qué hace |
|---|---|---|
| `badge_value_link` | Enlace | Destino propio de `badge_value`; sin él, `badge_link` |
| `video` | URL | Vídeo que se abre en un diálogo |
| `display_play_button` | Booleano | Enseña el botón de reproducir. Acepta `true`, `"true"`, `1` y `"1"`. Hace falta también `video`. |
| `play_button_text` | Texto | Texto del botón; por omisión «Ver el vídeo» |
| `imgs_1`, `imgs_2`, `imgs_3` | `[URL]` | Tres columnas de imágenes con desplazamiento animado. Sin imágenes, el botón de reproducir va junto a los botones. |

### `legacy/hero/HeroThree`

Las de HeroOne **sin `videos`**. En lugar de una foto pinta una composición con los colores del tema, que sigue al modo oscuro.

### `legacy/section/MissionSection`

| Prop | Tipo | Qué hace |
|---|---|---|
| `title` | Texto | Título |
| `subtitle` | Texto | Subtítulo |
| `message` | Texto | Párrafo |
| `button_text`, `button_link` | Texto, enlace | Botón |
| `images` | `[URL]` | Mosaico de **hasta 4** imágenes |

### `legacy/section/JoinSection`

| Prop | Tipo | Qué hace |
|---|---|---|
| `title` | Texto | Título |
| `subtitle` | Texto | Subtítulo |
| `image` | URL | Imagen al lado |
| `features` | `[texto]` | Lista con marcas de verificación |
| `button_text`, `button_link` | Texto, enlace | Botón |

### `legacy/section/FaqSection`

| Prop | Tipo | Qué hace |
|---|---|---|
| `title` | Texto | Título |
| `subtitle` | Texto | Subtítulo |
| `items` | `[{ question, answer }]` | Preguntas. Se salta una sin `question`. |

En Vue cada pregunta es un acordeón (`<details>`). En React se pintan todas abiertas (`<dl>`).

### `legacy/section/PartnersSection`

| Prop | Tipo | Qué hace |
|---|---|---|
| `title` | Texto | Título |
| `items` | `[{ name, logo, link }]` | Logos. Sin `logo`, o si no carga, el nombre. Sin logo ni nombre, se salta. |

En Vue un enlace externo se abre en otra pestaña. En React, en la misma.

### `legacy/section/TestimonialsSection`

| Prop | Tipo | Qué hace |
|---|---|---|
| `title` | Texto | Título |
| `subtitle` | Texto | Subtítulo |
| `feature` | `{ body, author: { name, handle, image } }` | Testimonio destacado, el primero |
| `items` | `[{ body, author: { name, handle, image } }]` | El resto |

Se acepta `message` en lugar de `body`, como en las aplicaciones antiguas. Un testimonio sin texto se salta, y sin `image` se ven las iniciales.

### `legacy/section/PlansSection`

| Prop | Tipo | Qué hace |
|---|---|---|
| `title` | Texto | Título |
| `subtitle` | Texto | Subtítulo |
| `frequencies` | `[{ value, label, price_suffix }]` | Periodos de pago. Con más de uno aparece un selector; empieza en el primero. `price_suffix` va detrás del precio («/mes»). |
| `tiers` | Lista de planes | Ver abajo |

::: details Las props de cada plan (`tiers`)
| Prop | Tipo | Qué hace |
|---|---|---|
| `id` | Texto | Clave estable del plan |
| `name` | Texto | Nombre. En Vue se salta un plan sin nombre. |
| `href` | Enlace | Botón «Elegir este plan»; sin él, no hay botón |
| `description` | Texto | Descripción |
| `price` | `{ <value de la frecuencia>: texto }` o texto | El precio del periodo elegido. Un texto o número suelto se usa siempre. Sin frecuencias, Vue muestra el primer precio del objeto y React no muestra ninguno. |
| `features` | `[texto]` | Lista con marcas |
| `most_popular` | Booleano | Resalta el plan con «El más elegido». Acepta `true`, `"true"`, `1` y `"1"`. |
:::

### `legacy/section/HtmlContent`

| Prop | Tipo | Qué hace |
|---|---|---|
| `content` | HTML | Se pinta tal cual (`v-html` / `dangerouslySetInnerHTML`) |

::: warning HTML de confianza
`content` no se limpia. Es contenido que escribe un administrador desde el editor, igual que en el theme-manager de antes, y sólo un administrador puede guardarlo. No copies ahí HTML de terceros que no controles. React no pinta nada si `content` está vacío; Vue pinta la sección vacía.
:::

### `legacy/footer/FooterOne`

| Prop | Tipo | Qué hace |
|---|---|---|
| `logo` | URL | Marca; sin ella, `site_name` |
| `description` | Texto | Texto bajo la marca |
| `cols` | `[{ title, items: [{ name, link }] }]` | Columnas de enlaces. Se salta un enlace sin `name`. |
| `newsletter` | `{ title, subtitle, button_text, button_link }` | Bloque de llamada a la acción con un botón. No es un formulario de suscripción. |
| `social_links` | `{ facebook, instagram, twitter, github, youtube, linkedin, tiktok, whatsapp }` | Iconos de redes, en otra pestaña |

Al final: «© `<año>` `<site_name>`. Todos los derechos reservados.»

### `legacy/cookie-consent/CookieConsentOne`

| Prop | Tipo | Qué hace |
|---|---|---|
| `message` | Texto | Por omisión: «Usamos cookies para que el sitio funcione y para recordar tus preferencias.» |
| `accept_text` | Texto | Por omisión «Aceptar» |
| `reject_text` | Texto | Por omisión «Rechazar» |
| `policy_link` | Enlace | Enlace «Saber más» |

Guarda la decisión en la cookie `cookie_consent` (`accepted` o `rejected`) durante 365 días, con `path=/` y `SameSite=Lax`, y no vuelve a salir. Nada más en la aplicación base lee esa cookie: si cargas scripts de terceros, condiciónalos tú.

## El sitio de ejemplo: `SiteOptionsSeeder`

`database/seeders/SiteOptionsSeeder.php` es tuyo. `app:install` lo ejecuta:

```bash
php artisan db:seed --class="Database\Seeders\SiteOptionsSeeder" --force
```

Crea tres opciones:

| Clave | Nombre | Valor |
|---|---|---|
| `site_name` | Nombre del sitio | `config('app.name')` |
| `site_description` | Descripción del sitio | «Una aplicación lista para crecer.» |
| `theme` | Páginas del sitio | Las cinco páginas de abajo |

| Página | Secciones |
|---|---|
| `home` (Inicio) | HeaderOne, HeroOne, MissionSection, TestimonialsSection, FaqSection, PartnersSection (con `display: false`), JoinSection, FooterOne, CookieConsentOne |
| `privacy` (Aviso de privacidad) | HeaderOne, HtmlContent, FooterOne |
| `terms` (Términos y condiciones) | HeaderOne, HtmlContent, FooterOne |
| `contact` (Contacto) | HeaderOne, HtmlContent, FooterOne |
| `join` (Únete) | HeaderOne, JoinSection, PlansSection, FaqSection, FooterOne |

Usa `Option::withTrashed()->firstOrCreate(['key' => …])`. Crea lo que falta y **no toca lo que existe**, aunque esté borrado lógicamente. Se puede ejecutar en cada instalación sin pisar lo que cambió el administrador. La contrapartida: si añades una página al seeder, no llega a una `theme` que ya existe. Añádela desde el editor.

::: tip Volver al sitio de ejemplo
Borra la opción `theme` de la tabla de opciones de forma permanente (con un borrado lógico, `firstOrCreate` la seguiría encontrando) y vuelve a ejecutar el seeder.
:::

## El editor del sitio

`/admin/site` (ruta `admin.site`). Sólo un administrador: la ruta lleva `admin` en la interfaz, y la política de laravel-options sólo deja escribir a quien responde `true` a `isAdmin()`.

### Qué se edita

- **General:** `site_name` y `site_description`.
- **Páginas:** una pestaña por página. Primero las cinco del contrato (`home`, `privacy`, `terms`, `contact`, `join`) y, detrás, cualquier otra que la opción ya tuviera. Nada de lo guardado se pierde al guardar otra vez. Las pestañas se recorren con las flechas, Inicio y Fin.
- **Por página:** su título y un enlace «Ver página» que abre la página en otra pestaña.
- **Por sección:** activar o desactivar (`display`), subir, bajar, quitar y editar sus props como JSON en CodeMirror. Un JSON inválido, o uno que no es un objeto, se marca y no deja guardar.
- **Añadir:** un selector con todas las secciones del registro. La nueva entra al final con `{ "display": true }` y el editor de props abierto.

Una sección cuya clave no está en el registro se marca como «Sección desconocida». Se conserva, pero no se pinta en el sitio.

### Qué hace «Guardar»

1. Si hay JSON inválido, no guarda, avisa y lleva a la primera sección con error.
2. Guarda `site_name` si cambió, y `site_description` si cambió. Cada uno es una opción y una petición.
3. Guarda `theme` entero con `options.save('theme', theme)`. Si la opción existe, es el update de laravel-options; si no, su create.
4. Avisa con un toast. Ante un 422 enseña los mensajes de validación; ante otro error, el mensaje del backend.

Todo se edita en un borrador: nada cambia en el sitio hasta guardar.

### Diferencias entre Vue y React

| | Vue | React |
|---|---|---|
| Nombre de la pestaña | El título de la página o su clave | La etiqueta de `sitePages` traducida o la clave |
| Quitar una sección | Inmediato | Pide confirmación |
| JSON inválido | Marca en la pestaña y en la sección; barra inferior «Corrige el JSON inválido para poder guardar.» | Aviso arriba y mensaje del analizador bajo la sección |
| Estado sin guardar | «Cambios sin guardar» | No se indica |
| Tema de CodeMirror | El de form-elements | Sigue al modo oscuro de la aplicación |
| Petición de update | `{ option_id, value }` | `{ option_id, name, key, value }` |

Las dos peticiones funcionan porque en laravel-options `key` es `sometimes` y `name` es `nullable`.
