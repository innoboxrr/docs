# The site and its editor

The public pages are not in the code. They are rendered from a [laravel-options](/en/packages/laravel-options) option called `theme`, which `SiteOptionsSeeder` seeds and an admin edits at `/admin/site`. The format is the old theme-manager's, so an older application's content still renders.

## The options

| Option | Value | Where it is used |
|---|---|---|
| `site_name` | Text | Header and footer brand, tab title, admin and authentication headers |
| `site_description` | Text | Edited in the site editor. No screen renders it: it is there for your code. |
| `theme` | JSON object | The site pages and their sections |

The interfaces read them at boot with `api.laravel-options.option.index` and `paginate: 0`, a **public** route. So anything stored in options can be read by anyone.

::: danger Never store secrets in options
The laravel-options index requires no session. An API key saved as an option is exposed to every visitor.
:::

## The `theme` format

```json
{
    "home": {
        "title": "Inicio",
        "sections": [
            {
                "theme": "legacy",
                "group": "hero",
                "name": "HeroOne",
                "props": { "display": true, "title": "Your application, ready to grow" }
            }
        ]
    },
    "privacy": { "title": "Aviso de privacidad", "sections": [] },
    "terms": { "title": "Términos y condiciones", "sections": [] },
    "contact": { "title": "Contacto", "sections": [] },
    "join": { "title": "Únete", "sections": [] }
}
```

| Page | Path | Route name |
|---|---|---|
| `home` | `/` | `site.home` |
| `privacy` | `/privacy` | `site.privacy` |
| `terms` | `/terms` | `site.terms` |
| `contact` | `/contact` | `site.contact` |
| `join` | `/join` | `site.join` |

A page missing from the option shows "This page has no content yet" with a button to the home page. Adding a new page is covered in [Customize and extend](/en/app-base/customize).

## How a page renders

- **Registry.** Each section is looked up by `<theme>/<group>/<name>`, for example `legacy/hero/HeroOne`. One that is not registered does not render and logs `[site] The section "…" is not registered; it is not rendered.`
- **`display`.** With `props.display` set to `false` or `"false"` it does not render; without the key, it does. The old format stored booleans as text.
- **Order and regions.** Sections render in array order. `header` group sections at the start go before `<main id="content">`, and `footer` and `cookie-consent` group sections at the end go after it. Everything else is the content of `<main>`.
- **Errors.** A section that throws while rendering stays blank and the rest of the page still shows. The error is logged.
- **Title.** The tab reads `<page title> · <site_name>`.
- **Images.** All optional: without them the section still looks right, with no broken gaps.
- **Links.** One that starts with `/` (and not `//`) navigates with the router. Anything else is a normal link. A `javascript:`, `vbscript:` or `data:` link is dropped and the text renders unlinked.
- **Styles.** They come from form-core's `--fe-*` variables, so the site has dark mode. Icons are form-elements'.
- **Badly written props.** Each section normalizes its props: an unexpected type is treated as empty and does not break the page.

## The 13 sections

All of them accept `display`. Empty text is not rendered.

### `legacy/header/HeaderOne`

The header: brand, navigation, social links and the sign-in button.

| Prop | Type | What it does |
|---|---|---|
| `logo` | URL | Brand image. Without it, `site_name` as text. |
| `nav` | `[{ label, link }]` | Menu links. An item without `label` is skipped. |
| `facebook`, `twitter`, `instagram`, `youtube`, `whatsapp`, `linkedin`, `tiktok` | URL | Social icons, in a new tab. `twitter` shows as "X". |

It shows "Sign in" (to `/auth/login`) or "Administrator" (to `/admin`) depending on the session. On mobile the menu opens with a button. The React version adds the dark-mode button.

### `legacy/hero/HeroOne`

| Prop | Type | What it does |
|---|---|---|
| `badge` | Text | Highlighted label, linked to `badge_link` |
| `badge_value` | Text | Text next to the label, linked to `badge_link` |
| `badge_link` | Link | The label's destination |
| `title` | Text | Main heading (`h1`) |
| `message` | Text | Paragraph under the title |
| `primary_button_text`, `primary_button_link` | Text, link | Primary button |
| `secondary_button_text`, `secondary_button_link` | Text, link | Secondary link with an arrow |
| `videos` | `[URL]` | One picked at random per visit, looping, muted and autoplaying |

### `legacy/hero/HeroTwo`

HeroOne's props **without `videos`**, plus:

| Prop | Type | What it does |
|---|---|---|
| `badge_value_link` | Link | Its own destination for `badge_value`; without it, `badge_link` |
| `video` | URL | A video that opens in a dialog |
| `display_play_button` | Boolean | Shows the play button. Accepts `true`, `"true"`, `1` and `"1"`. Also needs `video`. |
| `play_button_text` | Text | Button text; defaults to "Play video" |
| `imgs_1`, `imgs_2`, `imgs_3` | `[URL]` | Three columns of images with animated scrolling. Without images, the play button sits with the other buttons. |

### `legacy/hero/HeroThree`

HeroOne's props **without `videos`**. Instead of a photo it draws a composition in the theme colors, which follows dark mode.

### `legacy/section/MissionSection`

| Prop | Type | What it does |
|---|---|---|
| `title` | Text | Title |
| `subtitle` | Text | Subtitle |
| `message` | Text | Paragraph |
| `button_text`, `button_link` | Text, link | Button |
| `images` | `[URL]` | A mosaic of **up to 4** images |

### `legacy/section/JoinSection`

| Prop | Type | What it does |
|---|---|---|
| `title` | Text | Title |
| `subtitle` | Text | Subtitle |
| `image` | URL | Side image |
| `features` | `[text]` | List with check marks |
| `button_text`, `button_link` | Text, link | Button |

### `legacy/section/FaqSection`

| Prop | Type | What it does |
|---|---|---|
| `title` | Text | Title |
| `subtitle` | Text | Subtitle |
| `items` | `[{ question, answer }]` | Questions. One without `question` is skipped. |

In Vue each question is an accordion (`<details>`). In React they all render open (`<dl>`).

### `legacy/section/PartnersSection`

| Prop | Type | What it does |
|---|---|---|
| `title` | Text | Title |
| `items` | `[{ name, logo, link }]` | Logos. Without `logo`, or if it fails to load, the name. Without logo and name, skipped. |

In Vue an external link opens in a new tab. In React, in the same tab.

### `legacy/section/TestimonialsSection`

| Prop | Type | What it does |
|---|---|---|
| `title` | Text | Title |
| `subtitle` | Text | Subtitle |
| `feature` | `{ body, author: { name, handle, image } }` | Featured testimonial, shown first |
| `items` | `[{ body, author: { name, handle, image } }]` | The rest |

`message` is accepted in place of `body`, as in older applications. A testimonial without text is skipped, and without `image` the initials show.

### `legacy/section/PlansSection`

| Prop | Type | What it does |
|---|---|---|
| `title` | Text | Title |
| `subtitle` | Text | Subtitle |
| `frequencies` | `[{ value, label, price_suffix }]` | Billing periods. With more than one, a selector appears; it starts on the first. `price_suffix` follows the price ("/month"). |
| `tiers` | List of plans | See below |

::: details Each plan's props (`tiers`)
| Prop | Type | What it does |
|---|---|---|
| `id` | Text | Stable key for the plan |
| `name` | Text | Name. Vue skips a plan with no name. |
| `href` | Link | "Choose plan" button; without it, no button |
| `description` | Text | Description |
| `price` | `{ <frequency value>: text }` or text | The price for the selected period. A plain text or number is always used. With no frequencies, Vue shows the object's first price and React shows none. |
| `features` | `[text]` | List with check marks |
| `most_popular` | Boolean | Highlights the plan with "Most popular". Accepts `true`, `"true"`, `1` and `"1"`. |
:::

### `legacy/section/HtmlContent`

| Prop | Type | What it does |
|---|---|---|
| `content` | HTML | Rendered as is (`v-html` / `dangerouslySetInnerHTML`) |

::: warning Trusted HTML
`content` is not sanitized. An admin writes it from the editor, as with the old theme-manager, and only an admin can save it. Do not paste third-party HTML you do not control. React renders nothing when `content` is empty; Vue renders an empty section.
:::

### `legacy/footer/FooterOne`

| Prop | Type | What it does |
|---|---|---|
| `logo` | URL | Brand; without it, `site_name` |
| `description` | Text | Text under the brand |
| `cols` | `[{ title, items: [{ name, link }] }]` | Link columns. A link without `name` is skipped. |
| `newsletter` | `{ title, subtitle, button_text, button_link }` | A call-to-action block with a button. It is not a subscription form. |
| `social_links` | `{ facebook, instagram, twitter, github, youtube, linkedin, tiktok, whatsapp }` | Social icons, in a new tab |

At the bottom: "© `<year>` `<site_name>`. All rights reserved."

### `legacy/cookie-consent/CookieConsentOne`

| Prop | Type | What it does |
|---|---|---|
| `message` | Text | Defaults to "We use cookies to make the site work and to remember your preferences." |
| `accept_text` | Text | Defaults to "Accept" |
| `reject_text` | Text | Defaults to "Reject" |
| `policy_link` | Link | "Learn more" link |

It stores the decision in the `cookie_consent` cookie (`accepted` or `rejected`) for 365 days, with `path=/` and `SameSite=Lax`, and does not show again. Nothing else in the base application reads that cookie: if you load third-party scripts, gate them yourself.

## The example site: `SiteOptionsSeeder`

`database/seeders/SiteOptionsSeeder.php` is yours. `app:install` runs it:

```bash
php artisan db:seed --class="Database\Seeders\SiteOptionsSeeder" --force
```

It creates three options:

| Key | Name | Value |
|---|---|---|
| `site_name` | Nombre del sitio | `config('app.name')` |
| `site_description` | Descripción del sitio | "Una aplicación lista para crecer." |
| `theme` | Páginas del sitio | The five pages below |

The example content is in Spanish:

| Page | Sections |
|---|---|
| `home` (Inicio) | HeaderOne, HeroOne, MissionSection, TestimonialsSection, FaqSection, PartnersSection (with `display: false`), JoinSection, FooterOne, CookieConsentOne |
| `privacy` (Aviso de privacidad) | HeaderOne, HtmlContent, FooterOne |
| `terms` (Términos y condiciones) | HeaderOne, HtmlContent, FooterOne |
| `contact` (Contacto) | HeaderOne, HtmlContent, FooterOne |
| `join` (Únete) | HeaderOne, JoinSection, PlansSection, FaqSection, FooterOne |

It uses `Option::withTrashed()->firstOrCreate(['key' => …])`. It creates what is missing and **does not touch what exists**, even if soft-deleted. It can run on every install without overwriting the admin's changes. The flip side: a page you add to the seeder never reaches an existing `theme`. Add it from the editor.

::: tip Going back to the example site
Delete the `theme` option from the options table permanently (with a soft delete, `firstOrCreate` still finds it) and run the seeder again.
:::

## The site editor

`/admin/site` (route `admin.site`). Admins only: the route carries `admin` in the interface, and the laravel-options policy only lets users that return `true` from `isAdmin()` write.

### What you edit

- **General:** `site_name` and `site_description`.
- **Pages:** one tab per page. First the five contract pages (`home`, `privacy`, `terms`, `contact`, `join`) and then any other page the option already had. Nothing saved is lost when saving again. Tabs can be navigated with the arrow keys, Home and End.
- **Per page:** its title and a "View page" link that opens it in a new tab.
- **Per section:** toggle (`display`), move up, move down, remove, and edit its props as JSON in CodeMirror. Invalid JSON, or JSON that is not an object, is flagged and blocks saving.
- **Add:** a select with every registered section. The new one goes last with `{ "display": true }` and its props editor open.

A section whose key is not in the registry is flagged as unknown. It is kept, but it does not render on the site.

### What "Save" does

1. If there is invalid JSON, it does not save, warns and takes you to the first section with an error.
2. It saves `site_name` if it changed, and `site_description` if it changed. Each is one option and one request.
3. It saves the whole `theme` with `options.save('theme', theme)`. If the option exists, that is laravel-options' update; otherwise its create.
4. It confirms with a toast. On a 422 it shows the validation messages; on any other error, the backend's message.

Everything is edited in a draft: nothing on the site changes until you save.

### Vue and React differences

| | Vue | React |
|---|---|---|
| Tab name | The page title or its key | The translated `sitePages` label or the key |
| Removing a section | Immediate | Asks for confirmation |
| Invalid JSON | Marks on the tab and the section; bottom bar "Fix the invalid JSON to save." | Banner at the top and the parser message under the section |
| Unsaved state | "Unsaved changes" | Not indicated |
| CodeMirror theme | form-elements' | Follows the application's dark mode |
| Update request | `{ option_id, value }` | `{ option_id, name, key, value }` |

Both requests work because in laravel-options `key` is `sometimes` and `name` is `nullable`.
