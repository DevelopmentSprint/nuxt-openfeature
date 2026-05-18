---
'@ribrewguy/nuxt-openfeature': patch
---

**Chore:** coordinated package upgrade sweep — supersedes 13 individual Dependabot PRs that were blocked by lockfile sync and Nuxt 4.4 type skew.

Bumps in one coherent change so peer-deps line up across the graph:

**Root devDependencies:**
- `nuxt` 4.3.1 → 4.4.6 (was #78)
- `@nuxt/kit` 4.3.1 → 4.4.6 (was #86)
- `vue` 3.5.33 → 3.5.34 (was #83)
- `vue-tsc` 3.2.7 → 3.3.0 (was #68)
- `@tanstack/vue-query` 5.100.7 → 5.100.10 (was #84)
- `@typescript-eslint/parser` 8.59.1 → 8.59.4 (was #81)
- `h3` 1.15.5 → 1.15.11 (was #71)
- `posthog-node` 5.33.0 → 5.34.4 (was #85)
- `@changesets/cli` 2.29.8 → 2.31.0 (was #70)

**Docs devDependencies:**
- `nuxt` 4.4.4 → 4.4.6 (was #77)
- `tailwindcss` 4.2.4 → 4.3.0 (was #80)
- `@iconify-json/simple-icons` 1.2.80 → 1.2.82 (was #79)
- `@iconify-json/lucide` 1.2.105 → 1.2.107 (was #82)

**Fix landed alongside the bumps:** added `pnpm.overrides.vite: "^7.3.3"` to root `package.json`. Without it, `nuxt 4.4` pulls `vite@7.3.3` while `@nuxt/test-utils@3.23` and `@vitest/coverage-v8@3.2.4` still resolve `vite@7.3.3`'s peer down to `vite@7.3.1`, producing two Vite versions in the graph. The TS2769 typecheck error on `vitest.config.ts` `plugins: [vue()]` came from `@vitejs/plugin-vue@6` being resolved against the newer Vite types while `vitest`'s `defineConfig` was resolved against the older ones. The override forces a single `vite@7.3.3` and eliminates the skew.

**Out of scope (left as open PRs):**
- `eslint` 9 → 10 (#75) — major bump, requires `eslint.config.mjs` migration.
- `actions/dependency-review-action` 4 → 5 (#76) — GH Action, unrelated to lockfile sync.
- `chore(release): version packages` (#63) — release-trigger PR.

After this lands, Dependabot PRs #68, #70, #71, #77-86 (except #75 and #76) will be closed as superseded.
