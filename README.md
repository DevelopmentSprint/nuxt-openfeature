# @developmentsprint/nuxt-openfeature

[![codecov](https://codecov.io/gh/DevelopmentSprint/nuxt-openfeature/graph/badge.svg)](https://codecov.io/gh/DevelopmentSprint/nuxt-openfeature)

Nuxt 4 OpenFeature module extracted from the application repo.

📖 **Documentation:** https://developmentsprint.github.io/nuxt-openfeature/

## Install

```bash
pnpm add @developmentsprint/nuxt-openfeature
```

## Usage

```ts
export default defineNuxtConfig({
  modules: ['@developmentsprint/nuxt-openfeature'],
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

## Migrate from @ribrewguy

Replace `@ribrewguy/nuxt-openfeature` with `@developmentsprint/nuxt-openfeature` in your dependencies, Nuxt `modules` list, and package imports. Version 0.2.5 continues the existing version history; the scope change does not change the `openFeature` configuration key or runtime APIs. See the [migration guide](https://developmentsprint.github.io/nuxt-openfeature/getting-started/installation).

## License

[MIT](./LICENSE).

## Release

1. Create a release changeset: `pnpm changeset`.
2. Merge to `main` so `changesets.yml` opens or updates the version PR.
3. Merge the version PR, then publish a GitHub release targeting that commit on
   `main`, with tag `vX.Y.Z` matching `package.json`.
4. `npm-publish.yml` validates, builds, checks the package contents, and publishes
   to npm with provenance through OIDC. Drafts and prereleases do not publish.

Configure the npm trusted publisher for `npm-publish.yml` first; see
[repository setup](REPOSITORY_SETUP.md). Ordinary merges only prepare versions.
An already published npm version cannot be republished.

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

- Live site: **https://developmentsprint.github.io/nuxt-openfeature/**
- Source: `docs/`
- Local docs dev server: `pnpm docs:dev`
- Hosting: GitHub Pages, deployed automatically from `main` by `.github/workflows/docs-pages.yml`
- No third-party platform secrets required
- `docs/` is a standalone pnpm project (not in the root workspace), so its dependencies are installed separately. See `docs/README.md` for details.

## Git Hooks (Husky)

- `pre-commit`: runs `pnpm secrets:scan`, `pnpm lint`, and `pnpm typecheck`
- `pre-push`: runs `pnpm secrets:scan:full` and `pnpm test`
