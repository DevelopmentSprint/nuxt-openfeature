---
'@ribrewguy/nuxt-openfeature': patch
---

**Tooling:** add code coverage reporting via Vitest v8 provider with Codecov upload.

- New `pnpm test:coverage` script runs the existing test suite with coverage instrumentation, emitting `text-summary`, `lcov`, and `json-summary` reports under `coverage/`.
- Coverage scope is `src/**/*.{ts,vue}` minus tests, types, and shims. Components, composables, and Nuxt plugins are explicitly *included* — coverage is for visibility, not vanity.
- CI runs coverage on every push and PR via `ci.yml`'s `Test (with coverage)` step, then uploads `coverage/lcov.info` to Codecov via `codecov/codecov-action@v5`.
- README displays a Codecov badge linking to the project's coverage page.
- No coverage thresholds enforced — the OSS repo PRD intentionally favours visibility before gating, so contributors see drops without merge friction.

Maintainers should set the `CODECOV_TOKEN` repository secret. Codecov works tokenless on public repos but the token improves reliability for fork PRs.
