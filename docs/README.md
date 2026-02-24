# Docs App

Nuxt documentation site for `@ribrewguy/nuxt-openfeature`.

## Commands

```bash
pnpm docs:dev
pnpm docs:typecheck
pnpm docs:build
```

## Vercel Deployment (GitHub Actions)

This repo deploys docs with two workflows:

- Preview deployments on pull requests: `.github/workflows/docs-preview.yml`
- Production deployments on `main`: `.github/workflows/docs-production.yml`

Required GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_DOCS_PROJECT_ID`

Vercel project setup requirements:

- Create a Vercel project for docs.
- Set its root directory to `docs`.
- Keep the Production Branch as `main`.
