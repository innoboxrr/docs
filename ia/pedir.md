# Cómo pedir las cosas

Un agente hace lo que se le pide con la forma en que se le pide. Si la petición
habla de archivos, el agente escribe archivos, y eso es justo lo que el generador
tiene que hacer por él. Si habla del dominio, el agente lo traduce a
`laraimport.json` y a lógica en los huecos.

## Pide dominio y comportamiento, no archivos

| En lugar de | Pide | Qué esperar |
|---|---|---|
| «Crea el controlador y la migración de proveedores» | «Añade proveedores: nombre, email único y teléfono opcional. Un producto pertenece a un proveedor. Genera la API y el módulo Vue.» | Un modelo nuevo en el JSON, un `foreignId` con su `constraint`, `larapack:import --vue` |
| «Quita las rutas de editar y borrar de la bitácora» | «La bitácora de cambios de precio sólo se agrega y se consulta; nadie la modifica.» | `immutable` y `routes` |
| «Oculta el token en el Resource» | «El token de las credenciales se guarda pero nunca sale por la API.» | `secret` en la columna |
| «Arregla el formulario de productos» | «Al crear un producto, el stock inicial no puede ser negativo.» | Una regla en `requests` del JSON |

Más peticiones de dominio, con lo que el agente debería hacer:

| Petición | Qué esperar |
|---|---|
| «Los productos tienen campos SEO opcionales, título y descripción, que se editan en el formulario.» | `metas: true` y `editable_metas: ["seo_title", "seo_description"]` |
| «Los productos tienen atributos que cambian según la categoría —color, talla, material— y no se filtran ni se ordenan.» | Metas, no una columna JSON |
| «Un producto se nombra por su SKU en la ficha y en las migas.» | `display: "sku"` |
| «Cada usuario ve sólo sus pedidos; los administradores ven todos.» | `ManagedFilter::canView` y la política |
| «Las claves de API se crean y se revocan, pero no se editan.» | `routes` sin `update` |
| «Al confirmar un pedido se descuenta el stock de cada producto.» | Un método en `Operations` que orquesta |
| «Cuando se exporta la lista de clientes, avisa también en la campana.» | `database` en `notification_via` y la tabla de notificaciones |
| «Añade al proveedor un sitio web opcional.» | Una `prop` `nullable`, reimportar con `--force` y una migración de alteración |

## Di qué cuenta como terminado

Sin una definición de terminado, el agente para cuando el código «parece» listo.
Una razonable, para pegar al final de cada petición:

```text
Terminado es:
- laraimport.json actualizado y larapack:validate en verde.
- Generado con larapack:import, sin tocar archivos generados fuera de los huecos.
- La lógica en Operations, la política, ManagedFilter::canView, las reglas o los
  listeners, según corresponda.
- larapack:verify y la suite en verde; larapack:audit si es un paquete.
- Si se va a publicar, VERSION y CHANGELOG.md actualizados.
```

## Buenos y malos prompts

::: details «Crea ProductController con index, store, update y destroy»
**Malo.** Pide un archivo concreto. El agente lo escribirá a mano, con la forma que
se le ocurra, y `larapack:verify` lo marcará como `route-not-declared` en cuanto el
modelo no declare esas acciones.

**Bueno.** «Añade productos al catálogo: nombre, SKU único, precio decimal y stock
entero que no puede ser negativo. Un producto pertenece a un proveedor. Genera la
API y el módulo Vue.»
:::

::: details «Añade una columna JSON `extra` a productos para guardar lo que haga falta»
**Malo.** Decide la solución, y es la equivocada: una columna JSON escrita a mano
no tiene reglas, ni formulario, ni `payload`.

**Bueno.** «Los productos tienen datos opcionales que cambian de uno a otro —garantía,
material, país de origen—. No se filtran ni se ordenan. Se editan en el
formulario.» El agente llega a las metas.
:::

::: details «Quita el botón de borrar de la bitácora»
**Malo.** Habla de la interfaz. El agente borrará el botón, la ruta o las dos, y
el contrato dejará de describir el código.

**Bueno.** «Los registros de la bitácora no se modifican ni se borran nunca, ni
siquiera un administrador.» El agente declara `immutable`, y quitar la acción quita
también el botón.
:::

::: details «Pon "Crear producto" en el botón»
**Malo.** El agente escribirá el texto fijo en la vista, en español.

**Bueno.** «En español, el administrador de productos tiene que decir "Producto"
y "Productos".» El agente traduce las claves del modelo en `src/locales/es.json`
del módulo o en el archivo de idioma de la aplicación, y los textos compuestos
(`Create :name`) salen solos.
:::

::: details «Haz que solo admin pueda ver pedidos»
**Ambiguo.** ¿Ver el listado, ver un pedido, o que no aparezca en el menú?

**Bueno.** «Sólo los administradores pueden listar y ver pedidos; el resto recibe
403. En el menú no aparece para quien no es administrador.» La política ya nace
así, porque sólo deja pasar al administrador: el agente no tiene que abrirla, sólo
añadir la ruta a `adminOnly`. Tú compruebas que no tocó la política.
:::

::: details «Hazlo rápido, no hace falta correr los tests»
**Malo.** Quita justo lo que permite al agente saber si terminó. `verify` y la
suite son la definición de terminado, no un extra.
:::

## Una petición grande, por partes

Para un cambio de dominio grande, pide en tres pasos:

1. **Sólo el contrato.** «Propón el cambio en `laraimport.json` y valídalo; no
   generes todavía.» Revisas el diff, que es la decisión de arquitectura.
2. **Generar.** «Genera con `--dry-run`, enséñame qué conserva, y genera.»
3. **La lógica.** «Escribe la lógica en los huecos, con tests del comportamiento.»

Encaja con la convención de commits del ecosistema: el cambio del JSON y su
regeneración van en un commit; la lógica que se escribe después, en otro.

## El contexto que conviene dar

- **Paquete o aplicación.** Cambia dónde va el código (`src/` o `app/`) y cómo se
  registran los proveedores. Ver [Paquete o aplicación](/conceptos/paquete-o-aplicacion).
- **Vue, React o los dos.** Decide `--vue` y `--react` en cada comando.
- **La raíz del proyecto**, si el agente trabaja desde otro directorio: `--root`.
- **Qué existe ya**: modelos, tablas migradas en producción, archivos editados a
  mano que no deben perderse.
