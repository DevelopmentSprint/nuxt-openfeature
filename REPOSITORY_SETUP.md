# Repository Setup

One-time maintainer setup for OSS release infrastructure.

## 1) npm Trusted Publisher

Configure trusted publishing for `@ribrewguy/nuxt-openfeature`:

1. Open npm package access settings:
   - `https://www.npmjs.com/package/@ribrewguy/nuxt-openfeature/access`
2. In **Publishing access**, add a GitHub Actions trusted publisher with:
   - Owner: `ribrewguy`
   - Repository: `nuxt-openfeature`
   - Workflow file: `publish.yml`
   - Environment: _(leave blank)_

This matches `.github/workflows/publish.yml`, which already uses:

- Node 24
- `permissions.id-token: write`
- `pnpm publish --access public --provenance`

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
  - `analyze (javascript-typescript)`
- stale review dismissal
- one approval required
- no force pushes or deletions
- linear history
- conversation resolution before merge
