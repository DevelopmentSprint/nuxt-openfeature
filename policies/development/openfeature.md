# OpenFeature Module Policy

## Scope

Use this policy for OpenFeature behavior in this repository's Nuxt 4 module.

## Architectural Rules

- Evaluate feature flags on the server.
- Client code may request evaluated values, but must not initialize OpenFeature providers directly.
- Provider setup is centralized in server plugins.
- When multiple providers are configured, provider resolution strategy must be explicit and deterministic.

## Configuration Rules

- OpenFeature options are configured through the module config key (`openFeature`).
- Public runtime configuration is limited to client-safe routing/settings (for example, route base).
- Provider credentials or secrets must remain server-only.

## Context Propagation Rules

- Context sent from client to server must use shared helper APIs for encoding/decoding.
- Apply strict limits for context payload size/chunk count and reject invalid payloads.
- Verify payload integrity before using context for evaluation.

## API Surface Rules

- Flag endpoints must be namespaced under configured route base.
- Response contracts must be stable and typed.
- Error behavior must fail safe (default values, diagnostics, and no secret leakage).

## Security and Privacy

- Never return provider credentials or internal provider config to clients.
- Do not expose raw request headers in diagnostics responses.
- Treat user traits in evaluation context as sensitive; collect only fields required for targeting.

## Testing Requirements

- Unit tests for env/provider normalization and context encoding limits.
- Integration tests that verify runtime registration and endpoint availability.
- Regression coverage for default fallback behavior when providers fail.

## Observability Requirements

- Emit warnings for malformed context payloads and evaluation fallbacks.
- Keep logs free of secrets and high-cardinality raw context payloads.

## Change Management

- Any change to provider semantics, evaluation defaults, or context format requires:
  - architecture spec update
  - feature spec update
  - integration test updates
