# @tinystack/next-middleware

## 0.2.0

### Minor Changes

- 979642e: Add two middlewares: `withHeaders(schema, opts?)` validates request headers
  with a zod schema and adds the typed result as `ctx.headers` (header names
  lowercased, same `onInvalid` override as the other validators), and
  `withErrorBoundary(onError)` catches anything thrown by later middlewares or
  the handler and converts it to a response via your `onError` mapping.

## 0.1.0

### Minor Changes

- 57a500b: Initial release: composable, type-safe middleware chains for Next.js route
  handlers. `use()` enforces middleware ordering at compile time; the runtime
  guarantees exactly one response per request (dropped responses are rescued
  and reported, a silent chain falls back to a JSON 500, double `next()`
  throws). Ships `withQuery`, `withBody`, and `withParams` zod validation
  middlewares with an injectable `onInvalid` strategy.
