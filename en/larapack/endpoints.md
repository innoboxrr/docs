# Declared endpoints

Publishing a course, importing a roster, a module's desk, a token exchange, a webhook: since LaraPack 9.0, **anything that isn't one of the [twelve actions](/en/larapack/actions#the-twelve-actions) is declared too**. Before, there was nothing to declare, so it was written by hand with no template, and that's exactly where a controller starts validating, authorizing and querying.

Two `laraimport.json` keys, both optional:

| Key | Where | What for |
|---|---|---|
| `endpoints` | On a model | An action on a record or on the collection: `publish`, `archive`, `importRoster`. It asks the model's policy. |
| `controllers` | At the root | What has no model: a desk, a wizard, a webhook, an OAuth exchange. It asks a Gate ability. |

Without either of them, exactly the same is generated as before.

## An example

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

`larapack:validate --vue` accepts it with no warnings. What each line produces:

- `publish` acts on a course (`target` defaults to `record`) and asks `CoursePolicy::publish()`.
- `archive` asks `update`: a CRUD ability is reused and doesn't add a new method to the policy.
- `importRoster` acts on the collection: its URI is `import-roster` and its route name `import.roster`.
- `certificate` is public, carries the identifier in the URI and rate-limits requests with `throttle:`.
- `Desk` and `Oauth` have no model: their `ability` is a Gate ability the application or the package defines.

## Endpoint keys {#keys}

| Key | Default | What it decides |
|---|---|---|
| `name` | — | camelCase. The controller method, `<Name>Request`, the route name (`importRoster` → `import.roster`; an acronym is one word: `importCSV` → `import.csv`) and the model's `<name>Model` operation. |
| `method` | — | `get`, `post`, `put`, `patch` or `delete`. |
| `uri` | `name` in kebab case | Relative to the model's prefix, like the CRUD routes. Only kebab segments or `{parameter}`, with no leading `/` and no `..`. |
| `target` | `record` | `record` acts on a record: the request looks it up by `<model>_id`, in the body or in the URI. `collection` acts on the model, like `create` or `index`. Not available in `controllers[]`. |
| `ability` | `name` | On a model, the ability on its policy; a CRUD one (`update`, `view`…) reuses its method. In `controllers[]`, a Gate ability; without one, `authorize()` starts out returning `false`. |
| `public` | `false` | No session: the controller drops `auth:sanctum` for that method only. Authorization is still asked, with `?User`. Pair it with a `throttle:`. |
| `middleware` | `[]` | Route middleware, on top of the `api` group. No spaces. |
| `authorize` | — | Only in `controllers[]`, and only with the value `authenticated`: a session is enough. See [below](#authenticated). |

### "Anyone signed in" on a `controllers[]` endpoint {#authenticated}

A model-less endpoint open to anyone with a session —or whose `authorize()` decides without Gate, leaving the 422 to `rules()` and answering 404 for what isn't yours— is declared since LaraPack 9.1 with `"authorize": "authenticated"`. It doesn't accept `ability` (no Gate would be asked) or `public` (there would be no session): `larapack:validate` rejects both combinations.

```json
{ "name": "Desk", "endpoints": [
    { "name": "layout", "method": "get", "authorize": "authenticated" }
] }
```

Its `authorize()` starts out returning `true`, and its test becomes `test_con_sesion_basta_la_sesion`: with authorization denied it expects anything but 403 (it still requires a session: without one, 401). Without declaring it, `test_con_sesion_pregunta_a_la_autorizacion` expects that 403 and would always fail. It doesn't exist on a model endpoint and the schema rejects it: there, "anyone signed in" is the policy method returning `true`, and the test, which denies before asking the policy, still passes.

## What is generated

All deterministic, from the declaration. What you write by hand goes only in the slots.

| Piece | What comes out | Slot? |
|---|---|---|
| Controller method | `public function publish(PublishRequest $request) { return $request->handle(); }`. If public, `except:` on `auth:sanctum`. | No. Regenerated with `--force`. |
| Route | In `routes/api/models/<model>.php`, after the CRUD ones, with its name, `->whereNumber('<model>_id')` if the identifier is in the URI, and its `->middleware([...])`. | No. |
| `Http/Requests/<Model>/<Name>Request.php` | `authorize()` asks the policy; `rules()` carries `<model>_id` if it's `record` and the identifier isn't in the URI; `handle()` looks up the record and delegates to `$model-><name>Model($this)`. | Yes: `rules()` and whatever `authorize()` and `handle()` need. |
| Policy method | `publish(User $user, Course $course)`, which **starts out returning `false`**. `collection` doesn't receive the model; `public` receives `?User`. | Yes. |
| `<name>Model($request)` in `Traits/Operations` | Throws `LogicException` until it's written. Only when the trait is created: an existing one is left alone, and `verify` tells you the exact name that's missing. | Yes. Your logic goes here. |
| `tests/Feature/Endpoints/<Model>/<Name>Test.php` | Without a session, 401 (or 403 if public: it starts closed); with a session and authorization denied, 403 (`test_con_sesion_pregunta_a_la_autorizacion`). With `authorize: authenticated`, anything but 403 (`test_con_sesion_basta_la_sesion`). | Yes. |

A `controllers[]` entry generates the same minus the policy and the operation: its controller, its routes file in `routes/api/models/<name>.php` —the directory the `RouteServiceProvider` already loads, so no provider needs regenerating—, its requests and its tests. `handle()` starts as `abort(501)`: the logic goes in a support class, not in the request or the controller.

**A public endpoint authorizes with `$this->user('sanctum')`.** It doesn't go through `auth:sanctum`, and the default guard wouldn't see a Bearer token: a client with a token would reach the policy as a guest. With a guest, Laravel doesn't call `before()`; with a session it does, so a signed-in administrator gets in just as with the CRUD actions.

**The operation is called `<name>Model`**, like `createModel`: with the bare name, a `refresh` or `replicate` endpoint would have overwritten an Eloquent method.

## In the UI {#ui}

With `--vue` or `--react`, each endpoint also reaches the [UI module](/en/larapack/ui):

| Piece | What comes out | When |
|---|---|---|
| Contract function | `publishModel(data, { confirm })` in `models/<model>/index.js`, the same file in Vue and React. It calls the route by name with the declared verb. `data.id` is the record; any other URI parameter comes from `data` by name; the rest goes in the body, or in the query for `get`. | Always, one per endpoint. |
| Confirmation | It asks first with the theme's dialog, like deleting (`variant: 'danger'` if the verb is `delete`). `{ confirm: false }` calls it without the dialog. | If it isn't `get`. |
| Button in the table toolbar | An entry in `crudActions()`, enabled by `policies`. | `collection`, not `get`, no URI parameters. |
| Action on each row and on the record card | The Resource adds it to `actions`, and `recordActions()` to `ModelCard`'s menu. Disabled if the policy denies it; when it finishes, the card reloads the record. | `record`, not `get`, no URI parameter other than the record. |
| `PoliciesRequest` | Answers for each endpoint with the ability it asks (`archive` → `update`). Without that, the action would always come out disabled. | If `ability` isn't the name. |
| `controllers[]` contract | `src/controllers/<name>/index.js`, with `API_ROUTE_PREFIX` and `<name>Endpoint(data)` per endpoint. | Always. No screen: there's no model or policy to ask. |

What doesn't come out, on purpose:

- **A `get` isn't an action**: it returns data someone has to render. It gets its function and nothing else.
- **A URI parameter that isn't the record** has nowhere to come from on a row. The endpoint keeps its function, and `import --vue` (or `--react`) warns about it.
- **Forms.** The schema doesn't declare endpoint fields, so an endpoint that needs data is called from a screen of your own with `publishModel({ id, ...data })`.

## What `larapack:validate` checks

Beyond the schema, these are errors:

- a `name` repeated within the same model or controller, or equal to a CRUD action (`update`, `forceDelete`, `bulkDelete`…: those are declared with [`routes`](/en/larapack/actions#routes));
- a `name` that clashes with PHP or Laravel: a reserved word, `form`, or a base controller method (`middleware`, `authorize`, `validate`, `callAction`…);
- a repeated `method` + `uri`, a `uri` equal to a CRUD action's, or one that starts with an unconstrained parameter and shadows another endpoint with the same verb;
- a parameter repeated in the URI (`{course_id}/copy/{course_id}`) or longer than 32 characters: Laravel couldn't compile the route and every request with that verb would get a 500 (since 9.1; in 9.0 it passed the schema);
- `target: record` with URI parameters that don't include `{<model>_id}`;
- a CRUD `ability` the model doesn't have (`update` with `routes.only: ["index"]`), that doesn't match the `target`, or that sits on a `public` endpoint;
- two endpoints sharing a custom `ability` with a different `target` or a different `public`;
- two `name`s that produce the same route (`importCsv` and `importCSV`);
- a `controllers[].name` that's repeated, ends in `Controller`, or equals a model, including one already in the manifest because another laraimport generated it.

It warns about a `public` endpoint with no `throttle:` in its `middleware`, and about a URI that starts with an unconstrained parameter even if it doesn't shadow anything yet.

## What `larapack:verify` checks

`verify` doesn't read the laraimport: the declared shape lives in the manifest (`declaration.endpoints` on each model).

| Check | Level | What it catches |
|---|---|---|
| `endpoint-missing` | error | A declared endpoint missing a piece: its method, its route, its request, its policy ability, its operation or, with a UI, its function in the JS contract. The message says which one and what to write or regenerate. |
| `route-not-declared` | error | A public method, a route or a request nobody declared. It tells hand-written code apart from what LaraPack generated for an endpoint that's no longer in the laraimport, and says what to do in each case. |
| `route-prefix` | error | Also the `API_ROUTE_PREFIX` of a `controllers[]` contract. |

Whether a controller does anything beyond `return $request->handle();` is checked by `controller-shape`, on every controller: see [Verify and audit](/en/larapack/verify#controllers).

## What it doesn't do yet

- **Declared rules.** `rules()` is a slot, as in CRUD requests without `requests[]`.
- **Per-endpoint events.** If you need them, fire them from the operation.
- **Removing a whole `controllers[]` entry.** Taking it out of the laraimport doesn't delete its files or its manifest entry: delete them by hand, along with the entry in `.larapack/manifest.json`.

`larapack:full-model` on its own doesn't declare endpoints, but it keeps the ones stored in the manifest. Declaring or changing them is `larapack:import`'s job.

## When not to declare it

If it really can't be generated, the hand-written controller follows the same pattern: `return $request->handle();` and a `FormRequest` of its own with `authorize()`, `rules()` and `handle()`. If the protocol dictates the shape of the error —OAuth2, a webhook signature—, override `failedValidation()` or `failedAuthorization()` on the request. Whatever still can't fit —checking the signature over the raw body— is marked and approved by the project owner with [`#[HandRolled]`](/en/larapack/verify#handrolled).
