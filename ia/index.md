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

- un controlador, generado o escrito a mano, que hace algo más que
  `return $request->handle();`: valida, autoriza o consulta dentro
  (`controller-shape`), o recibe una request sin `handle()` (`request-handle`);
- un trait de autorización en `Http/Controllers` (`controller-concern`);
- una ruta, un método, una request o una vista escritos a mano para una acción o
  un endpoint que el modelo no declara (`route-not-declared`), o un endpoint
  declarado al que le falta una pieza (`endpoint-missing`);
- un modelo `immutable` con un camino de escritura (`immutable-write`);
- una columna `secret` que vuelve a salir por la API, la exportación o la tabla
  (`secret-exposed`);
- un prefijo de rutas del front que ya no cuadra con el backend (`route-prefix`);
- un archivo generado editado (`customised`), que puede ser un hueco legítimo o
  deriva.

El detalle de cada comprobación está en [Verificar y auditar](/larapack/verificar).

## Cómo se impide la deriva con un agente {#guardia}

Una regla escrita se cumple mientras el agente la recuerda, y a mitad de una
sesión larga deja de recordarla. En una aplicación real, los agentes respetaron
`return $request->handle();` en todos los controladores que generó LaraPack y lo
perdieron en cuanto tuvieron que escribir uno que el generador no sabía hacer: un
escritorio, el canje de un token, un webhook. El `CLAUDE.md` del proyecto lo
prohibía en negrita, y no bastó.

Por eso, desde LaraPack 9, la regla no depende sólo de que alguien la lea. Son
cuatro capas, cada una para un momento distinto:

| Capa | Cuándo actúa | Qué hace |
|---|---|---|
| **La skill y `AGENTS.md`** | Antes de escribir | Explican el flujo, dónde va el código y cuándo [declarar un endpoint](/larapack/endpoints). `larapack:skill` instala la skill y un bloque corto en `AGENTS.md` para Codex y otros agentes. |
| **La guardia** | En cada edición del agente | Hooks de Claude Code que ejecutan `larapack:guard`: tras cada `Write` o `Edit`, el archivo pasa las comprobaciones de `verify` y, si tiene errores, el agente recibe el motivo y la regla con el archivo todavía delante. Al terminar el turno, `verify` del proyecto. Antes de cada herramienta, impide aprobar una excepción. |
| **`larapack:verify`** | Cuando se corre | Revisa todos los controladores, requests y resources del proyecto y de sus paquetes, no sólo lo generado. |
| **La CI** | En cada PR y cada push | El job «LaraPack verify» corre `verify --strict` y la rama protegida lo exige. Las excepciones las aprueba el dueño en un archivo que pasa por su revisión. |

Las tres primeras ayudan al agente a no salirse; **la cuarta es la que no depende
de él**. La guardia sólo existe donde están los hooks, y un agente que trabaja
sin ellos, otro editor o una persona con prisa no la tienen. La rama protegida, sí.

**La guardia no estorba lo que no es suyo.** Sólo bloquea por errores en el
archivo que se acaba de tocar; los avisos se dicen sin retener. Al terminar el
turno retiene sólo por lo que tocó esa sesión, para que una consola no quede
atrapada por lo que otra dejó a medias. Y nunca se bloquea a sí misma: una entrada
rota, un archivo de `vendor/` o un proyecto sin `vendor/` la dejan pasar. Por eso
se activa con `verify` en verde: en un proyecto con errores previos, cada edición
de esos archivos retendría al agente por algo que no causó. Cómo se instala está
en [Preparar el proyecto](/ia/preparar#guardia).

**Las excepciones son de una persona.** Lo que de verdad no puede seguir el
patrón —un webhook que comprueba la firma sobre el cuerpo en bruto— se marca con
[`#[HandRolled('razón')]`](/larapack/verificar#handrolled). La aprueba el dueño
del proyecto con `larapack:hand-rolled approve`, que escribe
`.larapack/hand-rolled.lock`, y la aprobación es el commit de ese archivo que
CODEOWNERS le pide revisar. La guardia bloquea a un agente que intenta editarlo
o correr `approve`.

### Qué garantiza y qué no

Garantiza **la forma**, y la garantiza de manera determinista:

- que cada controlador delega en su request, también los escritos a mano;
- que lo que no es CRUD está declarado o es una excepción que aprobó una persona;
- que lo generado sigue diciendo lo mismo que el contrato;
- que nada de eso entra en la rama protegida sin pasar `verify --strict`.

**No garantiza que la lógica sea correcta.** Lo que el agente escribe dentro de
los huecos —qué decide la política, qué filas deja ver `canView()`, qué hace una
operación— puede tener la forma perfecta y estar mal. Eso lo cubren las pruebas
del comportamiento y la revisión de una persona ([Qué revisa una
persona](/ia/revisar)). Los tests generados prueban que cada acción pide sesión,
pregunta a la autorización y pasa por su `ManagedFilter`, pero no qué decide la
autorización.

Tampoco es infranqueable en local: un agente puede escribir un archivo por una
vía que la guardia no ve, o trabajar sin hooks. Lo que la guardia no para, lo para
la CI; lo que la CI no puede saber, lo ve quien revisa.

## Qué gana la persona que revisa

El `laraimport.json` es la decisión de arquitectura. Si el JSON está bien, lo
generado está bien por construcción. La revisión deja de ser leer cientos de
líneas de controladores y migraciones parecidas, y pasa a ser leer un diff pequeño
del contrato, la autorización y la lógica de los huecos. El orden está en
[Qué revisa una persona](/ia/revisar).

## Por dónde seguir

1. [Preparar el proyecto](/ia/preparar): instalar las instrucciones para el
   agente y la guardia, y elegir punto de partida.
2. [El ciclo del agente](/ia/ciclo): los comandos, sus códigos de salida y lo que
   el agente debe y no debe hacer.
3. [Cómo pedir las cosas](/ia/pedir): peticiones de dominio y qué cuenta como
   terminado.
4. [Qué revisa una persona](/ia/revisar).
5. [Lo que no se delega](/ia/limites).
