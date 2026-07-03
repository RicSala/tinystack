# tinystack

Monorepo of small, published npm packages for Next.js. `packages/*` are
published libraries, `apps/demo` is a dev playground (never published),
`tooling/*` are shared internal configs (`@repo/*`, never published).

## Commands

- Root: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` (all turbo-cached)
- Single package: `pnpm --filter @tinystack/next-middleware test`
- Type-level tests live in `tests/*.test-d.ts` and run via vitest's typecheck
  mode as part of the normal `test` script — expected type errors are asserted
  with `@ts-expect-error` / `expectTypeOf`.
- `pnpm check-package` (per package) runs publint + arethetypeswrong
  (ESM-only profile) against a real `pnpm pack` tarball.

## Invariants — don't break these

- **The compile-time ordering guarantee is the product.** `use()` must reject,
  at the type level, any middleware whose `Requires` the chain doesn't yet
  provide. Any change to `src/chain.ts` types must keep `types.test-d.ts`
  passing; new type behavior needs a new type test.
- **Runtime guarantee: exactly one response per request.** Dropped responses
  are rescued (`onDroppedResponse`), an empty chain returns the fallback 500,
  double `next()` throws. These are documented promises in the README.
- **Dual exports:** package.json `exports` points at `./src/index.ts` (so the
  demo app and tests consume TypeScript source directly), while
  `publishConfig.exports` points at `dist/` for the published artifact. Don't
  "fix" either one.

## Conventions

- Shared dependency versions come from the pnpm catalog
  (`"typescript": "catalog:"` in `pnpm-workspace.yaml`). Add shared versions
  there; don't inline versions that the catalog already defines.
- `zod` peer range supports both v3.25+ and v4 — code in `src/middlewares/`
  may only use APIs common to both.
- New packages mirror `packages/next-middleware`: tsup build, vitest,
  `@repo/eslint-config` + `@repo/typescript-config`, `publishConfig` with
  dist exports, `check-package` script.

## Releasing

- Changesets: PRs that touch `packages/*` need `pnpm changeset`.
- Never bump `version` in package.json manually — `changeset version` does it.
