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

- a controller, generated or hand-written, that does more than
  `return $request->handle();`: it validates, authorizes or queries inside
  (`controller-shape`), or receives a request without `handle()`
  (`request-handle`);
- an authorization trait in `Http/Controllers` (`controller-concern`);
- a route, method, request or view hand-written for an action or endpoint the
  model doesn't declare (`route-not-declared`), or a declared endpoint missing a
  piece (`endpoint-missing`);
- an `immutable` model with a write path (`immutable-write`);
- a `secret` column leaking through the API, the export or the table
  (`secret-exposed`);
- a front-end route prefix that no longer matches the backend (`route-prefix`);
- an edited generated file (`customised`), which may be a legitimate extension
  point or drift.

Each check is described in [Verify and audit](/en/larapack/verify).

## How drift is prevented with an agent {#guard}

A written rule holds while the agent remembers it, and halfway through a long
session it stops remembering. In a real application, agents kept
`return $request->handle();` in every controller LaraPack generated and lost it as
soon as they had to write one the generator couldn't: a desk, a token exchange, a
webhook. The project's `CLAUDE.md` forbade it in bold, and that wasn't enough.

So since LaraPack 9 the rule doesn't depend only on someone reading it. There are
four layers, each for a different moment:

| Layer | When it acts | What it does |
|---|---|---|
| **The skill and `AGENTS.md`** | Before writing | They explain the flow, where code goes and when to [declare an endpoint](/en/larapack/endpoints). `larapack:skill` installs the skill and a short block in `AGENTS.md` for Codex and other agents. |
| **The guard** | On every agent edit | Claude Code hooks that run `larapack:guard`: after every `Write` or `Edit`, the file goes through `verify`'s checks and, if it has errors, the agent gets the reason and the rule with the file still in front of it. At the end of the turn, `verify` on the project. Before every tool, it stops an exception from being approved. |
| **`larapack:verify`** | Whenever it runs | It checks every controller, request and resource in the project and its packages, not just generated code. |
| **CI** | On every PR and push | The "LaraPack verify" job runs `verify --strict` and the protected branch requires it. Exceptions are approved by the owner in a file that goes through their review. |

The first three help the agent stay on track; **the fourth is the one that doesn't
depend on it**. The guard only exists where the hooks are, and an agent working
without them, another editor, or a person in a hurry don't have it. The protected
branch does.

**The guard stays out of what isn't its business.** It only blocks for errors in the
file just touched; warnings are reported without holding anything back. At the end
of the turn it only holds back for what that session touched, so one console isn't
trapped by what another left half done. And it never blocks itself: broken input, a
file in `vendor/` or a project without `vendor/` let it through. That's why it's
turned on with `verify` green: in a project with existing errors, every edit to
those files would hold the agent back for something it didn't cause. How to install
it is in [Preparing the project](/en/ai/setup#guard).

**Exceptions belong to a person.** What genuinely can't follow the pattern —a webhook
that checks the signature over the raw body— is marked with
[`#[HandRolled('reason')]`](/en/larapack/verify#handrolled). The project owner
approves it with `larapack:hand-rolled approve`, which writes
`.larapack/hand-rolled.lock`, and the approval is the commit of that file
CODEOWNERS asks them to review. The guard blocks an agent that tries to edit it or
run `approve`.

### What it guarantees and what it doesn't

It guarantees **the shape**, deterministically:

- that every controller delegates to its request, hand-written ones included;
- that what isn't CRUD is declared, or is an exception a person approved;
- that generated code still says what the contract says;
- that none of that gets into the protected branch without passing
  `verify --strict`.

**It doesn't guarantee that the logic is right.** What the agent writes inside the
extension points —what the policy decides, which rows `canView()` lets through, what
an operation does— can have perfect shape and be wrong. That's covered by behaviour
tests and a person's review ([What a person reviews](/en/ai/review)). The generated
tests check that every action requires a session, asks authorization and goes
through its `ManagedFilter`, but not what authorization decides.

Nor is it airtight locally: an agent can write a file some way the guard doesn't
see, or work without hooks. What the guard doesn't stop, CI stops; what CI can't
know, the reviewer sees.

## What the reviewer gains

`laraimport.json` is the architecture decision. If the JSON is right, the generated
code is right by construction. Review stops being hundreds of lines of near-identical
controllers and migrations and becomes a small diff of the contract, the
authorization and the logic in the extension points. The order is in
[What a person reviews](/en/ai/review).

## Where to go next

1. [Preparing the project](/en/ai/setup): install the agent instructions and the
   guard, and pick a starting point.
2. [The agent loop](/en/ai/loop): the commands, their exit codes, and what the
   agent must and must not do.
3. [How to ask for things](/en/ai/prompting): domain-level requests and what
   counts as done.
4. [What a person reviews](/en/ai/review).
5. [What is not delegated](/en/ai/limits).
