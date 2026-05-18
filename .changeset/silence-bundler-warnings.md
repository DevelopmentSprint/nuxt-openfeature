---
'@ribrewguy/nuxt-openfeature': patch
---

**Fix:** silence consumer-bundler "could not be resolved – treating it as an external dependency" warnings for optional provider SDKs.

`0.2.1` (bead `cfb`) moved optional SDK imports from static to dynamic `await import('posthog-node')`, which fixed the runtime hazard but left the warning intact because Rollup/Vite statically analyzes dynamic imports with literal-string arguments. When the consumer hadn't installed the optional peer, Rollup still warned at build time even though the runtime path was sound.

This patch defeats the static analysis via variable-string indirection:

```ts
const posthogSpecifier = 'posthog-node'
const mod = (await import(posthogSpecifier).catch(() => {
  throw new Error("PostHog provider configured but 'posthog-node' is not installed. Run: pnpm add posthog-node")
})) as typeof import('posthog-node')
```

Rollup leaves dynamic imports with non-literal arguments completely untouched and emits no resolution warning. The `as typeof import(...)` cast restores typing; the `import type` declarations at the top of each plugin keep the IDE happy.

**Empirically verified** against an isolated Rollup build:

- `0.2.1` dist → `(!) Unresolved dependencies` warning for `@vercel/flags-core`, `@vercel/flags-core/openfeature`, `posthog-node`, `flagsmith-nodejs`, `@openfeature/flagsmith-provider`.
- This patch's dist → zero warnings.

Same dynamic-import boundary as `0.2.1`: runtime behavior is identical, install hints still fire if a configured provider's SDK is missing. Affects three files: `src/runtime/server/plugins/{posthog,vercel,flagsmith}/index.ts`. Existing 176 unit/integration tests still pass (vitest mocks resolve by module specifier, which is unchanged regardless of literal-vs-variable).
