# Realigning an existing project

Since 9.4.0, `larapack:realign` brings a project that drifted back to its contract —generated with an old LaraPack version, with code edited outside the holes, with hand-written controllers and models, or with no contract at all— **without rebuilding it**. Everything ships with the package: the diagnosis, the resumable plan, the automatic fixes, the instructions for each manual step, the decisions and the exceptions the owner approves. Nobody needs to write a per-project prompt or ask anyone how it is done.

The full guide, with every action, format and risk, ships with the package (in Spanish): [`docs/realign/`](https://github.com/innoboxrr/larapack-generator/blob/master/docs/realign/README.md). This page is the map.

## If you arrive with no context

```bash
php vendor/bin/builder larapack:realign status
```

It says whether a realignment is in progress, where it stands and what the next step is. With no plan, it says to diagnose.

## The four categories {#categories}

Everything the diagnosis finds falls into one of four categories, the same in the report, the plan and every command's output:

| Category | What it is | Who does it |
|---|---|---|
| `deterministic` | Applied with one command and checked without opinion. Whatever it does not recognise with certainty it skips, saying why. | The tool (`apply`, `adopt`). |
| `guided` | Mechanical work that cannot be automated with certainty: moving logic into its request, returning code to its holes. The package gives the instructions (a playbook) and a concrete check says when it is done. | A person or an agent. |
| `decision` | More than one legitimate answer, and it changes behaviour or scope. | **The project owner. Never an agent on its own.** |
| `out_of_scope` | Not LaraPack's: domain, services, custom front end, migration history. | Nobody: it is counted and left alone. |

## For a person {#person}

On a project with a contract. Without one, start with `larapack:realign infer`, which drafts the `laraimport.json` from the code.

```bash
git switch -c realign                                               # a branch, with a clean tree
php vendor/bin/builder larapack:realign diagnose                    # compares the project with its contract; writes no code
php vendor/bin/builder larapack:realign plan                        # turns that into steps
php vendor/bin/builder larapack:realign apply --deterministic --dry-run
php vendor/bin/builder larapack:realign apply --deterministic       # run your tests and commit
php vendor/bin/builder larapack:realign diagnose                    # another pass, until apply has nothing left
php vendor/bin/builder larapack:realign next                        # the next step, with its instructions
php vendor/bin/builder larapack:realign check <id>                  # done? one commit per step
php vendor/bin/builder larapack:realign brief                       # what only the owner decides or approves
php vendor/bin/builder larapack:realign done                        # 0: finished; otherwise it says what is missing
```

A step that changes behaviour asks for its test: `check <id> --tested="<the test command you ran and passed>"`. Without it the step stays `untested`, and `done` does not finish until it is tested or the owner accepts it.

## For an AI agent {#agent}

Every command outputs JSON with `--format=json`. The full recipe is in the package guide and `larapack:skill` installs it.

1. `realign status`; with no plan or a stale one, `diagnose` and `plan`.
2. `apply --deterministic` (first with `--dry-run`), tests, commit, and another pass until nothing automatic is left.
3. `realign next`, then by `step.category`: `deterministic`, run the command; `guided`, follow the playbook to the letter; `decision`, **do not decide**: present the options to the owner and carry on with what does not depend on them.
4. `realign check <id>`; with `done: true`, commit and go back to 3.
5. What cannot be done now, `defer`; what belongs to the owner, `escalate`; when only the owner's part is left, `brief`.
6. **Never** run `realign decide`, `hand-rolled approve` or `realign accept-untested`: the agent guard blocks them.
7. It is finished when `realign done` exits with 0.

## What it guarantees, and what it does not {#guarantees}

- **It never writes or rewrites a migration**, and never touches what it does not recognise with certainty.
- **The state lives in the project** (`.larapack/realign/`): another person or agent picks it up tomorrow with `status` and `next`. Commit `plan.json` and `exceptions.json`.
- **It does not open mass assignment on its own**: nothing is added to `$fillable`, `$creatable` or `$updatable` without a person deciding.
- **Whoever requests an exception does not approve it**: the owner does, in their terminal or in the GitHub approval workflow, and CODEOWNERS reviews the lock in CI.
- **It finishes on a criterion that is not an opinion**: `done` diagnoses again and fails while any step, decision, untested step, unapproved exception or `validate --strict` / `verify --strict` warning remains.

The risks of each operation, with how to undo it, are in [`docs/realign/risks.md`](https://github.com/innoboxrr/larapack-generator/blob/master/docs/realign/risks.md).
