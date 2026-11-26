# Qué revisa una persona

El agente comprueba que el trabajo cuadra con el contrato. Lo que ninguna
herramienta sabe es si el contrato es el correcto, si la autorización es la que
quiere el negocio y si la lógica hace lo que tiene que hacer. Eso lo revisa una
persona.

## En este orden

El orden importa: cada paso invalida los siguientes si falla. No tiene sentido
revisar la lógica de un modelo cuya tabla está mal declarada.

```bash
git diff --stat
git diff -- laraimport.json
php artisan larapack:validate --vue --strict
php artisan larapack:verify --format=json
vendor/bin/phpunit
```

(`php vendor/bin/builder` en lugar de `php artisan` en un paquete.)

### 1. El diff de `laraimport.json`

Es la decisión de arquitectura. Si el JSON está bien, lo generado está bien por
construcción. Mira:

- **Tipos y nulabilidad.** Un `decimal` para dinero, no un `float`; `nullable` sólo
  donde de verdad falta el dato.
- **Claves foráneas.** Cada `foreignId` apunta a su tabla con `constraint`, y una
  clave a sí mismo es `nullable`.
- **Qué acciones tiene cada tabla.** `routes`, `immutable`: una bitácora que se puede
  editar es un error de dominio.
- **Qué es `secret`.** Contraseñas, tokens, claves: nunca salen por la API.
- **Columna o meta.** Lo que se filtra u ordena, columna.
- **Reglas.** `Update` lleva la regla `<model>_id`; lo que el negocio exige (únicos,
  mínimos) está declarado.
- **`load_relations` y `load_counts`.** Sólo lo que la API tiene que poder cargar.

### 2. La autorización y la visibilidad

Es donde un error se convierte en una fuga de datos.

- **La política nace cerrada**: sólo pasa el administrador, y ni él borra para
  siempre mientras `forceDelete` siga en `$exceptAbilities`. Cada habilidad que el
  agente abrió tiene que tener una razón.
- **`ManagedFilter::canView`** decide qué filas ve cada usuario en el índice. Sin
  él, el índice lo devuelve todo a quien pase la política.
- **Pruébalo con un usuario que no es administrador**, no sólo con el tuyo.

### 3. La lógica de negocio en los huecos

El modelo es una fachada: un método en `Operations` que orquesta, y el trabajo
real en la clase que le toque. Busca lógica en sitios donde no va: el controlador,
el archivo de rutas, una vista.

`verify` ya garantiza que ningún controlador hace más que
`return $request->handle();`. Lo que no puede saber es si lo que hay dentro de la
request, la política o la operación es lo que pide el negocio: eso es lo que se
revisa aquí, y lo que tienen que probar los tests del paso 5.

### 4. Que `verify` sólo marque como editados los huecos

```bash
php artisan larapack:verify --format=json | jq -r '.findings[] | select(.check == "customised") | .file'
```

Cada archivo de esa lista tiene que ser un hueco: un trait de `Operations`, una
política, un `ManagedFilter`, una request en su `rules()`, un listener. Un
controlador, un archivo de rutas o un modelo con `$fillable` editado son deriva.

### 5. Los tests del comportamiento

Los tests generados prueban que cada endpoint responde. Los que importan son los
del comportamiento que se pidió: que el stock no baje de cero, que un usuario no
vea pedidos ajenos, que la política rechace a quien debe. Si el agente sólo dejó
los generados, no hay tests del cambio.

## Además

- **Cada `#[HandRolled]` nuevo y cada cambio en `.larapack/hand-rolled.lock`.**
  Una excepción al patrón la aprueba el dueño del proyecto, no quien la escribe.
  Pregunta por qué no se pudo declarar como endpoint ni resolver con un
  `FormRequest` (`failedValidation()` y `failedAuthorization()` cubren casi todos
  los protocolos). Con [`larapack:ci`](/larapack/verificar#ci), CODEOWNERS te
  pide esa revisión.

- **`.larapack/manifest.json` cambia con el código.** Un commit que genera sin
  actualizar el manifiesto deja al generador a ciegas.
- **Las migraciones de alteración.** Lee cada `*_alter_<tabla>_table.php` antes de
  migrar: puede quitar una columna con sus datos. Migrar producción no se delega
  (ver [Lo que no se delega](/ia/limites)).
- **Los archivos conservados.** Si el informe de `larapack:import` dijo que
  conservó archivos editados, el cambio no llegó a ellos: comprueba que el agente lo
  llevó a mano.

## Señales de que el agente se salió del flujo

| Señal | Qué quiere decir |
|---|---|
| Editó el controlador o el archivo de rutas | Escribió a mano lo que el generador produce |
| Cambió `$fillable` o `casts()` a mano | El modelo y el contrato ya no dicen lo mismo |
| Borró acciones en vez de declararlas | Deriva permanente; `verify` falla con `route-not-declared` |
| Escribió clases de Tailwind o de UIkit en una vista | El módulo sólo se verá bien en la aplicación que las cargue |
| Hizo que un formulario navegue al guardar | Rompe la tabla que queda montada debajo del drawer |
| Expuso un campo sensible «sólo para depurar» | Una fuga; `verify` falla con `secret-exposed` |
| Editó `models/<kebab>/index.js` en un solo framework | Vue y React dejan de compartir el contrato |
| Escribió una ruta a mano en una vista React | Se rompe donde el anfitrión monte el módulo en otra ruta |
| Añadió una columna JSON para datos flexibles | Debían ser metas |
| Editó la migración de creación de una tabla ya migrada | El cambio no llega a la base y LaraPack deja de poder escribir alteraciones |
| Textos en español o inglés fijos en una vista | Deberían ser claves con `t()` |
| Tests generados editados para que pasen | Los generados pasan recién generados: si fallan, algo se rompió |
| Un controlador con validación, autorización o consultas dentro | `verify` falla con `controller-shape`: va en la request, o se declara como endpoint |
| Un `#[HandRolled]` que nadie pidió | Una forma de que `verify` pase sin arreglar nada; con candado, falla como no aprobada |
| Cambios en `.larapack/hand-rolled.lock` hechos por el agente | La aprobación es del dueño; la guardia lo bloquea, así que el agente la rodeó |
| Hooks de `.claude/settings.json` quitados o cambiados | El agente apagó la guardia |

Ante cualquiera, la respuesta es la misma: pedir que lo declare en
`laraimport.json`, regenere y vuelva a verificar.
