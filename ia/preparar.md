# Preparar el proyecto

Un agente sólo sigue el flujo de LaraPack si lo conoce. Las instrucciones viven
dentro de LaraPack, en `skill/SKILL.md`, y se copian al proyecto donde el agente sí
las lee. Antes de eso, conviene elegir bien el punto de partida.

## Elegir el punto de partida

| Vas a… | Empieza con | Qué te ahorra |
|---|---|---|
| Crear una aplicación | La [aplicación base](/app-base/) (`innoboxrr/laravel-setup`) | Sesión, sitio, administrador, el usuario generado y todo lo que el módulo generado espera de la aplicación |
| Crear un paquete | `larapack:new` | `composer.json` en la línea base, proveedores, tests, workflows, `AGENTS.md` y la skill instalada |
| Trabajar en un proyecto que ya existe | `composer require` de LaraPack y `larapack:skill` | Nada de lo anterior: revisa [En un proyecto existente](/empezar/proyecto-existente) |

### Una aplicación nueva: la aplicación base

Es el mejor punto de partida para un agente, porque le quita el trabajo que peor
hace: pegar piezas. En la aplicación base ya están resueltos `statefulApi()`,
`JsonResource::withoutWrapping()`, los proveedores registrados en
`bootstrap/providers.php`, los avisos y la confirmación montados, las traducciones
del módulo cargadas y el menú que se construye solo con las rutas de cada modelo.
El usuario ya está declarado en `laraimport.json` con `authenticatable`, así que
el agente añade modelos al mismo archivo y aparecen en el menú.

::: code-group

```bash [Vue]
composer create-project laravel/laravel mi-app
cd mi-app
# configura la base de datos y APP_URL en .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup
git diff                      # revisa lo que escribió
# pon tu correo en ADMIN_EMAILS del .env

php artisan app:install
php artisan larapack:skill
composer run dev
```

```bash [React]
composer create-project laravel/laravel mi-app
cd mi-app
# configura la base de datos y APP_URL en .env

composer require --dev innoboxrr/laravel-setup
php artisan app:setup --react
git diff                      # revisa lo que escribió
# pon tu correo en ADMIN_EMAILS del .env

php artisan app:install
php artisan larapack:skill
composer run dev
```

:::

::: warning Atención
**`APP_URL` tiene que ser la dirección con la que abres la aplicación, con su
puerto.** Sanctum sólo acepta la cookie de sesión desde los dominios de
`SANCTUM_STATEFUL_DOMAINS`; con otra dirección el login funciona, pero cada tabla
del administrador responde 401. Es lo primero que un agente diagnostica mal.
:::

`app:setup` sólo trabaja sobre una aplicación recién creada (sin `--force`, se
niega) y **no instala nada**: escribe `composer.json`, `package.json`, la
configuración, las pantallas y el usuario. `app:install` actualiza las
dependencias, migra, siembra el sitio de ejemplo, exporta `routes.json` y compila.
`larapack:skill` va después de `app:install`, porque LaraPack llega a `vendor/`
con ese `composer update`. Los detalles están en [Instalar](/app-base/instalar).

Añadir un modelo a la aplicación base es siempre lo mismo:

```bash
php artisan larapack:validate laraimport.json --vue
php artisan larapack:import laraimport.json --vue
php artisan migrate
php artisan route:json
npm run build
```

(con `--react` en una aplicación React). Para que sólo lo vean los
administradores, añade su ruta a `adminOnly`: el nombre de la ruta en Vue, su id
en React. Ver [Personalizar y ampliar](/app-base/personalizar).

### Un paquete nuevo: `larapack:new`

```bash
php vendor/bin/builder larapack:new acme/catalogo packages/catalogo
cd packages/catalogo
composer install
```

`php vendor/bin/builder` es el binario de una instalación de LaraPack que ya
exista, por ejemplo la de la aplicación donde vas a usar el paquete. Dentro de
una aplicación Laravel también vale `php artisan larapack:new`.

`larapack:new` deja al agente todo lo que necesita:

- `.claude/skills/larapack/SKILL.md`, la skill ya instalada;
- `AGENTS.md`, que apunta a la skill para los agentes que no son Claude Code;
- `composer.json` con las versiones de la [línea base](/ci/), LaraPack en
  `require-dev`, y `phpunit.xml.dist` con un primer test;
- `tests.yml` y `release.yml`, `pint.json`, `phpstan.neon.dist`, `VERSION` en
  0.1.0 y `CHANGELOG.md`.

No trabaja sobre un directorio que ya tenga `composer.json`, y
`larapack:new acme/catalogo --dry-run` dice exactamente lo que crearía. El
`.gitattributes` que genera marca `.claude` y `AGENTS.md` como `export-ignore`:
las instrucciones del agente no viajan a quien instala el paquete.

### Un proyecto que ya existe

```bash
composer require --dev innoboxrr/larapack-generator
```

En un paquete que no creó `larapack:new`, una vez:

```bash
php vendor/bin/builder larapack:providers   # App, Auth, Event y Route
php vendor/bin/builder larapack:config
```

Después alinea las versiones con `larapack:audit` y copia los workflows de un
paquete recién creado (`larapack:new vendor/x --dry-run` en un directorio vacío
dice cuáles son). En una aplicación, lee antes
[Paquete o aplicación](/conceptos/paquete-o-aplicacion): los proveedores se
registran a mano en `bootstrap/providers.php`.

::: info Nota
El README de LaraPack muestra `composer require innoboxrr/larapack-generator` sin
`--dev`. `larapack:new` y la aplicación base lo ponen en `require-dev`, que es lo
coherente: el código generado no depende de LaraPack para funcionar.
:::

## Instalar la skill

```bash
php vendor/bin/builder larapack:skill                  # -> .claude/skills/larapack/SKILL.md
php vendor/bin/builder larapack:skill --path=AGENTS.md # para agentes que leen AGENTS.md
php vendor/bin/builder larapack:skill --print          # por salida estándar
php vendor/bin/builder larapack:skill --source         # ruta del original dentro de vendor/
php vendor/bin/builder larapack:skill --force          # sobrescribe el destino
```

Dentro de una aplicación, lo mismo con `php artisan larapack:skill`.

| Opción | Qué hace |
|---|---|
| `--path=RUTA` | Destino, relativo a la raíz del proyecto. Por omisión `.claude/skills/larapack/SKILL.md`. |
| `--print` | Escribe la skill por salida estándar y no instala nada. |
| `--source` | Imprime sólo la ruta del original dentro del paquete. |
| `--force` | Sobrescribe el destino aunque exista y sea distinto. |
| `--root=RUTA` | Proyecto sobre el que se instala, si no es el que se descubre. |

**Por qué una copia.** Un paquete dentro de `vendor/` no lo lee ningún agente: ni
Claude Code ni Codex miran ahí. Y como el original vive en LaraPack, actualizar el
generador trae instrucciones nuevas; basta con volver a copiarlas.

### Claude Code

Claude Code carga sola la skill de `.claude/skills/larapack/` cuando la tarea toca
modelos, endpoints, formularios o vistas. La descripción de la skill le dice que
la use antes de escribir a mano cualquier controlador, request, política,
migración o módulo de interfaz.

### Codex y otros agentes

Leen `AGENTS.md`. Hay dos formas de dárselo:

- **Un `AGENTS.md` corto que apunta a la skill.** Es lo que crea `larapack:new`:

  ````md
  # Instrucciones para agentes

  La arquitectura de este paquete la genera LaraPack. Antes de crear o cambiar un
  modelo, un endpoint, una request, una política, una migración o una vista, lee
  `.claude/skills/larapack/SKILL.md` y sigue su flujo: se declara en
  `laraimport.json` y se genera, no se escribe a mano.

  Si ese archivo falta, o LaraPack se actualizó:

  ```
  php vendor/bin/builder larapack:skill --force
  ```
  ````

- **La skill entera en `AGENTS.md`**, con `larapack:skill --path=AGENTS.md`.

::: warning Atención
En un paquete creado con `larapack:new`, `AGENTS.md` ya existe. Sin `--force`,
`--path=AGENTS.md` no lo toca; con `--force` sustituye el puntero —y cualquier
regla del proyecto que hubieras añadido— por la skill completa.
:::

### Después de actualizar LaraPack

Las instrucciones viajan con la versión del generador. Tras cada actualización:

```bash
php vendor/bin/builder larapack:skill --force
```

Sin `--force`, un destino que difiere del paquete no se pisa, para no perder
reglas del proyecto que se hayan añadido a la copia. En ese caso el comando dice
«Ya existe y difiere del paquete» y **sale con código 0**: no falla. Para ver qué
cambió antes de sobrescribir:

```bash
git diff --no-index .claude/skills/larapack/SKILL.md "$(php vendor/bin/builder larapack:skill --source)"
```

::: tip Consejo
Si añadiste reglas propias a la copia de la skill, llévalas a otro archivo antes
de usar `--force`. Así actualizar LaraPack no las borra.
:::

## Comprobar que el proyecto está listo

Antes de pedirle nada al agente:

1. **`.larapack/manifest.json` está versionado.** Sin él, el generador no distingue
   tu código del suyo y se vuelve conservador con todo.
2. **`laraimport.json` valida:** `larapack:validate --vue` (o `--react`). En la
   aplicación base ya trae el usuario.
3. **`larapack:verify` sale en verde.** En un proyecto donde todavía no se generó
   nada avisa con `empty-manifest`.
4. **Pint está en el proyecto** (`composer require --dev laravel/pint`). Sin él,
   lo generado queda sin formatear: la importación lo avisa en texto, y en JSON
   `formatted` vale `null`.
5. **La suite pasa:** `vendor/bin/phpunit`.
6. **En un paquete, `larapack:audit` no tiene errores.**

Con eso, el agente parte de verde y cualquier rojo que aparezca es suyo. Sigue en
[El ciclo del agente](/ia/ciclo).
