# Varias consolas a la vez

Diez o veinte agentes —o personas— sobre el mismo proyecto, cada uno en su rama o en su worktree, que luego se integran. Desde 9.4.0 LaraPack lo sostiene: lo generado sale del contrato, así que dos ramas no fusionan lo generado, **fusionan el contrato y vuelven a generar**. Lo que sí escribió una persona (los huecos, los controladores a mano) lo fusiona git, y si choca lo resuelve quien lo escribió.

La guía completa, con lo que se midió en diecisiete ramas fusionadas en cinco órdenes distintos, viaja con el paquete: [`docs/swarm.md`](https://github.com/innoboxrr/larapack-generator/blob/master/docs/swarm.md).

## Cada consola, antes de empujar {#consola}

1. **Su rama o su worktree**, partiendo de la rama de integración al día. Dos consolas no comparten directorio.
2. **El ciclo entero**: editar `laraimport.json`, `validate`, `import --force`, rellenar los huecos, `verify --strict` y las pruebas. Un `laraimport.json` cambiado sin volver a importar es el error `contract-outdated`.
3. **No resolver a mano** un conflicto en `laraimport.json` ni en `.larapack/manifest.json`.
4. **Declarar en vez de escribir a mano**: un endpoint declarado se fusiona por nombre; uno escrito a mano, línea a línea.

## Quien integra {#integrar}

De una rama en una:

```bash
git merge --no-ff --no-commit <rama>
php vendor/bin/builder larapack:reconcile          # --dry-run dice lo que haría
php vendor/bin/builder larapack:verify --strict
git add -A && git commit
```

`larapack:reconcile` fusiona el laraimport por nombres (modelos, columnas, endpoints), recompone el manifiesto de las dos ramas, fusiona los archivos de idioma clave a clave, retira la migración repetida que trae la rama que entra y vuelve a importar. Lo que no es suyo decidir —el mismo endpoint declarado distinto en dos ramas, dos consolas en el mismo hueco— lo deja nombrado y sale con error.

## Lo que `verify` detecta de una fusión {#verify}

| Comprobación | Qué detecta |
|---|---|
| `contract-outdated` | Lo generado corresponde a otro contrato: se cambió el laraimport y no se volvió a importar. |
| `manifest-unreadable` | El manifiesto tiene marcadores de conflicto o es de una versión posterior: ningún comando lo reescribe. |
| `merge-conflict` | Marcadores de conflicto sin resolver en el laraimport, en el estado de LaraPack o en cualquier archivo de código del proyecto (PHP, JSON, JS, TS, Vue). |
| `migration-duplicate` | Dos migraciones que crean la misma tabla o añaden la misma columna. |
| `route-duplicate` | Un archivo de rutas generado que registra dos veces el mismo verbo y la misma URI: Laravel se queda con la última y calla. |

`larapack:ci` añade `larapack:reconcile --check` y, si el proyecto usa Pint, `pint --test` al workflow de la puerta.

## Lo que no se puede garantizar desde el paquete {#limites}

- Que dos consolas no decidan cosas incompatibles: se detecta, no se elige.
- Que la lógica de los huecos de dos ramas sea coherente: eso lo dicen las pruebas del proyecto.
- Que una migración retirada no hubiera corrido ya en una base compartida.
- Con squash o rebase no hay dos padres: sólo el merge está cubierto por pruebas.
