# Repository Setup

One-time maintainer setup for OSS release infrastructure.

## 1) npm Trusted Publisher

Configure trusted publishing for `@developmentsprint/nuxt-openfeature`:

1. Open npm package access settings:
   - `https://www.npmjs.com/package/@developmentsprint/nuxt-openfeature/access`
2. In **Publishing access**, add a GitHub Actions trusted publisher with:
   - Owner: `DevelopmentSprint`
   - Repository: `nuxt-openfeature`
   - Workflow file: `npm-publish.yml`
   - Environment: _(leave blank)_
   - Allow direct publishing with `npm publish` (the release workflow uses it)

The GitHub transfer does not rename or transfer the npm scope. An npm account
with publish access to the `developmentsprint` organization must establish the
new package and configure its trusted publisher. Configure it for this exact
GitHub owner and workflow, not the old personal repository. See the
[npm trusted publishing instructions](https://docs.npmjs.com/trusted-publishers/).

The package must already exist on npm before configuring trusted publishing.
No npm token or other persistent credential belongs in GitHub Actions secrets
or workflow files. The workflow uses GitHub-hosted runners and Node 24 with
an npm version supporting trusted publishing (11.5.1 or newer).

### Publishing subsequent releases

1. Use a changeset to prepare a version PR and merge it into `main`.
2. In GitHub Releases, create and publish a stable release with a new `vX.Y.Z`
   tag targeting the merged commit. Its version must match `package.json`.
   Scoped tags `@developmentsprint/nuxt-openfeature@X.Y.Z` are also supported.
3. Watch the **Publish npm release** workflow and verify the npm version and
   provenance after it succeeds. Drafts and prereleases are skipped.

Create the release using a maintainer's GitHub session or authenticated CLI.
Releases created by another workflow's `GITHUB_TOKEN` do not trigger this
workflow. Changesets only opens version PRs; it does not publish packages or
create GitHub releases.

The preparation job checks that the tag matches the checked-out commit and
belongs to `main`, runs lint, type checks and tests, builds, and scans the
package archive for secrets and unexpected paths. Only the checked tarball is
uploaded, with one-day retention. The separate publish job verifies its digest
and uses OIDC; it does not check out source, install dependencies, or run package
lifecycle scripts. Private tracker files are excluded from Git and the package.

If validation fails, fix it through a new commit/version and release. If an
unpublished version fails only because npm trust was not configured, configure
trust and rerun the failed job. Never try to overwrite an existing npm version.

### Scope migration release

The migration prepares `@developmentsprint/nuxt-openfeature@0.2.5` and its
changelog directly. Do not add another version bump for the same migration.
Later releases use the normal Changesets workflow.

After publishing, verify the new package's name, version, repository and
integrity, and install it in a clean consumer before deprecating the old scope:

```bash
pnpm view @developmentsprint/nuxt-openfeature@0.2.5 name version repository dist.integrity
pnpm deprecate '@ribrewguy/nuxt-openfeature@*' 'Moved to @developmentsprint/nuxt-openfeature. Update your dependency, Nuxt modules list, and imports. See https://developmentsprint.github.io/nuxt-openfeature/getting-started/installation'
```

Deprecation requires an authenticated maintainer of the old npm package.
Keep its published versions available for existing lockfiles; do not unpublish
them. Verify the deprecation notice on npm after the command succeeds.

Confirm the maintainer-created GitHub release exists and that the GitHub Pages
deployment shows the same package version.

## 2) Branch Protection

Authenticate GitHub CLI, then apply protection for `main`:

```bash
gh auth login
scripts/oss/setup-branch-protection.sh DevelopmentSprint/nuxt-openfeature
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

## 3) Codecov Organization Setup

Enable `DevelopmentSprint/nuxt-openfeature` in the DevelopmentSprint Codecov
organization and ensure the Codecov GitHub App can access the repository.
In the organization's **Global Upload Token** settings, allow tokenless uploads
for public repositories so fork and Dependabot PRs can report coverage.

CI uses GitHub OIDC for pushes to `main` and tokenless uploads for public PRs.
It uploads only `coverage/lcov.info`. The old `CODECOV_TOKEN` secret is unused:
it routed uploads to `ribrewguy/nuxt-openfeature` after the GitHub transfer.
Remove that stale secret after the new upload path has been verified.

After a successful main build, check that the upload resolves to
`DevelopmentSprint/nuxt-openfeature` and the [main coverage badge](https://codecov.io/gh/DevelopmentSprint/nuxt-openfeature/branch/main/graph/badge.svg)
shows a percentage. A green CI job alone is insufficient because coverage
upload failures do not block CI. See [Codecov OIDC setup](https://github.com/codecov/codecov-action#using-oidc)
and [public tokenless uploads](https://docs.codecov.com/docs/codecov-tokens).
