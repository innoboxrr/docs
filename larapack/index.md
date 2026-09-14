# Qué es LaraPack

`innoboxrr/larapack-generator` genera y mantiene la arquitectura de una API Laravel 13, y su interfaz en Vue o en React, a partir de un archivo declarativo: `laraimport.json`. Es la pieza central del ecosistema: la aplicación base genera su usuario con él, cada paquete propio sale de él, y su línea base (`ecosystem.json`) es la que audita la CI de todos.

No es un andamiador que arranca un proyecto y desaparece. Genera siempre lo mismo a partir del mismo contrato, conserva lo que escribes a mano y comprueba que lo generado siga diciendo lo que dice el contrato.

## El problema que resuelve

Construir muchos modelos, a mano o con una IA, no falla por lentitud. Falla por **deriva**: cada modelo sale un poco distinto del anterior, y a los treinta modelos la aplicación ya no tiene una arquitectura, tiene treinta.

LaraPack invierte esa dinámica. Escribes un JSON pequeño y verificable, y las unas 58 piezas de cada modelo salen idénticas siempre: migración, modelo, traits, filtros, controlador, requests, política, recurso, eventos, exportación, rutas, factory, test y el módulo de interfaz.

## La regla

> **La arquitectura se declara, no se escribe.** Lo que sí se escribe a mano es la lógica de negocio, y sólo en los huecos que el generador deja para eso.

Si falta un endpoint, un campo o una pantalla, falta en el `laraimport.json` o en el generador, no en el archivo generado. Escribirlo a mano es justo la deriva que `larapack:verify` señala.

## Tres comprobaciones con código de salida

| Comando | Qué comprueba | Cuándo |
|---|---|---|
| `larapack:validate` | Que `laraimport.json` es válido contra el esquema y coherente como documento. | Antes de generar. `larapack:import` ejecuta la misma validación y no escribe nada si falla. |
| `larapack:verify` | Que lo generado sigue en su sitio y dice lo mismo que el contrato. | Después de generar y de escribir la lógica, y en la CI. |
| `larapack:audit` | Que el paquete cumple la línea base del ecosistema: versiones, tests y workflows de publicación. | En la CI de cada paquete, antes de publicar. |

Las tres salen con código distinto de cero cuando algo falla, y con `--format=json` escriben un único documento JSON. Por eso un agente puede iterar sin preguntar: ver [El ciclo del agente](/ia/ciclo).

## El reparto del trabajo

| Qué | Quién lo decide o lo escribe | Dónde |
|---|---|---|
| La forma del dominio: modelos, columnas, relaciones, qué acciones tiene cada tabla, qué es secreto o inmutable | Una persona, o un agente con la revisión de una persona | `laraimport.json` |
| La estructura: las piezas de cada modelo, en PHP y en la interfaz | El generador | Todo lo generado |
| La lógica de negocio, la autorización y la visibilidad | Una persona o un agente | Los [huecos](/larapack/que-se-genera#donde-va-tu-codigo) |
| Que todo siga cuadrando | Las herramientas y la CI | `validate`, `verify`, `audit`, los tests, Pint y Larastan |
| Qué se publica y cuándo | Una persona | `VERSION` y `CHANGELOG.md` |

El `laraimport.json` es la decisión de arquitectura. Por eso es lo primero que se revisa en un cambio: si el JSON está bien, lo generado está bien por construcción. Lo que revisa una persona, y en qué orden, está en [Qué revisa una persona](/ia/revisar).

## Instalar

```bash
composer require --dev innoboxrr/larapack-generator
```

El código generado no depende de LaraPack en ejecución: usa `innoboxrr/traits`, `innoboxrr/support` e `innoboxrr/search-surge`. Por eso va en `require-dev`, que es donde lo dejan `larapack:new` y la aplicación base.

Requisitos: PHP `^8.3`, `illuminate/support` `^13.0` y `symfony/console` `^7.4 || ^8.0`. El resto del entorno está en [Requisitos](/empezar/requisitos).

## Cómo se invoca

Los comandos viven en el espacio `larapack:` y se ejecutan de dos formas:

```bash
php artisan larapack:import --vue              # dentro de una aplicación Laravel
php vendor/bin/builder larapack:import --vue   # el binario, también fuera de Laravel
```

- **`php artisan`** los tiene porque LaraPack declara `GeneratorServiceProvider` para el descubrimiento de paquetes de Laravel. Es lo normal dentro de una aplicación.
- **`php vendor/bin/builder`** es un binario de Symfony Console que no arranca Laravel. Es el que se usa dentro de un paquete, que no tiene `artisan`.

Las clases de comando son las mismas en los dos casos, así que las opciones y la salida son idénticas.

### Los nombres antiguos

El binario registra además los nombres anteriores a la 6.0 como alias: cada `larapack:<comando>` responde también como `make:<comando>`, salvo `larapack:import`, que responde como `json:importer`, y `larapack:remove-full-model`, como `remove:full-model`.

Artisan no los registra, porque `make:model`, `make:policy`, `make:factory` y `make:observer` son comandos del propio Laravel. En scripts y en la CI usa siempre `larapack:`.

## Sobre qué proyecto trabaja: `--root` {#root}

Todo lo que LaraPack escribe o lee es relativo a la raíz del proyecto. Sin `--root`, la raíz se descubre subiendo directorios desde la carpeta del propio LaraPack hasta dar con un `vendor/autoload.php`:

- instalado en el `vendor/` de una aplicación o de un paquete, da la raíz de ese proyecto;
- con el binario sobre un clon del propio generador, da el generador.

Con `--root=<ruta>` la raíz se fija de forma explícita. Una ruta que no existe es un error («La raíz indicada no existe») y el comando no escribe nada: es lo que necesita un agente para no generar en el sitio equivocado.

```bash
php vendor/bin/builder larapack:import --root=packages/catalogo --vue
```

::: warning No todos los comandos tienen `--root`
`larapack:new` crea el proyecto en el directorio que recibe como argumento, `larapack:schema` no depende de ningún proyecto y `larapack:audit` recibe la ruta como argumento (`larapack:audit packages --all`). Qué opciones tiene cada comando está en [Comandos](/larapack/comandos#opciones-comunes).
:::

La raíz decide también el **modo**, por el `type` de su `composer.json`: `library`, o sin `type`, es un paquete y se genera en `src/`; cualquier otro valor, como el `project` de Laravel, es una aplicación y se genera en `app/`. Las diferencias están en [Paquete o aplicación](/conceptos/paquete-o-aplicacion).

## El flujo

```text
0. larapack:new vendor/paquete          sólo si el paquete aún no existe
1. larapack:schema                      el contrato se lee, no se adivina
2. editar laraimport.json
3. larapack:validate --vue              falla → se corrige el JSON, no el código
4. larapack:import --vue --dry-run      qué va a tocar
5. larapack:import --vue                genera; con --force, regenera
6. escribir la lógica en los huecos
7. larapack:verify                      falla → algo se salió del contrato
8. vendor/bin/phpunit                   el comportamiento
```

Los pasos para empezar un proyecto están en [Un paquete nuevo](/empezar/paquete-nuevo), [Una aplicación nueva](/empezar/app-nueva) y [En un proyecto existente](/empezar/proyecto-existente).

## En esta sección

| Página | Para qué |
|---|---|
| [El contrato: laraimport.json](/larapack/laraimport) | Cada clave, con su tipo, su valor por defecto y su efecto, y los errores y avisos de la validación. |
| [Comandos](/larapack/comandos) | Cada comando con sus opciones reales, sus códigos de salida y su salida JSON. |
| [Qué se genera y dónde va tu código](/larapack/que-se-genera) | El mapa de archivos, los huecos, lo que no se toca y lo que nunca se reescribe. |
| [Regenerar sin destruir](/larapack/regenerar) | El manifiesto, `--force`, `--dry-run` y el formato con Pint. |
| [Verificar y auditar](/larapack/verificar) | Las comprobaciones de `verify` y de `audit`, y la línea base. |
| [Metas y payload](/larapack/metas) | Datos flexibles sin columna, de punta a punta. |
| [Rutas, inmutables, secretos y usuarios](/larapack/acciones) | Las doce acciones, `routes`, `immutable`, `secret`, `authenticatable`, `display`, las acciones masivas y la edición en la celda. |
| [La interfaz generada](/larapack/interfaz) | El módulo Vue y React: vistas, tabla, contrato del modelo, textos y tema. |
| [Montar un paquete en una aplicación](/larapack/montar-en-aplicacion) | Lo que pone la aplicación anfitriona. |
| [Exportar a Excel](/larapack/exportar) | La exportación, su configuración y su notificación. |
| [Migraciones y cambios de esquema](/larapack/migraciones) | Creación, metas, pivotes y alteraciones. |
| [Guía de actualización](/larapack/actualizar) | Qué hacer al subir de versión. |
