---
'@ribrewguy/nuxt-openfeature': patch
---

**Feature:** expose all three Vercel provider configuration paths and document them on the docs site.

### Code

The Vercel provider wrapper now supports three configuration paths, all backwards compatible:

1. **Env-driven (Path 1, existing)** — set `FLAGS=flags:?sdkKey=vf_server_...` (Vercel's auto-provisioned env var) and configure with `{ type: 'vercel' }`. `@vercel/flags-core` lazily reads `process.env.FLAGS`.
2. **Explicit connection string (Path 2, new)** — pass via `options.connectionString`:
   ```ts
   { type: 'vercel', options: { connectionString: process.env.MY_FLAGS_KEY } }
   ```
   Accepts both URI form (`flags:?sdkKey=vf_server_...`) and raw SDK key (`vf_server_...`). Passes directly to `new VercelProvider(connectionString)`.
3. **Pre-built `FlagsClient` (Path 3, existing — moved namespace)** — pass via `providerOptions.flagsClient`. For advanced use (custom polling/streaming, shared clients, testing stubs).

Resolution order: explicit `flagsClient` > explicit `connectionString` > env-driven default. Backwards compatible: `{ type: 'vercel' }` with no options still works exactly as in 0.2.2.

Naming aligns with peer providers — credentials in `options`, behavior tweaks in `providerOptions`:

| Provider | Credential slot | Behavior slot |
|---|---|---|
| Flagsmith | `options.environmentKey`, `options.apiUrl` | `providerOptions.useFlagsmithDefaults` |
| PostHog | `options.apiKey`, `options.host` | `providerOptions.sendFeatureFlagEvents` |
| **Vercel** | **`options.connectionString`** | `providerOptions.flagsClient` |

### Docs

- **`docs/content/providers/vercel.md`** — full rewrite to document all three paths with examples and a "when to use which" matrix. Explains the connection-string format and that there is no separate team/project/token config (it's all encoded in the SDK key).
- **`docs/content/getting-started/configuration.md`** — backfilled PostHog `options` table, PostHog `providerOptions` table, Vercel `options` table, Vercel `providerOptions` table. Added PostHog and Vercel sections to the Environment Variables reference. Updated the cross-provider `options`/`providerOptions` row to include Vercel.

### Tests

7 new path-specific test cases in `test/unit/providers/vercel.test.ts`:

- Path 1: no options → default `flagsClient` used
- Path 1: empty objects also fall through to default
- Path 2: connection string (URI form) passed directly to constructor
- Path 2: raw SDK key form also accepted
- Path 3: pre-built `flagsClient` passed directly
- Precedence: `flagsClient` wins over `connectionString`
- Precedence: `connectionString` wins over env-driven default

181/181 tests passing.
