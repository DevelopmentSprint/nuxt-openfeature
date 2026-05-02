---
'@ribrewguy/nuxt-openfeature': patch
---

**Release infra:** unify versioning and publishing into a single `changesets.yml` workflow.

The previous `changesets.yml` only created the version PR; a separate `publish.yml` was supposed to handle npm publish on tag push. But `changesets.yml` had no `publish:` directive configured, so it never created the `vX.Y.Z` tag — meaning `publish.yml` never fired and releases stalled at the version-bump commit on `main`.

This consolidation:

- `changesets.yml` now declares `id-token: write`, configures `actions/setup-node` with `registry-url`, and passes `publish: pnpm release` to `changesets/action@v1`. After a release PR merges, the action calls `pnpm release` (alias for `changeset publish`) which both pushes the `vX.Y.Z` tag and runs `npm publish` with provenance.
- `package.json#publishConfig.provenance: true` ensures `npm publish` always includes provenance attestation, no flag needed.
- `publish.yml` removed; the tag-push pipeline is no longer needed.
- `REPOSITORY_SETUP.md` updated to point npm Trusted Publisher at `changesets.yml` (was `publish.yml`).
- `scripts/oss/setup-branch-protection.sh` no longer lists `analyze (javascript-typescript)` as required (it stopped running on PRs after the CI consolidation; was already removed from live branch protection).

**Action required:** the npm Trusted Publisher config on the package (npmjs.com → package access) must be updated to reference `changesets.yml` instead of `publish.yml`. Without that update, the next release will fail at npm publish with an unauthorized error.
