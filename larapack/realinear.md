# Realinear un proyecto existente

Desde 9.4.0, `larapack:realign` lleva de vuelta al contrato un proyecto que se desvió —generado con una versión vieja de LaraPack, con código editado fuera de los huecos, con controladores y modelos escritos a mano, o sin contrato— **sin reconstruirlo**. Todo está en el paquete: el diagnóstico, el plan reanudable, las correcciones automáticas, las instrucciones de cada paso manual, las decisiones y las excepciones que aprueba el dueño. No hace falta escribir un prompt por proyecto ni preguntarle a nadie cómo se hace.

La guía completa, con cada acción, cada formato y cada riesgo, viaja con el paquete: [`docs/realign/`](https://github.com/innoboxrr/larapack-generator/blob/master/docs/realign/README.md). Esta página es el mapa.

## Si llegas sin contexto

```bash
php vendor/bin/builder larapack:realign status
```

Dice si hay un realineamiento en curso, dónde va y cuál es el siguiente paso. Sin plan, dice que hay que diagnosticar.

## Las cuatro categorías {#categorias}

Todo lo que encuentra el diagnóstico cae en una de cuatro categorías, las mismas en el informe, en el plan y en la salida de cada comando:

| Categoría | Qué es | Quién lo hace |
|---|---|---|
| `deterministic` | Se aplica con una orden y su resultado se comprueba sin opinar. Lo que no reconoce con certeza lo salta, diciendo por qué. | La herramienta (`apply`, `adopt`). |
| `guided` | Trabajo mecánico que no se automatiza con certeza: mover lógica a su request, devolver código a sus huecos. El paquete da las instrucciones (playbook) y una comprobación concreta dice cuándo está hecho. | Una persona o un agente. |
| `decision` | Hay más de una respuesta legítima y cambia el comportamiento o el alcance. | **El dueño del proyecto. Nunca un agente por su cuenta.** |
| `out_of_scope` | No es de LaraPack: dominio, servicios, front propio, historia de migraciones. | Nadie: se cuenta y no se toca. |

## Para una persona {#persona}

En un proyecto con contrato. Sin contrato se empieza por `larapack:realign infer`, que escribe un borrador del `laraimport.json` desde el código.

```bash
git switch -c realign                                               # una rama, con el árbol limpio
php vendor/bin/builder larapack:realign diagnose                    # compara el proyecto con su contrato; no escribe código
php vendor/bin/builder larapack:realign plan                        # lo convierte en pasos
php vendor/bin/builder larapack:realign apply --deterministic --dry-run
php vendor/bin/builder larapack:realign apply --deterministic       # corre tus pruebas y comitea
php vendor/bin/builder larapack:realign diagnose                    # otra pasada, hasta que apply no aplique nada
php vendor/bin/builder larapack:realign next                        # el siguiente paso, con sus instrucciones
php vendor/bin/builder larapack:realign check <id>                  # ¿hecho? un commit por paso
php vendor/bin/builder larapack:realign brief                       # lo que sólo decide o aprueba el dueño
php vendor/bin/builder larapack:realign done                        # 0: terminado; si no, dice qué falta
```

Un paso que cambia comportamiento pide su prueba: `check <id> --tested="<la orden de pruebas que corriste y pasó>"`. Sin ella queda `untested`, y `done` no termina hasta que se pruebe o el dueño lo acepte.

## Para un agente de IA {#agente}

Cada orden da JSON con `--format=json`. La receta completa está en la guía del paquete y la instala `larapack:skill`.

1. `realign status`; si no hay plan o está viejo, `diagnose` y `plan`.
2. `apply --deterministic` (primero `--dry-run`), pruebas, commit, y otra pasada hasta que no quede nada automático.
3. `realign next` y según `step.category`: `deterministic`, ejecuta la orden; `guided`, sigue el playbook al pie de la letra; `decision`, **no decidas**: preséntale las opciones al dueño y sigue con lo que no depende de él.
4. `realign check <id>`; con `done: true`, commit y vuelve al 3.
5. Lo que no se puede hacer ahora, `defer`; lo que es del dueño, `escalate`; cuando lo que queda es suyo, `brief`.
6. **Nunca** corras `realign decide`, `hand-rolled approve` ni `realign accept-untested`: la guardia de los agentes los bloquea.
7. Termina cuando `realign done` sale con 0.

## Lo que garantiza, y lo que no {#garantias}

- **Nunca escribe ni reescribe una migración**, y nunca toca lo que no reconoce con certeza.
- **El estado vive en el proyecto** (`.larapack/realign/`): otra persona u otro agente sigue mañana con `status` y `next`. Versiona `plan.json` y `exceptions.json`.
- **No abre la asignación en masa sola**: a `$fillable`, `$creatable` y `$updatable` no se añade nada sin que una persona lo decida.
- **Quien pide una excepción no la aprueba**: la aprueba el dueño, en su terminal o en el workflow de aprobación de GitHub, y CODEOWNERS revisa el candado en la CI.
- **Se termina con un criterio que no es opinión**: `done` vuelve a diagnosticar y falla mientras quede un paso, una decisión, un paso sin probar, una excepción sin aprobar o un aviso de `validate --strict` o `verify --strict`.

Los riesgos de cada operación, con cómo deshacerla, están en [`docs/realign/risks.md`](https://github.com/innoboxrr/larapack-generator/blob/master/docs/realign/risks.md).
