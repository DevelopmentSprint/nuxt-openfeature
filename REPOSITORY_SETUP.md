# Repository Setup

One-time maintainer setup for OSS release infrastructure.

## 1) npm Trusted Publisher

Configure trusted publishing for `@ribrewguy/nuxt-openfeature`:

1. Open npm package access settings:
   - `https://www.npmjs.com/package/@ribrewguy/nuxt-openfeature/access`
2. In **Publishing access**, add a GitHub Actions trusted publisher with:
   - Owner: `ribrewguy`
   - Repository: `nuxt-openfeature`
   - Workflow file: `changesets.yml`
   - Environment: _(leave blank)_

This matches `.github/workflows/changesets.yml`, which:

- Runs on `push` to `main`
- Sets `permissions.id-token: write` for OIDC trusted publishing
- Configures `actions/setup-node` with `registry-url: https://registry.npmjs.org/`
- Invokes `changesets/action@v1` which calls `pnpm release` (alias for `changeset publish`) when no changesets remain after a release-PR merge
- `provenance: true` in `package.json#publishConfig` flows automatically into `npm publish --provenance`

## 2) Branch Protection

Authenticate GitHub CLI, then apply protection for `main`:

```bash
gh auth login
scripts/oss/setup-branch-protection.sh ribrewguy/nuxt-openfeature
```

If the repo is newly created and has no remote branches yet, push `main` first:

```bash
git push -u origin main
```

The script enforces:

- required checks:
  - `validate`
  - `dependency-review`
- stale review dismissal
- one approval required
- no force pushes or deletions
- linear history
- conversation resolution before merge
