---
"@tinystack/next-middleware": minor
---

Add two middlewares: `withHeaders(schema, opts?)` validates request headers
with a zod schema and adds the typed result as `ctx.headers` (header names
lowercased, same `onInvalid` override as the other validators), and
`withErrorBoundary(onError)` catches anything thrown by later middlewares or
the handler and converts it to a response via your `onError` mapping.
