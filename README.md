# @ribrewguy/nuxt-openfeature

[![codecov](https://codecov.io/gh/ribrewguy/nuxt-openfeature/graph/badge.svg)](https://codecov.io/gh/ribrewguy/nuxt-openfeature)

Nuxt 4 OpenFeature module extracted from the application repo.

📖 **Documentation:** https://ribrewguy.github.io/nuxt-openfeature/

## Install

```bash
pnpm add @ribrewguy/nuxt-openfeature
```

## Usage

```ts
export default defineNuxtConfig({
  modules: ['@ribrewguy/nuxt-openfeature'],
  openFeature: {
    providers: [
      {
        type: 'flagsmith',
        options: {
          apiUrl: process.env.FLAGSMITH_URL,
          environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY
        },
        providerOptions: {
          useFlagsmithDefaults: false
        }
      }
    ],
    publicFlags: {
      'beneficiaries-enabled': true
    }
  }
})
```

## Release

- Create a release changeset: `pnpm changeset`
- Merge to `main` so `changesets.yml` opens/updates the release PR
- Merge the release PR to bump versions and changelog
- Create and push tag `vX.Y.Z` for the release commit
- Ensure npm Trusted Publisher is configured for this repository/workflow
- Publish workflow uses npm trusted publishing with provenance (`--provenance`)
- One-time maintainer setup details: `REPOSITORY_SETUP.md`

## Commands

```bash
pnpm install                                                      # root deps
pnpm install --ignore-workspace --frozen-lockfile --dir docs       # docs deps (separate project)
pnpm prepare
pnpm dev
pnpm docs:dev
pnpm lint
pnpm docs:lint
pnpm typecheck
pnpm docs:typecheck
pnpm test
pnpm build
pnpm docs:build
pnpm changeset
pnpm version-packages
pnpm pack
```

## Documentation

- Live site: **https://ribrewguy.github.io/nuxt-openfeature/**
- Source: `docs/`
- Local docs dev server: `pnpm docs:dev`
- Hosting: GitHub Pages, deployed automatically from `main` by `.github/workflows/docs-pages.yml`
- No third-party platform secrets required
- `docs/` is a standalone pnpm project (not in the root workspace), so its dependencies are installed separately. See `docs/README.md` for details.

## Git Hooks (Husky)

- `pre-commit`: runs `pnpm secrets:scan`, `pnpm lint`, and `pnpm typecheck`
- `pre-push`: runs `pnpm secrets:scan:full` and `pnpm test`
