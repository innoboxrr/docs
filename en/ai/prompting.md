# How to ask for things

An agent does what you ask in the shape you ask it. If the request talks about files,
the agent writes files, which is exactly the generator's job. If it talks about the
domain, the agent translates it into `laraimport.json` and logic in the extension
points.

## Ask for domain and behavior, not files

| Instead of | Ask | What to expect |
|---|---|---|
| "Create the suppliers controller and migration" | "Add suppliers: name, unique email and an optional phone. A product belongs to a supplier. Generate the API and the Vue module." | A new model in the JSON, a `foreignId` with its `constraint`, `larapack:import --vue` |
| "Remove the edit and delete routes from the log" | "The price-change log is only appended to and read; nobody modifies it." | `immutable` and `routes` |
| "Hide the token in the Resource" | "The credentials token is stored but never leaves the API." | `secret` on the column |
| "Fix the products form" | "When creating a product, the initial stock can't be negative." | A rule under `requests` in the JSON |

More domain-level requests, and what the agent should do:

| Request | What to expect |
|---|---|
| "Products have optional SEO fields, title and description, edited in the form." | `metas: true` and `editable_metas: ["seo_title", "seo_description"]` |
| "Products have attributes that vary by category (color, size, material) and aren't filtered or sorted." | Metas, not a JSON column |
| "A product is named by its SKU on its detail page and in breadcrumbs." | `display: "sku"` |
| "Each user sees only their own orders; admins see all of them." | `ManagedFilter::canView` and the policy |
| "API keys are created and revoked, but never edited." | `routes` without `update` |
| "Confirming an order deducts each product's stock." | A method in `Operations` that orchestrates |
| "When the customer list is exported, also notify in the bell." | `database` in `notification_via` and the notifications table |
| "Add an optional website to suppliers." | A `nullable` prop, re-import with `--force`, and an alter migration |

## Say what counts as done

Without a definition of done, the agent stops when the code "looks" ready. A
reasonable one, to paste at the end of every request:

```text
Done means:
- laraimport.json updated and larapack:validate green.
- Generated with larapack:import, without touching generated files outside the
  extension points.
- Logic in Operations, the policy, ManagedFilter::canView, the rules or the
  listeners, as appropriate.
- larapack:verify and the test suite green; larapack:audit if it's a package.
- If it's going to be released, VERSION and CHANGELOG.md updated.
```

## Good and bad prompts

::: details "Create ProductController with index, store, update and destroy"
**Bad.** It asks for a specific file. The agent will hand-write it in whatever shape
occurs to it, and `larapack:verify` will flag it as `route-not-declared` as soon as the
model doesn't declare those actions.

**Good.** "Add products to the catalog: name, unique SKU, decimal price and an integer
stock that can't be negative. A product belongs to a supplier. Generate the API and
the Vue module."
:::

::: details "Add a JSON column `extra` to products to store whatever we need"
**Bad.** It picks the solution, and it's the wrong one: a hand-written JSON column has
no rules, no form and no `payload`.

**Good.** "Products have optional data that varies from one to another: warranty,
material, country of origin. It isn't filtered or sorted. It's edited in the form."
The agent arrives at metas.
:::

::: details "Remove the delete button from the log"
**Bad.** It talks about the UI. The agent will remove the button, the route or both,
and the contract will stop describing the code.

**Good.** "Log entries are never modified or deleted, not even by an admin." The agent
declares `immutable`, and removing the action removes the button too.
:::

::: details "Put 'Create product' on the button"
**Bad.** The agent will hard-code the text in the view.

**Good.** "In Spanish, the products admin should say 'Producto' and 'Productos'." The
agent translates the model keys in the module's `src/locales/es.json` or in the
application's language file, and composite strings (`Create :name`) follow on their
own.
:::

::: details "Make it so only admins can see orders"
**Ambiguous.** See the list, see one order, or not appear in the menu?

**Good.** "Only admins can list and view orders; everyone else gets 403. It doesn't
appear in the menu for non-admins." The policy is already born that way, because it
only lets the admin through: the agent doesn't need to open it, only add the route to
`adminOnly`. You check that it didn't touch the policy.
:::

::: details "Do it quickly, no need to run the tests"
**Bad.** It removes exactly what lets the agent know it's done. `verify` and the test
suite are the definition of done, not an extra.
:::

## A big request, in parts

For a large domain change, ask in three steps:

1. **Just the contract.** "Propose the change to `laraimport.json` and validate it;
   don't generate yet." You review the diff, which is the architecture decision.
2. **Generate.** "Generate with `--dry-run`, show me what it preserves, then
   generate."
3. **The logic.** "Write the logic in the extension points, with behavior tests."

This matches the ecosystem's commit convention: the JSON change and its regeneration
go in one commit; the logic written afterwards, in another.

## Context worth giving

- **Package or application.** It changes where code goes (`src/` or `app/`) and how
  providers are registered. See [Package or application](/en/concepts/package-or-application).
- **Vue, React or both.** It decides `--vue` and `--react` on every command.
- **The project root**, if the agent works from another directory: `--root`.
- **What already exists**: models, tables already migrated in production, hand-edited
  files that must not be lost.
