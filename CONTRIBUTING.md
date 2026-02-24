# Contributing

## Prerequisites

- Node.js 22+
- pnpm 10+

## Setup

```bash
pnpm install --ignore-workspace
pnpm prepare
```

## Development

```bash
pnpm dev
```

## Quality Gates

Run all checks before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Commit and PR Guidance

- Use clear, scoped commits with rationale.
- Include tests for behavior changes.
- Keep server-only secrets out of public runtime config.
- Add a changeset for externally visible behavior changes: `pnpm changeset`.

## Security

Report security issues through GitHub Issues as documented in `SECURITY.md`.
