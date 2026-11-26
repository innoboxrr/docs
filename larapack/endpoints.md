# Endpoints declarados

Publicar un curso, importar una lista, el escritorio de un módulo, el canje de un token, un webhook: **lo que no es una de las [doce acciones](/larapack/acciones#las-doce-acciones) también se declara**, desde LaraPack 9.0. Antes no había nada que declarar, así que se escribía a mano y sin plantilla, y ahí es justo donde un controlador empieza a validar, autorizar y consultar.

Dos claves del `laraimport.json`, las dos opcionales:

| Clave | Dónde | Para qué |
|---|---|---|
| `endpoints` | En un modelo | Una acción sobre un registro o sobre la colección: `publish`, `archive`, `importRoster`. Pregunta a la política del modelo. |
| `controllers` | En la raíz | Lo que no tiene modelo: un escritorio, un asistente, un webhook, un canje OAuth. Pregunta a una habilidad de Gate. |

Sin ninguna de las dos se genera exactamente lo mismo que antes.

## Un ejemplo

```json
{
    "models": [
        {
            "name": "Course",
            "props": [
                { "name": "title", "type": "string", "datatable": true },
                { "name": "published_at", "type": "timestamp", "nullable": true }
            ],
            "endpoints": [
                { "name": "publish", "method": "post" },
                { "name": "archive", "method": "post", "ability": "update" },
                { "name": "importRoster", "method": "post", "target": "collection" },
                { "name": "certificate", "method": "get", "uri": "{course_id}/certificate",
                  "public": true, "middleware": ["throttle:30,1"] }
            ]
        }
    ],
    "controllers": [
        { "name": "Desk", "endpoints": [
            { "name": "overview", "method": "get", "ability": "viewDesk" }
        ] },
        { "name": "Oauth", "endpoints": [
            { "name": "token", "method": "post", "public": true, "middleware": ["throttle:6,1"] }
        ] }
    ]
}
```

`larapack:validate --vue` lo da por válido sin avisos. Lo que sale de cada línea:

- `publish` actúa sobre un curso (`target` vale `record` por omisión) y pregunta a `CoursePolicy::publish()`.
- `archive` pregunta a `update`: una habilidad CRUD se reutiliza y no crea un método nuevo en la política.
- `importRoster` actúa sobre la colección: su ruta es `import-roster` y su nombre `import.roster`.
- `certificate` es público, lleva el identificador en la URI y limita las peticiones con `throttle:`.
- `Desk` y `Oauth` no tienen modelo: su `ability` es una habilidad de Gate que define la aplicación o el paquete.

## Las claves de un endpoint {#claves}

| Clave | Por omisión | Qué decide |
|---|---|---|
| `name` | — | camelCase. El método del controlador, `<Name>Request`, el nombre de la ruta (`importRoster` → `import.roster`; una sigla es una palabra: `importCSV` → `import.csv`) y la operación `<name>Model` del modelo. |
| `method` | — | `get`, `post`, `put`, `patch` o `delete`. |
| `uri` | `name` en kebab | Relativa al prefijo del modelo, como las CRUD. Sólo segmentos kebab o `{parametro}`, sin `/` inicial ni `..`. |
| `target` | `record` | `record` actúa sobre un registro: la request lo busca por `<modelo>_id`, en el cuerpo o en la URI. `collection` actúa sobre el modelo, como `create` o `index`. No existe en `controllers[]`. |
| `ability` | `name` | En un modelo, la habilidad de su política; una CRUD (`update`, `view`…) reutiliza su método. En un `controllers[]`, una habilidad de Gate; sin ella, `authorize()` nace en `false`. |
| `public` | `false` | Sin sesión: el controlador quita `auth:sanctum` sólo para ese método. La autorización se sigue preguntando, con `?User`. Acompáñalo de un `throttle:`. |
| `middleware` | `[]` | Middleware de la ruta, además del grupo `api`. Sin espacios. |

### «Cualquiera con sesión» en un `controllers[]` {#authenticated}

<!-- revisar tras integrar 9.1 -->

Un endpoint sin modelo abierto a cualquiera con sesión —o cuya `authorize()` decide sin Gate, dejando a `rules()` el 422 y respondiendo 404 por lo ajeno— se declara en LaraPack 9.1 con `"authorize": "authenticated"`, sin `ability` ni `public`:

```json
{ "name": "Desk", "endpoints": [
    { "name": "layout", "method": "get", "authorize": "authenticated" }
] }
```

Su `authorize()` nace en `true`, y su test comprueba que con la autorización negando **no** responde 403 (sigue pidiendo sesión: sin ella, 401). Sin declararlo, el test generado que espera ese 403 fallaría, y con razón. En un endpoint de modelo no existe: ahí «cualquiera con sesión» es el método de la política devolviendo `true`.

## Qué se genera

Todo determinista a partir de la declaración. Lo que se escribe a mano va sólo en los huecos.

| Pieza | Qué sale | ¿Hueco? |
|---|---|---|
| Método del controlador | `public function publish(PublishRequest $request) { return $request->handle(); }`. Si es público, `except:` en `auth:sanctum`. | No. Se regenera con `--force`. |
| Ruta | En `routes/api/models/<modelo>.php`, detrás de las CRUD, con su nombre, `->whereNumber('<modelo>_id')` si el identificador va en la URI y su `->middleware([...])`. | No. |
| `Http/Requests/<Modelo>/<Name>Request.php` | `authorize()` pregunta a la política; `rules()` lleva `<modelo>_id` si es `record` y el identificador no va en la URI; `handle()` busca el registro y delega en `$modelo-><name>Model($this)`. | Sí: `rules()` y lo que necesiten `authorize()` y `handle()`. |
| Método de la política | `publish(User $user, Course $course)`, que **nace devolviendo `false`**. `collection` no recibe el modelo; `public` recibe `?User`. | Sí. |
| `<name>Model($request)` en `Traits/Operations` | Lanza `LogicException` hasta que se escriba. Sólo cuando se crea el trait: uno que ya existe no se toca, y `verify` dice el nombre exacto que falta. | Sí. Aquí va la lógica. |
| `tests/Feature/Endpoints/<Modelo>/<Name>Test.php` | Sin sesión, 401 (o 403 si es público: nace cerrado); con sesión y la autorización negando, 403. | Sí. |

Un `controllers[]` genera lo mismo salvo política y operación: su controlador, su archivo de rutas en `routes/api/models/<nombre>.php` —el directorio que el `RouteServiceProvider` ya carga, así que no hay que regenerar el proveedor—, sus requests y sus tests. `handle()` nace como `abort(501)`: la lógica va en una clase de soporte, no en la request ni en el controlador.

**Un endpoint público autoriza con `$this->user('sanctum')`.** No pasa por `auth:sanctum`, y el guard por omisión no vería un token Bearer: un cliente con token llegaría a la política como invitado. Con un invitado Laravel no llama a `before()`; con sesión sí, así que un administrador autenticado entra como en las CRUD.

**La operación se llama `<name>Model`**, como `createModel`: con el nombre pelado, un endpoint `refresh` o `replicate` habría pisado un método de Eloquent.

## En la interfaz {#interfaz}

Con `--vue` o `--react`, cada endpoint llega también al [módulo de interfaz](/larapack/interfaz):

| Pieza | Qué sale | Cuándo |
|---|---|---|
| Función del contrato | `publishModel(data, { confirm })` en `models/<modelo>/index.js`, el mismo archivo en Vue y en React. Llama a la ruta por nombre con el verbo declarado. `data.id` es el registro; otro parámetro de la URI sale de `data` por su nombre; lo demás va en el cuerpo, o en la query si es `get`. | Siempre, una por endpoint. |
| Confirmación | Pregunta antes con el diálogo del tema, como borrar (`variant: 'danger'` si el verbo es `delete`). `{ confirm: false }` la llama sin diálogo. | Si no es `get`. |
| Botón en la barra de la tabla | Una entrada en `crudActions()`, habilitada por `policies`. | `collection`, no `get`, sin parámetros en la URI. |
| Acción en cada fila y en la ficha | El Resource la añade a `actions`, y `recordActions()` al menú de `ModelCard`. Deshabilitada si la política la niega; al terminar, la ficha recarga el registro. | `record`, no `get`, sin más parámetro en la URI que el registro. |
| `PoliciesRequest` | Responde por cada endpoint con la habilidad que pregunta (`archive` → `update`). Sin eso, la acción saldría siempre deshabilitada. | Si `ability` no es el nombre. |
| Contrato de un `controllers[]` | `src/controllers/<nombre>/index.js`, con `API_ROUTE_PREFIX` y `<name>Endpoint(data)` por endpoint. | Siempre. Sin pantalla: no hay modelo ni política que preguntar. |

Lo que no sale, a propósito:

- **Un `get` no es una acción**: devuelve datos que alguien tiene que pintar. Tiene su función y nada más.
- **Un parámetro de la URI que no es el registro** no tiene de dónde salir en una fila. El endpoint se queda con su función, e `import --vue` (o `--react`) lo avisa.
- **Formularios.** El esquema no declara campos de endpoint, así que un endpoint que necesita datos se llama desde una pantalla propia con `publishModel({ id, ...datos })`.

## Qué valida `larapack:validate`

Además del esquema, son errores:

- un `name` repetido en el mismo modelo o controlador, o igual a una acción CRUD (`update`, `forceDelete`, `bulkDelete`…: ésas se declaran con [`routes`](/larapack/acciones#routes));
- un `name` que choca con PHP o con Laravel: una palabra reservada, `form`, o un método del controlador base (`middleware`, `authorize`, `validate`, `callAction`…);
- `method` + `uri` repetidos, una `uri` igual a la de una acción CRUD, o una que empieza por un parámetro sin restricción y tapa a otro endpoint del mismo verbo;
- un parámetro repetido en la URI (`{course_id}/copy/{course_id}`) o de más de 32 caracteres: Laravel no compilaría la ruta y cada petición con ese verbo daría 500 (desde 9.1; en 9.0 pasaba el esquema);
- `target: record` con parámetros en la URI que no incluyen `{<modelo>_id}`;
- una `ability` CRUD que el modelo no tiene (`update` con `routes.only: ["index"]`), que no casa con el `target` o que va en un endpoint `public`;
- dos endpoints que comparten una `ability` propia con distinto `target` o distinto `public`;
- dos `name` que dan la misma ruta (`importCsv` e `importCSV`);
- un `controllers[].name` repetido, terminado en `Controller` o igual a un modelo, también a uno que ya está en el manifiesto porque lo generó otro laraimport.

Y avisa de un endpoint `public` sin `throttle:` en su `middleware`, y de una URI que empieza por un parámetro sin restricción aunque todavía no tape a nadie.

## Qué comprueba `larapack:verify`

`verify` no lee el laraimport: la forma declarada queda en el manifiesto (`declaration.endpoints` de cada modelo).

| Comprobación | Nivel | Qué detecta |
|---|---|---|
| `endpoint-missing` | error | A un endpoint declarado le falta una pieza: su método, su ruta, su request, su habilidad en la política, su operación o, con interfaz, su función en el contrato JS. El mensaje dice cuál y qué escribir o regenerar. |
| `route-not-declared` | error | Un método público, una ruta o una request que nadie declaró. Distingue lo escrito a mano de lo que generó LaraPack para un endpoint que ya no está en el laraimport, y dice qué hacer en cada caso. |
| `route-prefix` | error | También el `API_ROUTE_PREFIX` del contrato de un `controllers[]`. |

Que el controlador haga algo más que `return $request->handle();` lo comprueba `controller-shape`, en todos los controladores: ver [Verificar y auditar](/larapack/verificar#controladores).

## Lo que todavía no hace

- **Reglas declaradas.** `rules()` es un hueco, como en las requests de las CRUD sin `requests[]`.
- **Eventos por endpoint.** Si hacen falta, se emiten desde la operación.
- **Retirar un `controllers[]` entero.** Quitarlo del laraimport no borra sus archivos ni su entrada del manifiesto: se borran a mano, con la entrada de `.larapack/manifest.json`.

`larapack:full-model` suelto no declara endpoints, pero conserva los que guarda el manifiesto. Declararlos o cambiarlos es cosa de `larapack:import`.

## Cuándo no declararlo

Si de verdad no se puede generar, el controlador escrito a mano sigue el mismo patrón: `return $request->handle();` y un `FormRequest` propio con `authorize()`, `rules()` y `handle()`. Si el protocolo dicta la forma del error —OAuth2, la firma de un webhook—, se sobrescriben `failedValidation()` o `failedAuthorization()` en la request. Lo que ni así puede ser —comprobar la firma sobre el cuerpo en bruto— lo marca y lo aprueba el dueño del proyecto con [`#[HandRolled]`](/larapack/verificar#handrolled).
