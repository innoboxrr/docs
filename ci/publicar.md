# Publicar una versión

En el ecosistema, **la versión se declara y el tag se deriva**. Una persona sube
`VERSION` (o la `version` de `package.json`), empuja, y si los tests pasan la CI crea
el tag y el registro publica.

## Por qué así

Antes, un `bump-patch.yml` copiado en 22 repositorios autoincrementaba un tag en cada
push a `master` **sin correr un solo test**. Además leía la última versión con
`git tag --sort=creatordate`, que ordena por fecha y no por semver, y bastaba un
`#major` mencionado de pasada en un mensaje de commit para publicar una versión mayor
sin quererlo.

Con el modelo actual:

- **La versión es una decisión explícita**, en un archivo que se revisa en el diff.
- **Los tests son la puerta:** un push con un test roto no publica nada.
- **Un tag que ya existe no se vuelve a crear:** empujar sin tocar la versión no
  publica nada, y una versión publicada no se sobrescribe.

## Paquetes PHP

1. Haz el cambio y comprueba en local (ver la [lista](#lista-de-comprobacion)).
2. Sube `VERSION` según semver y describe el cambio en `CHANGELOG.md`.
3. Empuja a `master` (o `main`).
4. `Tests` corre la suite, la auditoría y los trabajos del repositorio.
5. Si pasa, `Release` lee `VERSION` y crea el tag **sin prefijo `v`** (`2.1.1`).
6. Packagist publica al recibir el tag.

```bash
cat VERSION                          # 2.1.1
git push origin master
gh run watch                         # sigue la ejecución en curso
git ls-remote --tags origin 2.1.1    # el tag existe
composer show --all innoboxrr/support | grep versions
```

El `release.yml` de cada repositorio:

```yaml
name: Release

on:
    workflow_run:
        workflows: ['Tests']
        types: [completed]
        branches: [main, master]
    workflow_dispatch:

jobs:
    release:
        permissions:
            contents: write

        uses: innoboxrr/.github/.github/workflows/php-release.yml@main
```

::: danger Peligro
Sin `permissions: contents: write` en ese archivo, un repositorio con el permiso por
defecto en sólo lectura no arranca el workflow: `startup_failure`, sin log.
:::

::: warning Atención
**Lanzar `Release` a mano (`workflow_dispatch`) se salta la puerta de los tests:** el
job corre aunque `Tests` esté en rojo. Úsalo sólo para reintentar un release cuyo
`Tests` ya pasó.
:::

**No pongas `"version"` en `composer.json`.** Composer descarta cada tag que no
coincide con ella, así que la versión nueva quedaría invisible. `larapack:audit` lo
marca como error (`composer-version`).

## Paquetes npm

1. Sube `version` en `package.json` y describe el cambio en `CHANGELOG.md`.
2. Empuja a `master`.
3. `Tests` corre la matriz de Node.
4. Si pasa, `Release` actualiza npm, vuelve a instalar y probar, **publica** con
   provenance y después crea el tag `v<versión>` (`v3.1.1`).

```bash
node -p "require('./package.json').version"
git push origin master
gh run watch
npm view innoboxrr-vue-datatable version
```

### Trusted publishing (OIDC)

La publicación no usa ningún token: npm confía en el repositorio y en su workflow.

Una vez por paquete, en npmjs.com → el paquete → **Settings → Trusted Publisher**:
GitHub Actions, con el repositorio, el workflow `release.yml` y el permiso de
publicar. El job necesita `id-token: write`, y `node-release.yml` ya lo declara.

::: danger Peligro
**No pases `NODE_AUTH_TOKEN` ni `NPM_TOKEN`.** Cuando npm ve un token se autentica con
él **en lugar de** usar OIDC, y la publicación acaba pidiendo un código de dos factores
que en la CI no hay quien teclee: la provenance se firma bien y el publish falla justo
después.
:::

- **Un paquete nuevo** necesita que su dueño configure el trusted publisher en
  npmjs.com antes de que la CI pueda publicarlo.
- **El npm tiene que ser reciente.** El de Node 22 es anterior al soporte de OIDC; por
  eso `node-release.yml` ejecuta `npm install -g npm@latest` antes de publicar.
- **El registro puede tardar** en listar la versión nueva aunque el log muestre el
  publish con provenance. Comprueba el log y el tag antes de volver a publicar.

::: info Nota
Los `release.yml` npm del ecosistema no declaran `permissions`: los declara el
reutilizable. Si un repositorio tiene el permiso por defecto del token en sólo lectura,
pasa lo mismo que en PHP. En ese caso, declara en el job que llama `contents: write` e
`id-token: write`.
:::

## Convenciones de commits

- **En español, y explicando por qué**, no qué hace el diff:
  «No mandar el token CSRF en la query de las peticiones GET».
- **Uno por cambio conceptual.** Un cambio de `laraimport.json` y su regeneración van
  juntos; la lógica de negocio que se escribe después, en otro.
- **`.larapack/manifest.json` se versiona** con el código que describe.
- **La versión se publica con su propio commit**, que sube `VERSION` y el
  `CHANGELOG`: «Publicar la 6.1.0: volver de una suplantación es un POST con token
  CSRF». También puede ir en el mismo commit que el cambio; lo que cuenta es que
  nada se publica hasta que cambia la versión.
- **Se empuja a `master`**: la puerta son los tests, no una rama de release.
- **Sin líneas de atribución de un agente** (`Co-Authored-By` de una IA) en los
  repositorios del ecosistema.

## CHANGELOG

Cada versión cuenta **qué cambió, por qué, y qué tiene que hacer quien actualice**. El
formato de LaraPack:

```md
## 7.10.2

Lo que encontró el piloto de la aplicación base al exportar dentro de una
aplicación, y un aviso falso en cada importación. Lo que se genera en un paquete
no cambia.

- **La exportación renderiza en una aplicación.** Pedía su vista como
  `app::excel.<modelo>` con `config('app.excel_view')`: nadie registra las vistas
  `app::` y cada exportación fallaba con "No hint path defined for [app]". Ahora
  pide `excel.<modelo>`, la vista que genera en `resources/views/excel`.

### Para proyectos existentes

Una aplicación generada con 7.10.0 o 7.10.1 tiene que regenerar con `--force` los
archivos de exportación de `app/Exports` y `app/Notifications`. Un paquete no tiene
que hacer nada.
```

- Un encabezado `## X.Y.Z` por versión, la más nueva arriba.
- Un párrafo de contexto y viñetas que empiezan con el cambio en negrita y siguen con el
  porqué.
- **`### Para proyectos existentes`** cuando hay algo que hacer. Si son muchos pasos,
  van en la guía de actualización del README («De 7.10.1 a 7.10.2») y el CHANGELOG
  la enlaza.

Algunos paquetes, como `laravel-auth`, usan el formato Keep a Changelog, con fecha y
secciones como «Security» o «Cambio incompatible». Vale igual: lo que no puede faltar
es el porqué y lo que tiene que hacer quien actualiza.

## Lista de comprobación

### Paquete PHP

1. El árbol está limpio y al día con `origin/master`.
2. `vendor/bin/phpunit` pasa. En Windows sin SQLite:
   `php -d extension=pdo_sqlite -d extension=sqlite3 vendor/bin/phpunit`.
3. Si usa LaraPack: `php vendor/bin/builder larapack:verify` sin errores.
4. `php vendor/innoboxrr/larapack-generator/builder larapack:audit .` sin errores. Si
   necesitas un mínimo por encima de la línea base, usa
   [`conflict`](/ci/#pedir-un-minimo-por-encima-de-la-linea-base-conflict).
5. Si tiene el trabajo `quality`: `vendor/bin/pint --test` y
   `vendor/bin/phpstan analyse`.
6. Si tiene pruebas de interfaz: `npm install` y `npx vitest run` en cada
   `tests/Frontend/<ui>`.
7. `VERSION` subida según semver, y ninguna `version` en `composer.json`.
8. `CHANGELOG.md` con el porqué y, si hace falta, «Para proyectos existentes»; la guía
   de actualización del README, si hay pasos.
9. Empujado. `Tests` y `Release` en verde, el tag existe y Packagist lo lista.
10. Los paquetes que dependan de esta versión nueva actualizan su `require` o su
    `conflict` **después** de que exista el tag.

### Paquete npm

1. `npm install` y `npm test` pasan, a ser posible con npm 10 (Node 20 o 22), que es el
   de la CI.
2. `version` subida en `package.json`; `engines.node` es `>=20`; están `name`,
   `license`, `type`, `exports`, `files` y `sideEffects`.
3. `CHANGELOG.md` actualizado.
4. Trusted publisher configurado en npmjs.com (imprescindible en un paquete nuevo), y
   ningún `NODE_AUTH_TOKEN` en el workflow ni en los secretos que recibe.
5. Empujado. `Tests` y `Release` en verde, y existe el tag `v<versión>`.
6. `npm view <paquete> version` muestra la nueva; puede tardar.
7. Si los módulos generados tienen que pedir la versión nueva, se actualiza
   `internalNpm` en `ecosystem.json` y se publica LaraPack.
