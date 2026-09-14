# Versiones y compatibilidad

Las versiones actuales de cada paquete del ecosistema, lo que pide cada uno, y dónde
está su guía de actualización.

## Qué versión tienes

```bash
composer show "innoboxrr/*"
npm ls --depth=0 | grep innoboxrr
```

## La matriz de compatibilidad

| | Aplicación (la base y los módulos generados dentro) | Paquete PHP del ecosistema | Paquete npm del ecosistema |
|---|---|---|---|
| **PHP** | 8.3 o superior | `^8.3`; la CI prueba 8.3 y 8.4 (LaraPack, también 8.5) | — |
| **Laravel** | 13 | `illuminate/*` `^13.0`, Testbench `^11.0` | — |
| **PHPUnit** | — | `^12.0 \|\| ^13.0` en los paquetes nuevos | — |
| **Node** | 20 o superior, con npm 10 | — | `engines.node` `>=20`; la CI prueba 20, 22 y 24; se publica con Node 22 y el npm más reciente |
| **Vite** | `^8`, con `@vitejs/plugin-vue ^6` o `@vitejs/plugin-react ^6` | El módulo de un paquete, también `^8` | `^7.1` |
| **Vitest** | — | — | `^3.0` |
| **Vue** | `vue ^3.5`, `vue-router ^4.5`, `pinia ^3` | — | `vue ^3.5` como peer |
| **React** | `react ^19`, `react-router-dom ^7`, `zustand ^5` | — | `react ^19` como peer |
| **Sanctum y Excel** | `laravel/sanctum ^4.3`, `maatwebsite/excel ^4.0` | Los mismos, en el `require` que escribe `larapack:new` | — |
| **axios** | `^1.7` | — | — |

::: info Nota
Los paquetes npm prueban con **Vite 7 y Vitest 3** mientras las aplicaciones usan
**Vite 8**: Vitest 4 con Vite 8.3 no se instala con npm 10, el de Node 20 y 22. Ver
[Los workflows](/ci/workflows#por-que-los-satelites-siguen-en-vite-7-y-vitest-3).
:::

La fuente de verdad de estas versiones es `ecosystem.json`, dentro de LaraPack. Ver
[La línea base](/ci/).

## Paquetes de Laravel

| Paquete | Versión | Pide | Actualizar |
|---|---|---|---|
| `innoboxrr/larapack-generator` | 7.10.3 | PHP `^8.3`, `illuminate/support ^13.0`, `symfony/console ^7.4 \|\| ^8.0` | [Guía de actualización](/larapack/actualizar) |
| `innoboxrr/laravel-setup` | 7.0.1 | PHP `^8.3`, `laravel/framework ^13.0`, LaraPack `^7.10` con `conflict <7.10.2`; instala laravel-auth `^6.1.0` | Sin migración desde la 6.x: la 7 es para aplicaciones nuevas ([Aplicación base](/app-base/)) |
| `innoboxrr/laravel-auth` | 6.1.0 | PHP `^8.3`, `illuminate/support ^13.0` | [De 6.0 a 6.1 y de 5.x a 6.0](/paquetes/laravel-auth) |
| `innoboxrr/laravel-options` | 2.1.0 | PHP `^8.3`, `illuminate/support ^13.0`, search-surge `^3.0`, traits `^2.1` | [laravel-options](/paquetes/laravel-options) |
| `innoboxrr/laravel-notifications` | 2.1.0 | PHP `^8.3`, `laravel/framework ^13.0` | [laravel-notifications](/paquetes/laravel-notifications) |
| `innoboxrr/laravel-uploads` | 2.1.1 | PHP `^8.3`, `illuminate/support ^13.0`, traits `^2.1` | [laravel-uploads](/paquetes/laravel-uploads) |
| `innoboxrr/laravel-audit` | 2.1.1 | PHP `^8.3`, `illuminate/support ^13.0`, search-surge `^3.0`, traits `^2.1` | [laravel-audit](/paquetes/laravel-audit) |
| `innoboxrr/laravel-env-editor` | 2.1.1 | PHP `^8.3`, `laravel/framework ^13.0` | [laravel-env-editor](/paquetes/laravel-env-editor) |
| `innoboxrr/aws-file-manager` | 2.0.0 | PHP `^8.3`, `laravel/framework ^13.0` | [aws-file-manager](/paquetes/aws-file-manager) |
| `innoboxrr/locale-generator` | 2.1.0 | PHP `^8.3`, `illuminate/support ^13.0` | [locale-generator](/paquetes/locale-generator) |
| `innoboxrr/routes-to-json` | 2.1.0 | PHP `^8.3`, `illuminate/support ^13.0` | [routes-to-json](/paquetes/routes-to-json) |
| `innoboxrr/support` | 2.1.1 | PHP `^8.3`, `illuminate/support ^13.0` | [support, traits y search-surge](/paquetes/support-traits-search) |
| `innoboxrr/traits` | 2.1.0 | PHP `^8.2`, `illuminate/* ^12.0 \|\| ^13.0` | [support, traits y search-surge](/paquetes/support-traits-search) |
| `innoboxrr/search-surge` | 3.0.3 | PHP `^8.2`, `illuminate/* ^12.0 \|\| ^13.0` | [De v2 a v3](/paquetes/support-traits-search) |

`traits` y `search-surge` admiten también PHP 8.2 y Laravel 12: son restricciones
anchas, legítimas, que su propia CI cubre. Para un paquete sin guía, las notas de
cada versión están en el `CHANGELOG.md` de su repositorio.

## Paquetes de interfaz

Todos declaran `engines.node >=20`.

| Paquete | Versión | Peers | Actualizar |
|---|---|---|---|
| `innoboxrr-form-core` | 2.8.0 | — | [form-core](/interfaz/form-core) |
| `innoboxrr-form-elements` | 6.8.0 | `vue ^3.5.0`, `sortablejs ^1.14.0`, `lightvue` | [Componentes de formulario](/interfaz/form-elements) |
| `innoboxrr-react-form-elements` | 3.8.0 | `react ^19.0.0`, `react-dom ^19.0.0` | [Componentes de formulario](/interfaz/form-elements) |
| `innoboxrr-vue-datatable` | 3.1.1 | `vue ^3.5.0`, `vue-router ^4.5.0`, `innoboxrr-form-core ^2.6.0`, `innoboxrr-form-elements ^6.4.0` | [De 2.x a 3.0](/interfaz/datatables) |
| `innoboxrr-react-datatable` | 3.1.1 | `react ^19.0.0`, `react-dom ^19.0.0`, `react-router-dom ^7.0.0`, `innoboxrr-form-core ^2.6.0`, `innoboxrr-react-form-elements ^3.4.0` | [De 2.x a 3.0](/interfaz/datatables) |
| `innoboxrr-http-request` | 2.0.0 | `vue ^3.5.0` | [Peticiones, rutas e idiomas](/interfaz/http-rutas-i18n) |
| `innoboxrr-route-resolver` | 2.0.0 | — | [Peticiones, rutas e idiomas](/interfaz/http-rutas-i18n) |
| `innoboxrr-i18n` | 1.2.0 | — | [Peticiones, rutas e idiomas](/interfaz/http-rutas-i18n) |
| `innoboxrr-js-validator` | 2.0.1 | — | [Validación](/interfaz/js-validator) |
| `innoboxrr-locale-generator` | 2.0.0 | — | — |
| `innoboxrr-fab` | 1.1.0 | `vue ^3.5.0` | — |
| `innoboxrr-multipart-uploader` | 4.0.0 | — | — |
| `innoboxrr-vue-utils` | 1.2.0 | — | — |
| `innoboxrr-js-libs` | 3.0.1 | — | — |
| `innoboxrr-maskjs` | 2.0.0 | `react ^18.0.0 \|\| ^19.0.0`, `vue ^3.5.0` | — |

Un módulo generado declara las versiones de `internalNpm` de `ecosystem.json`
(`innoboxrr-form-elements ^6.7.0`, `innoboxrr-vue-datatable ^3.1.0`…). Son mínimos: con
`^` instalan también las versiones de esta tabla.

## Lo último que cambió

| Versión | Qué cambia | Qué hacer |
|---|---|---|
| LaraPack 7.10.3 | Con `--format=json`, todos los comandos imprimen sólo el documento JSON, también `larapack:import` y también al fallar. El `models/<kebab>/index.js` generado ya no manda `_token` en las peticiones GET | Actualizar; ver la [guía de actualización](/larapack/actualizar) |
| `innoboxrr-vue-datatable` y `innoboxrr-react-datatable` 3.1.1 | Las peticiones GET no llevan el token CSRF en la query | Nada |
| `innoboxrr-js-validator` 2.0.1 | Los mensajes de error se insertan como texto, no como HTML | Si un mensaje llevaba HTML, ahora se ve literal |
| `innoboxrr/laravel-auth` 6.1.0 | Volver de una suplantación sólo acepta POST con token CSRF; un GET responde 405 | Cambiar cada llamada a POST (ver [Solución de problemas](/ayuda/#volver-a-mi-cuenta-responde-405)) |
| `innoboxrr/laravel-setup` 7.0.1 | Las interfaces vuelven de la suplantación con POST, y la aplicación pide laravel-auth `^6.1.0` | En una aplicación creada con la 7.0.0, cambiar a mano el store de sesión |
| `innoboxrr-form-elements` 6.8.0 | `CodeMirrorComponent` carga el lenguaje bajo demanda, sigue el tema de la aplicación (`theme` `auto`) y ya no se lleva el foco al montarse (`autofocus` `false`) | Pasar `autofocus` si dependías del foco; `theme="dark"` recupera el aspecto anterior |
| `innoboxrr-react-form-elements` 3.8.0 | `CodeMirrorComponent` carga el lenguaje bajo demanda | Nada |

## Guías de actualización

- **LaraPack:** [Guía de actualización](/larapack/actualizar), con una sección por versión
  desde la 5.x y el procedimiento general.
- **laravel-auth:** de 5.x a 6.0 y de 6.0 a 6.1, en [laravel-auth](/paquetes/laravel-auth).
- **search-surge:** de v2 a v3, en [support, traits y search-surge](/paquetes/support-traits-search).
- **Datatables:** de 2.x a 3.0, en [Tablas](/interfaz/datatables).
- **laravel-setup:** no hay migración desde la 6.x. La 7 es para aplicaciones nuevas:
  [Instalar](/app-base/instalar).
- **El resto:** el `CHANGELOG.md` de cada repositorio. `innoboxrr/traits` todavía no
  tiene uno.
