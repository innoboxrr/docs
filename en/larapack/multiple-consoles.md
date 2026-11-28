# Many consoles at once

Ten or twenty agents —or people— on the same project, each on its own branch or worktree, integrated later. Since 9.4.0 LaraPack supports it: generated code comes from the contract, so two branches do not merge generated code, **they merge the contract and regenerate**. What a person did write (the holes, hand-written controllers) is merged by git, and if it conflicts, whoever wrote it resolves it.

The full guide, with what was measured across seventeen branches merged in five different orders, ships with the package (in Spanish): [`docs/swarm.md`](https://github.com/innoboxrr/larapack-generator/blob/master/docs/swarm.md).

## Each console, before pushing {#console}

1. **Its own branch or worktree**, starting from an up-to-date integration branch. Two consoles never share a directory.
2. **The whole loop**: edit `laraimport.json`, `validate`, `import --force`, fill the holes, `verify --strict` and the tests. A `laraimport.json` changed without importing again is the `contract-outdated` error.
3. **Never resolve by hand** a conflict in `laraimport.json` or `.larapack/manifest.json`.
4. **Declare instead of hand-writing**: a declared endpoint merges by name; a hand-written one, line by line.

## Whoever integrates {#integrate}

One branch at a time:

```bash
git merge --no-ff --no-commit <branch>
php vendor/bin/builder larapack:reconcile          # --dry-run says what it would do
php vendor/bin/builder larapack:verify --strict
git add -A && git commit
```

`larapack:reconcile` merges the laraimport by name (models, columns, endpoints), rebuilds the manifest from both branches, merges the language files key by key, drops the duplicate migration the incoming branch brings and imports again. What is not its call —the same endpoint declared differently on two branches, two consoles in the same hole— it names and exits with an error.

## What `verify` detects in a merge {#verify}

| Check | What it detects |
|---|---|
| `contract-outdated` | The generated code belongs to another contract: the laraimport changed and was not imported again. |
| `manifest-unreadable` | The manifest has conflict markers or comes from a later version: no command rewrites it. |
| `merge-conflict` | Unresolved conflict markers in the laraimport, in LaraPack's state or in any code file of the project (PHP, JSON, JS, TS, Vue). |
| `migration-duplicate` | Two migrations that create the same table or add the same column. |
| `route-duplicate` | A generated routes file that registers the same verb and URI twice: Laravel keeps the last one silently. |

`larapack:ci` adds `larapack:reconcile --check` and, if the project uses Pint, `pint --test` to the gate workflow.

## What the package cannot guarantee {#limits}

- That two consoles do not make incompatible decisions: it is detected, not chosen.
- That the logic in two branches' holes is coherent: the project's tests say that.
- That a dropped migration had not already run on a shared database.
- With squash or rebase there are no two parents: only merge is covered by tests.
