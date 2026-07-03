# tinystack

Small, sharply-scoped TypeScript packages for Next.js apps.

## Packages

| Package | Description |
| --- | --- |
| [`@tinystack/next-middleware`](./packages/next-middleware) | Composable, type-safe middleware chains for Next.js route handlers — ordering enforced at compile time. |

## Development

pnpm 9 + Turborepo. Node >= 20.

```sh
pnpm install
pnpm dev        # runs the demo app (apps/demo) against the library source
pnpm test       # unit + type-level tests
pnpm typecheck
pnpm lint
pnpm build
```

`apps/demo` consumes the library from source (`transpilePackages`), so edits
to `packages/next-middleware/src` hot-reload in the demo.

## Releasing

Changesets: `pnpm changeset` on your PR → merge → `pnpm release:version` →
`pnpm release` (or let the Release GitHub Action open the version PR and
publish once `NPM_TOKEN` is configured).
