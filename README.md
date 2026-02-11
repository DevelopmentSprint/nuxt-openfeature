# @northloopstrategies/nuxt-openfeature

Nuxt 4 OpenFeature module extracted from the application repo.

## Install

```bash
pnpm add @northloopstrategies/nuxt-openfeature
```

`.npmrc` (consumer):

```ini
@northloopstrategies:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
always-auth=true
```

## Usage

```ts
export default defineNuxtConfig({
  modules: ['@northloopstrategies/nuxt-openfeature'],
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

- Version with semver in `package.json`
- Create tag `vX.Y.Z`
- Push tag to trigger publish workflow
- Publish workflow uses built-in `GITHUB_TOKEN` with `packages: write` permission (no custom `GITHUB_*` secret needed)

## Commands

```bash
pnpm install --ignore-workspace
pnpm prepare
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack
```

## Git Hooks (Husky)

- `pre-commit`: runs `pnpm secrets:scan`, `pnpm lint`, and `pnpm typecheck`
- `pre-push`: runs `pnpm secrets:scan:full` and `pnpm test`
