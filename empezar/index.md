# Qué es el ecosistema

innoboxrr es un conjunto de paquetes para construir aplicaciones **Laravel 13** con una interfaz en **Vue o en React**. No es una plantilla que se copia una vez y se abandona: es una forma de trabajar en la que la estructura de cada modelo la escribe un generador, siempre igual, y tú escribes lo que sólo tú sabes.

La regla que guía todo lo demás:

> **La arquitectura se declara, no se escribe.** Lo que se escribe a mano es la lógica de negocio, y sólo en los huecos que el generador deja para eso.

## El problema que resuelve

Construir muchos modelos, a mano o con una IA, no falla por lentitud. Falla por **deriva**: cada modelo sale un poco distinto del anterior, y a los treinta modelos la aplicación ya no tiene una arquitectura, tiene treinta.

Aquí se describe cada modelo en un JSON pequeño y verificable, `laraimport.json`, y LaraPack genera unas 58 piezas por modelo que salen idénticas cada vez. Encima hay comprobaciones con código de salida que detectan cuándo el código deja de decir lo mismo que el contrato.

## Las tres piezas

| Pieza | Paquete | Qué hace |
|---|---|---|
| **Aplicación base** | `innoboxrr/laravel-setup` | Convierte una aplicación Laravel 13 recién creada en sitio público editable, acceso (registro, login, recuperar contraseña, suplantación) y administrador con menú, notificaciones y perfil. En Vue o en React. |
| **LaraPack** | `innoboxrr/larapack-generator` | Lee `laraimport.json` y genera la API y el módulo de administración de cada modelo. Comprueba que lo generado siga cuadrando con `validate`, `verify` y `audit`. |
| **Paquetes satélite** | `laravel-auth`, `laravel-options`, `laravel-notifications`, `laravel-uploads`… y en npm `innoboxrr-form-core`, `innoboxrr-form-elements`, las tablas… | Autenticación, opciones del sitio, notificaciones, archivos, componentes de formulario, tablas, rutas por nombre, traducciones y validación. Lo que usan la aplicación base y el código generado. |

El usuario de la aplicación base también lo genera LaraPack: tiene la misma arquitectura que cualquier modelo que añadas después.

## Qué obtienes por cada modelo

Del lado de Laravel:

- Migración, modelo con sus traits de relaciones, operaciones, almacenamiento y mutators, y filtros de búsqueda.
- Controlador sin lógica, un request por acción, un Resource con las acciones de cada fila.
- Política que **nace cerrada**: sólo pasa quien administra.
- Eventos y listeners, observer, exportación a Excel que avisa por correo.
- Archivo de rutas con nombre, factory y un test que recorre cada endpoint.

Del lado de la interfaz, en Vue o en React:

- Una tabla con permisos por fila, acciones masivas sobre las filas seleccionadas y edición en la celda.
- Formularios de alta y edición en drawers sobre la tabla, ficha del registro y paleta de comandos con **Ctrl+K**.
- Textos como claves en inglés, con su traducción aparte, y aspecto que sale de variables CSS, sin framework de CSS.

## Cómo se trabaja

```
laraimport.json → larapack:validate → larapack:import → tu lógica en los huecos → larapack:verify + tests
```

1. Decides la forma del dominio: modelos, columnas, relaciones, qué acciones tiene cada tabla.
2. `larapack:validate` dice si el JSON es válido y coherente antes de escribir nada.
3. `larapack:import` genera. Al regenerar, **no pisa lo que editaste a mano**: lo conserva y te avisa.
4. Escribes la lógica de negocio, la autorización y la visibilidad en los huecos.
5. `larapack:verify` y los tests comprueban que todo siga cuadrando.

Tres comprobaciones, las tres con código de salida distinto de cero cuando algo falla:

| Comando | Qué comprueba |
|---|---|
| `larapack:validate` | Que `laraimport.json` es válido y coherente, antes de generar. |
| `larapack:verify` | Que lo generado sigue diciendo lo mismo que el contrato: archivos que faltan, rutas que no se declararon, secretos expuestos. |
| `larapack:audit` | Que un paquete cumple la línea base del ecosistema: versiones, tests y workflows de publicación. |

## Por dónde empezar

| Tu situación | Empieza aquí |
|---|---|
| Vas a empezar una aplicación desde cero | [Una aplicación nueva](/empezar/app-nueva) y después [Tu primer modelo](/empezar/primer-modelo) |
| Quieres una funcionalidad reutilizable en varias aplicaciones | [Un paquete nuevo](/empezar/paquete-nuevo) |
| Ya tienes un paquete o una aplicación Laravel | [En un proyecto existente](/empezar/proyecto-existente) |
| Quieres entender cómo encaja todo antes de instalar | [Cómo encaja todo](/conceptos/) |

Antes de nada, revisa los [requisitos](/empezar/requisitos).

::: tip Si eres un agente de IA
Todo el ciclo está pensado para que lo sigas sin adivinar. `larapack:schema` imprime el esquema del contrato, y `validate`, `import` y `verify` aceptan `--format=json` para que leas qué corregir. `larapack:skill` instala las instrucciones del ecosistema en `.claude/skills/larapack/SKILL.md` (o en `AGENTS.md` con `--path=AGENTS.md`). El detalle está en [Desarrollo con IA](/ia/).
:::

## Lo que no es

- **No es un andamiador que desaparece.** LaraPack sigue en el proyecto: regenera, verifica y audita durante toda la vida del código.
- **No usa un framework de CSS.** Nada generado lleva clases de Tailwind, UIkit o Font Awesome. El aspecto sale de las variables `--fe-*` de `innoboxrr-form-core`, con modo oscuro incluido.
- **No usa Ziggy.** El front pide cada URL por el nombre de la ruta con `innoboxrr-route-resolver`, a partir del `routes.json` que exporta `php artisan route:json`.
- **No decide tu dominio ni tus permisos.** Las políticas nacen cerradas precisamente para que abrirlas sea una decisión tuya.
