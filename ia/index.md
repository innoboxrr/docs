# Por qué funciona

LaraPack está pensado para trabajar con un agente —Claude Code, Codex u otro— sin
que la arquitectura se degrade. El reparto es simple: **el agente escribe el
contrato y la lógica de negocio; el generador escribe la estructura; las
herramientas comprueban el trabajo de los dos; una persona decide el dominio y
revisa.**

Esta sección explica por qué ese reparto funciona, cómo se prepara un proyecto,
qué ciclo sigue el agente, cómo pedirle las cosas, qué revisa una persona y qué no
se delega nunca.

## El problema: la deriva

El problema de construir muchos modelos —a mano o con una IA— no es escribir
código rápido. Es la **deriva**: cada modelo sale un poco distinto del anterior, y
a los treinta modelos la aplicación ya no tiene una arquitectura, tiene treinta.

Un agente lo empeora sin querer. Escribe Laravel plausible y **distinto cada
vez**: un controlador con la validación dentro, otro que delega en una request,
una política que olvida una acción, una migración con otro criterio de nombres.
Cada pieza parece correcta y el conjunto deja de ser coherente. Y como escribe
rápido, la deriva llega antes.

## La regla

> **La arquitectura se declara, no se escribe.**

Si hay que crear un modelo, un endpoint, una request, una política, una migración,
un recurso, un formulario o una vista, **no se escribe**: se declara en
`laraimport.json` y se genera. Escribir a mano lo que el generador produce es
exactamente la deriva que LaraPack existe para impedir.

Lo que sí se escribe a mano es la **lógica de negocio**, y sólo dentro de los
huecos que el generador deja para eso: `Operations`, la política,
`ManagedFilter::canView`, las reglas, los listeners y el resto de
[extensiones](/larapack/que-se-genera).

Un generador determinista invierte la dinámica: el agente escribe un JSON pequeño
y verificable, y las ~58 piezas de cada modelo salen idénticas siempre, las
escriba quien las escriba.

## El reparto del trabajo

| Qué | Quién lo decide o lo escribe | Dónde |
|---|---|---|
| La forma del dominio: modelos, columnas, relaciones, qué acciones tiene cada tabla | Una persona, o una IA con revisión de una persona | `laraimport.json` |
| La estructura: las ~58 piezas de cada modelo | El generador | Todo lo generado |
| La lógica de negocio, la autorización, la visibilidad | Una persona o una IA | Los huecos |
| Que todo siga cuadrando | Las herramientas y la CI | `validate`, `verify`, `audit`, tests |
| Qué se publica y cuándo | Una persona | `VERSION` y `CHANGELOG.md` |

## Por qué un agente puede iterar solo

Un agente trabaja bien cuando puede comprobar su propio trabajo sin preguntar.
LaraPack le da cuatro cosas para eso.

**1. Un contrato que se descubre.** `larapack:schema` imprime el JSON Schema
completo de `laraimport.json`: qué se puede declarar, qué es obligatorio, qué
valores admite cada campo y qué valor toma si se omite. El agente no deduce el
formato de un ejemplo; los ejemplos envejecen y el esquema no.

**2. Comprobaciones con código de salida.**

| Comando | Qué comprueba |
|---|---|
| `larapack:validate` | Que `laraimport.json` es válido y coherente, antes de generar nada. |
| `larapack:verify` | Que lo generado sigue diciendo lo mismo que el contrato. |
| `larapack:audit` | Que el paquete cumple la línea base del ecosistema: versiones, tests y publicación. |

Las tres salen con un código distinto de cero cuando algo falla. Un código
distinto de cero quiere decir «aún no has terminado».

**3. Salida para máquinas.** Con `--format=json` la salida es **un único documento
JSON y nada más**, también cuando algo falla: `ok` dice si salió bien y, si el
comando ni siquiera pudo ejecutarse (un argumento que falta, una raíz que no
existe), `error` dice por qué. El agente parsea la salida; no raspa texto.

::: warning Atención
Antes de LaraPack 7.10.3, `larapack:import --format=json` escribía líneas de
progreso delante del informe, y la salida no se podía decodificar entera. Si el
agente trabaja con una versión anterior, actualiza LaraPack.
:::

**4. Regenerar es seguro.** El generador anota cada archivo que produce en
`.larapack/manifest.json`, con su hash. Con `--force` regenera lo que nadie tocó y
**conserva lo editado**, avisando. Ampliar el JSON y volver a importar es el flujo
normal, no una excepción, así que el agente no tiene miedo de destruir trabajo.

## Qué detecta cuando se sale del camino

`larapack:verify` convierte la deriva en errores concretos:

- una ruta, un método, una request o una vista escritos a mano para una acción que
  el modelo no declara (`route-not-declared`);
- un modelo `immutable` con un camino de escritura (`immutable-write`);
- una columna `secret` que vuelve a salir por la API, la exportación o la tabla
  (`secret-exposed`);
- un prefijo de rutas del front que ya no cuadra con el backend (`route-prefix`);
- un archivo generado editado (`customised`), que puede ser un hueco legítimo o
  deriva.

El detalle de cada comprobación está en [Verificar y auditar](/larapack/verificar).

## Qué gana la persona que revisa

El `laraimport.json` es la decisión de arquitectura. Si el JSON está bien, lo
generado está bien por construcción. La revisión deja de ser leer cientos de
líneas de controladores y migraciones parecidas, y pasa a ser leer un diff pequeño
del contrato, la autorización y la lógica de los huecos. El orden está en
[Qué revisa una persona](/ia/revisar).

## Por dónde seguir

1. [Preparar el proyecto](/ia/preparar): instalar las instrucciones para el
   agente y elegir punto de partida.
2. [El ciclo del agente](/ia/ciclo): los comandos, sus códigos de salida y lo que
   el agente debe y no debe hacer.
3. [Cómo pedir las cosas](/ia/pedir): peticiones de dominio y qué cuenta como
   terminado.
4. [Qué revisa una persona](/ia/revisar).
5. [Lo que no se delega](/ia/limites).
