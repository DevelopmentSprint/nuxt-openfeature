# Docs App

Nuxt documentation site for `@ribrewguy/nuxt-openfeature`. Hosted on GitHub Pages.

## Project structure

`docs/` is a standalone pnpm project with its own `pnpm-lock.yaml`. It is NOT part of the root pnpm workspace, so install its dependencies explicitly.

## Commands

From the repository root:

```bash
pnpm docs:dev          # Run the dev server
pnpm docs:typecheck    # Type check
pnpm docs:build        # Build (Nitro server bundle)
```

From `docs/`:

```bash
pnpm install --ignore-workspace --frozen-lockfile    # Install (use --ignore-workspace from inside docs/)
pnpm generate                                         # Pre-render the static site (output: docs/.output/public)
```

## Deployment

Pushes to `main` are deployed automatically by `.github/workflows/docs-pages.yml` to GitHub Pages. Pull requests run a build-only check.

Repository setting required (one-time): **Settings → Pages → Source = GitHub Actions**.

No third-party platform secrets are required.
