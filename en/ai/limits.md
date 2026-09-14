# What is not delegated

Deciding the domain, granting permissions in policies, handling credentials and
secrets, releasing a version, and migrating a production database. **The agent can
propose it; a person confirms it.**

It isn't distrust of the agent. These are the decisions whose mistakes no tool
detects, or that can't be undone.

| Task | The agent | A person |
|---|---|---|
| Write and validate `laraimport.json` | Proposes it | Decides the domain and approves the diff |
| Generate, fill extension points, verify, test | Does it | Reviews |
| Open a policy ability, change visibility | Proposes it | Grants it |
| Credentials, `.env`, CI secrets | Doesn't touch them | Manages them |
| Bump `VERSION` and release | Drafts the `CHANGELOG` | Decides what ships, and when |
| Migrations | Writes and runs them locally | Migrates production |

## Deciding the domain

`laraimport.json` is the architecture decision: which entities exist, how they relate,
which table is an immutable log, which data is secret. The agent drafts it very well
from a description, but it doesn't know the business. A badly chosen relation is
generated perfectly and coherently, and `validate` and `verify` accept it. That's why
the JSON diff is the first thing a person reviews.

## Granting permissions

The policy is born closed on purpose: only the admin passes. Every ability that gets
opened, every row `ManagedFilter::canView` lets through, and every `forceDelete` taken
out of `$exceptAbilities` is a security decision. A mistake here breaks no generated
test: it becomes a data leak.

**Who is an admin** isn't delegated either. In the base application it's decided by
`ADMIN_EMAILS` in `.env` (`config('auth.admins')`), and the policies, the `admin`
middleware, impersonation, the log viewer and the `.env` editor all depend on it.

## Credentials and secrets

The `.env`, service keys, `COMPOSER_AUTH`, npm and S3 configuration don't go through
the agent: it doesn't read them "to try something", and it doesn't paste them into a
commit, a log or a reply.

- **A column holding a secret is declared `secret`.** It never leaves through the API,
  the export or the table, and exposing it "for debugging" is exactly what `verify`
  flags as `secret-exposed`.
- **Never store secrets in `laravel-options`**: its index is publicly readable,
  because it feeds the site.
- **The base application's `.env` editor** sits behind `web`, `auth` and `admin`;
  anyone who is an admin sees the whole `.env`.

## Releasing a version

In the ecosystem, releasing means bumping `VERSION` (or `package.json`'s `version`)
and pushing to `master`. If the tests pass, CI creates the tag and Packagist or npm
publish it. A tag that already exists isn't recreated: a released version isn't
fixed, a new one is released.

The agent can prepare the `CHANGELOG` and the `VERSION` bump on a branch. What ships,
with which number, and what's promised to whoever upgrades is decided by a person. See
[Releasing a version](/en/ci/releasing).

## Migrating a production database

An alter migration can drop a column with its data or change its type with
`->change()`, and a foreign-key change is written by hand. Locally, the agent writes
and runs them as many times as needed. In production, someone reads the migration,
checks there's a backup, and runs `php artisan migrate --force` knowing what it does.

## What it can do on its own

The whole local loop, without asking permission at every step: read the schema,
declare, validate, generate, fill the extension points, verify, test, audit, and draft
the `CHANGELOG`. That's what the loop and its exit codes are for: see
[The agent loop](/en/ai/loop).
