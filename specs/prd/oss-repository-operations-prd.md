# PRD: OSS Repository Operations

## Document Control

- Product Area: Repository operations
- Status: Draft baseline
- Owner: Repository maintainer

## Problem Statement

The repository hosts a published Nuxt module plus a documentation site.
The current docs deploy depends on Vercel secrets that have not been
provisioned, so the docs site has never gone live. The docs workspace
configuration causes Dependabot lockfile drift on every `/docs` PR. The
project also has no publicly visible code coverage signal, which is a
baseline expectation for OSS quality posture.

## Business Intent

Minimize operational surface area for shipping and consuming this OSS
Nuxt module: zero-secret docs deploys, friction-free dependency updates,
and publicly visible quality signal.

## Functional Requirements

1. Docs site SHALL deploy on push to `main` with no third-party platform
   secrets, and SHALL build on every PR as a quality gate.
2. Docs site SHALL maintain an independent dependency lockfile so
   `/docs` Dependabot PRs do not require cross-project reconciliation.
3. Test runs SHALL produce lcov-format coverage and SHALL fail when
   coverage falls below the configured thresholds, so a coverage drop
   blocks the merge; the repository README SHALL show a publicly visible
   coverage badge for `main`.

## Non-Goals

- Replacing the published module's distribution model (it is a library).
- Per-PR coverage reports or delta comments from an external service.
- Hosting marketing or landing pages outside the docs site.

## Architecture Implications

- Docs hosted on GitHub Pages via the official Pages Actions workflow
  (OIDC-authenticated, no external platform secrets).
- `docs/` is a standalone pnpm project, not a workspace package; CI
  installs it explicitly.
- Coverage uses the Vitest v8 provider. Thresholds live in the Vitest
  config and are enforced by the required validation check. Codecov
  receives only `main`'s coverage, for the badge, authenticated with
  GitHub OIDC so uploads are bound to the current repository owner.

## Acceptance Intent

- A push to `main` results in an updated, publicly reachable docs site
  with no manual deploy steps.
- A Dependabot PR for any `/docs` dependency passes CI without human
  lockfile intervention.
- The README displays a current coverage badge for `main`; a PR that
  lowers coverage below the thresholds fails its required check.

## Security & Privacy Considerations

- GitHub Pages deploy authenticates via OIDC (no long-lived deploy keys
  or platform tokens stored in repo secrets).
- Coverage upload contains only line/branch counts, no source code.
- No new external platform credentials required; Vercel secret references
  are removed from workflows and documentation.
