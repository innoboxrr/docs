# What a person reviews

The agent checks that the work matches the contract. What no tool knows is whether
the contract is the right one, whether the authorization is what the business wants,
and whether the logic does what it should. A person reviews that.

## In this order

Order matters: each step invalidates the next if it fails. There's no point reviewing
the logic of a model whose table is declared wrong.

```bash
git diff --stat
git diff -- laraimport.json
php artisan larapack:validate --vue --strict
php artisan larapack:verify --format=json
vendor/bin/phpunit
```

(`php vendor/bin/builder` instead of `php artisan` in a package.)

### 1. The `laraimport.json` diff

It's the architecture decision. If the JSON is right, the generated code is right by
construction. Look at:

- **Types and nullability.** A `decimal` for money, not a `float`; `nullable` only
  where the data really can be missing.
- **Foreign keys.** Every `foreignId` points at its table with `constraint`, and a
  self-reference is `nullable`.
- **Which actions each table has.** `routes`, `immutable`: an editable audit log is a
  domain error.
- **What's `secret`.** Passwords, tokens, keys: they never leave the API.
- **Column or meta.** Anything filtered or sorted is a column.
- **Rules.** `Update` has the `<model>_id` rule; what the business requires (unique
  values, minimums) is declared.
- **`load_relations` and `load_counts`.** Only what the API must be able to load.

### 2. Authorization and visibility

This is where a mistake becomes a data leak.

- **The policy is born closed**: only the admin passes, and not even the admin
  force-deletes while `forceDelete` stays in `$exceptAbilities`. Every ability the
  agent opened needs a reason.
- **`ManagedFilter::canView`** decides which rows each user sees in the index. Without
  it, the index returns everything to anyone who passes the policy.
- **Test it with a non-admin user**, not just yours.

### 3. Business logic in the extension points

The model is a facade: a method in `Operations` that orchestrates, and the real work
in the class it belongs to. Look for logic where it doesn't belong: the controller,
the routes file, a view.

`verify` already guarantees that no controller does more than
`return $request->handle();`. What it can't know is whether what's inside the
request, the policy or the operation is what the business asks for: that's what you
review here, and what the tests in step 5 have to check.

### 4. That `verify` flags only extension points as customised

```bash
php artisan larapack:verify --format=json | jq -r '.findings[] | select(.check == "customised") | .file'
```

Every file on that list must be an extension point: an `Operations` trait, a policy, a
`ManagedFilter`, a request's `rules()`, a listener. An edited controller, routes file,
or model `$fillable` is drift.

### 5. Behavior tests

Generated tests check that every endpoint responds. The ones that matter test the
requested behavior: stock never goes below zero, a user can't see someone else's
orders, the policy rejects whoever it should. If the agent only left the generated
tests, the change has no tests.

## Also

- **Every new `#[HandRolled]` and every change to `.larapack/hand-rolled.lock`.** An
  exception to the pattern is approved by the project owner, not by whoever writes
  it. Ask why it couldn't be declared as an endpoint or solved with a `FormRequest`
  (`failedValidation()` and `failedAuthorization()` cover almost every protocol).
  With [`larapack:ci`](/en/larapack/verify#ci), CODEOWNERS asks you for that review.

- **`.larapack/manifest.json` changes together with the code.** A commit that
  generates without updating the manifest leaves the generator blind.
- **Alter migrations.** Read every `*_alter_<table>_table.php` before migrating: it may
  drop a column along with its data. Migrating production is not delegated (see
  [What is not delegated](/en/ai/limits)).
- **Preserved files.** If the `larapack:import` report said it preserved edited files,
  the change didn't reach them: check that the agent carried it over by hand.

## Signs the agent left the flow

| Sign | What it means |
|---|---|
| Edited the controller or the routes file | Hand-wrote what the generator produces |
| Changed `$fillable` or `casts()` by hand | The model and the contract no longer agree |
| Deleted actions instead of declaring them | Permanent drift; `verify` fails with `route-not-declared` |
| Wrote Tailwind or UIkit classes in a view | The module only looks right in an app that loads them |
| Made a form navigate on save | Breaks the table left mounted under the drawer |
| Exposed a sensitive field "just for debugging" | A leak; `verify` fails with `secret-exposed` |
| Edited `models/<kebab>/index.js` in one framework only | Vue and React stop sharing the contract |
| Hand-wrote a route in a React view | Breaks wherever the host mounts the module on another path |
| Added a JSON column for flexible data | It should have been metas |
| Edited the create migration of an already migrated table | The change never reaches the database, and LaraPack can no longer write alters |
| Hard-coded Spanish or English text in a view | It should be keys through `t()` |
| Edited generated tests to make them pass | Generated tests pass as generated: if they fail, something broke |
| A controller with validation, authorization or queries inside | `verify` fails with `controller-shape`: it goes in the request, or is declared as an endpoint |
| A `#[HandRolled]` nobody asked for | A way to make `verify` pass without fixing anything; with a lock, it fails as unapproved |
| Changes to `.larapack/hand-rolled.lock` made by the agent | Approval is the owner's; the guard blocks it, so the agent went around it |
| Hooks in `.claude/settings.json` removed or changed | The agent switched the guard off |

Whichever it is, the answer is the same: ask the agent to declare it in
`laraimport.json`, regenerate and verify again.
