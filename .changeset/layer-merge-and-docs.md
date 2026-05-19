---
'@ribrewguy/nuxt-openfeature': patch
---

**Fix:** make module config layer-aware. Previously, `openFeature` config defined in a parent Nuxt layer was silently dropped — the module only read the final app's `nuxt.options.openFeature` and relied on Nuxt's default `defu`-based merging, which overwrites arrays rather than concatenating and (for arbitrary module config keys) may not populate from the layer chain reliably.

The module now walks `nuxt.options._layers` explicitly and merges with deterministic semantics:

| Field | Merge rule |
|---|---|
| `providers` | Concatenated **app-first** across the chain. App-layer providers appear FIRST so they win under `FirstMatchStrategy`. Parent layers act as fallbacks. |
| `publicFlags` | Deep-merged, child layers win on key collision. |
| `flagRouteBase` | Last-defined wins (app overrides parent). |

A new integration test (`test/integration/layers.integration.test.ts`) builds a real Nuxt fixture with `extends:` to a parent layer that defines providers + `publicFlags`. The app declares no `openFeature` config. The test verifies `runtimeConfig.openFeature` is populated entirely from the parent layer — this is the exact case that was silently broken before.

**Docs cleanup shipped alongside:**

- **TOC ordering** — all docs files renamed with Nuxt Content v3 numeric prefixes (`1.installation.md`, `2.configuration.md`, etc.). Top-level directories follow the same convention. The layout's hardcoded priority map is removed since Nuxt Content's natural sort now handles ordering. URLs are unchanged (prefixes are stripped from slugs).
- **Escape artifacts** — `\\|` in the configuration reference tables corrected to `\|`. Previously these rendered as literal `\|` instead of `|`.
- **`publicFlags` documentation** — dedicated section explaining what it does (allowlist + type contract + worst-case fallback), why it's separate from provider config, the common pitfall of seeing `{ flags: {} }` from the batch endpoint, and how to choose the default value.
- **Nuxt Layers section** — documents the merge semantics with examples, including how to add an override provider on top of a parent layer's defaults.

**Code surface:** new exported helper `mergeOpenFeatureLayerOptions` in `src/utils/options.ts`. The module's `setup` now passes layer-merged options through `normalizeOpenFeatureOptions`. Backwards compatible for non-layered projects.
