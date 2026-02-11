# Architecture: Nuxt OpenFeature Module

## Scope

Defines technical boundaries and runtime behavior for `@nls/nuxt-openfeature`.

## System Boundaries

- Module boundary:
  - Nuxt module setup (`defineNuxtModule`) configures runtime assets and handlers.
- Server boundary:
  - Provider initialization and flag evaluation run in Nitro/server runtime.
- Client boundary:
  - Client requests evaluated values and contributes optional evaluation context.

## Runtime Configuration Model

- Server config: `runtimeConfig.openFeature`
  - provider definitions
  - server evaluation settings
- Public config: `runtimeConfig.public.openFeature`
  - client-safe route base and related non-secret settings

Hard rule: server secrets and provider credentials must never be copied into `runtimeConfig.public`.

## Core Components

- Module setup: registers composables, components, plugins, server handlers.
- Server provider plugin: constructs provider(s), initializes OpenFeature client.
- Server flag utilities: evaluate flags with typed default/fallback behavior.
- Client context plugin: attaches bounded context headers to flag API requests.
- Context header utilities: shared encoding/decoding and integrity checks.

## Data Flow

1. App config enables module and sets `openFeature` options.
2. Module setup normalizes options and writes runtime config.
3. Server plugin initializes provider(s) from runtime config.
4. Client calls flag API endpoints.
5. Server reads and validates context headers.
6. Server evaluates flags and returns typed flag map/value.

## Provider Strategy

- Single provider: evaluate directly against configured provider.
- Multiple providers: evaluate using explicit first-match strategy.
- No provider: return defaults and keep behavior non-fatal.

## Failure Semantics

- Provider init/evaluation errors must not crash request handling.
- Flag evaluation returns provided default values on failure or timeout.
- Invalid context payloads are rejected as client errors.

## Security Constraints

- No secret leakage via API responses, logs, or public runtime config.
- Context payload size/chunk limits are enforced server-side.
- Context integrity is verified prior to use.

## Test Architecture Requirements

- Unit tests for option normalization and utility behavior.
- Unit tests for context parsing/size-limit handling.
- Integration test with Nuxt fixture to verify module wiring and imports.

## Non-Goals

- Cross-service distributed evaluation cache.
- Provider-agnostic analytics/event pipeline.

## Traceability

- PRD: `specs/prd/nuxt-openfeature-module-prd.md`
- Feature spec: `specs/features/nuxt-openfeature-module-feature-spec.md`
