---
'@ribrewguy/nuxt-openfeature': patch
---

**Chore:** upgrade `eslint` 9.39.2 → 10.4.0 and `@eslint/js` 9.39.4 → 10.0.1.

Supersedes Dependabot PR #75. Deferred from the dp7 upgrade sweep because major linter bumps historically require config migration; turned out our flat-config (`eslint.config.mjs`) uses only `js.configs.recommended` + `@typescript-eslint/parser`, so no rule or plugin migration is needed. `pnpm lint` and `pnpm docs:lint` pass clean under eslint 10 with the existing config.

Dev-only tooling — no impact on the published runtime.
