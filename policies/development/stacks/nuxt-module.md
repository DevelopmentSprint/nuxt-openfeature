# Nuxt Module Development Policy

## Scope

Use this policy when creating or modifying reusable Nuxt modules (local modules or published packages).

## Module Contract

- Define modules with `defineNuxtModule` and include:
  - `meta.name`
  - `meta.configKey`
  - `meta.compatibility.nuxt`
- Keep the public module contract stable:
  - module options schema/types
  - runtime auto-import names
  - runtime component names
  - exported package entrypoints

## Runtime Config Boundary

- Put server-only values in `runtimeConfig.<configKey>`.
- Put client-safe values only in `runtimeConfig.public.<configKey>`.
- Never expose provider credentials, API keys, or internal connection settings via `runtimeConfig.public`.

## Runtime Registration Rules

- Resolve runtime paths via `createResolver(import.meta.url)`.
- Register only required assets:
  - composables with `addImportsDir`
  - server utilities with `addServerImportsDir`
  - components with `addComponentsDir`
  - plugins via `addPlugin` / `addServerPlugin`
  - handlers via `addServerHandler`
- Do not rely on app-level filesystem imports into module internals.

## Packaging Rules

- Export only stable public entrypoints from package `exports`.
- Ensure runtime files needed by consumers are included in build output.
- Keep Nuxt and major integrations as peer dependencies where appropriate.

## Testing Requirements

- Unit test module option normalization and helper utilities.
- Integration test module registration with a Nuxt fixture using `loadNuxt` + `buildNuxt`.
- Validate generated `.nuxt/imports.d.ts` includes expected auto-imports.
- For externally visible runtime behavior changes, require explicit UAT before release.

## Quality Gates

Run before delivery:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Review Checklist

- Config boundaries are correct (server vs public).
- No application code imports module internals by path.
- Public API changes are documented in specs and release notes.
- Fixture integration test still passes.
