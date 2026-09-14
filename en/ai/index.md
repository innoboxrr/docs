# Why it works

LaraPack is built to work with an agent (Claude Code, Codex or any other) without
the architecture degrading. The split is simple: **the agent writes the contract and
the business logic; the generator writes the structure; the tools check the work of
both; a person decides the domain and reviews.**

This section explains why that split works, how to prepare a project, the loop the
agent follows, how to ask for things, what a person reviews and what is never
delegated.

## The problem: drift

The hard part of building many models, by hand or with an AI, isn't writing code
fast. It's **drift**: each model comes out slightly different from the last, and by
the thirtieth model the application no longer has an architecture. It has thirty.

An agent makes this worse without meaning to. It writes plausible Laravel that is
**different every time**: one controller validates inline, another delegates to a
request, a policy forgets an action, a migration follows another naming rule. Every
piece looks right and the whole stops being coherent. And because the agent writes
fast, drift arrives sooner.

## The rule

> **Architecture is declared, not written.** *(La arquitectura se declara, no se
> escribe.)*

If you need a model, an endpoint, a request, a policy, a migration, a resource, a
form or a view, **you don't write it**: you declare it in `laraimport.json` and
generate it. Hand-writing what the generator produces is exactly the drift LaraPack
exists to prevent.

What you do write by hand is **business logic**, and only inside the extension
points the generator leaves for it: `Operations`, the policy,
`ManagedFilter::canView`, rules, listeners and the rest of the
[extension points](/en/larapack/generated-code).

A deterministic generator inverts the dynamic: the agent writes a small, verifiable
JSON file, and the ~58 pieces of every model come out identical every time, no
matter who writes them.

## The split

| What | Who decides or writes it | Where |
|---|---|---|
| The shape of the domain: models, columns, relations, which actions each table has | A person, or an AI reviewed by a person | `laraimport.json` |
| The structure: the ~58 pieces of each model | The generator | Everything generated |
| Business logic, authorization, visibility | A person or an AI | The extension points |
| That everything still adds up | The tools and CI | `validate`, `verify`, `audit`, tests |
| What gets released, and when | A person | `VERSION` and `CHANGELOG.md` |

## Why an agent can iterate on its own

An agent works well when it can check its own work without asking. LaraPack gives it
four things for that.

**1. A discoverable contract.** `larapack:schema` prints the full JSON Schema of
`laraimport.json`: what can be declared, what is required, which values each field
accepts and what it defaults to. The agent doesn't infer the format from an example;
examples age, the schema doesn't.

**2. Checks with exit codes.**

| Command | What it checks |
|---|---|
| `larapack:validate` | That `laraimport.json` is valid and coherent, before generating anything. |
| `larapack:verify` | That the generated code still says the same as the contract. |
| `larapack:audit` | That the package meets the ecosystem baseline: versions, tests and releasing. |

All three exit non-zero when something fails. A non-zero exit means "you're not done
yet".

**3. Machine-readable output.** With `--format=json` the output is **a single JSON
document and nothing else**, including on failure: `ok` says whether it succeeded,
and if the command couldn't even run (a missing argument, a root that doesn't exist),
`error` says why. The agent parses the output; it doesn't scrape text.

::: warning
Before LaraPack 7.10.3, `larapack:import --format=json` printed progress lines ahead
of the report, so the output couldn't be decoded as a whole. If the agent works with
an older version, upgrade LaraPack.
:::

**4. Regenerating is safe.** The generator records every file it produces in
`.larapack/manifest.json`, with its hash. With `--force` it regenerates what nobody
touched and **keeps what was edited**, telling you so. Extending the JSON and
importing again is the normal flow, not an exception, so the agent isn't afraid of
destroying work.

## What it catches when the agent strays

`larapack:verify` turns drift into concrete errors:

- a route, method, request or view hand-written for an action the model doesn't
  declare (`route-not-declared`);
- an `immutable` model with a write path (`immutable-write`);
- a `secret` column leaking through the API, the export or the table
  (`secret-exposed`);
- a front-end route prefix that no longer matches the backend (`route-prefix`);
- an edited generated file (`customised`), which may be a legitimate extension
  point or drift.

Each check is described in [Verify and audit](/en/larapack/verify).

## What the reviewer gains

`laraimport.json` is the architecture decision. If the JSON is right, the generated
code is right by construction. Review stops being hundreds of lines of near-identical
controllers and migrations and becomes a small diff of the contract, the
authorization and the logic in the extension points. The order is in
[What a person reviews](/en/ai/review).

## Where to go next

1. [Preparing the project](/en/ai/setup): install the agent instructions and
   pick a starting point.
2. [The agent loop](/en/ai/loop): the commands, their exit codes, and what the
   agent must and must not do.
3. [How to ask for things](/en/ai/prompting): domain-level requests and what
   counts as done.
4. [What a person reviews](/en/ai/review).
5. [What is not delegated](/en/ai/limits).
