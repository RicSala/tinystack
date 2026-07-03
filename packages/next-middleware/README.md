# @tinystack/next-middleware

Composable, type-safe middleware chains for Next.js route handlers — with
**middleware ordering enforced at compile time**.

```ts
// app/api/projects/route.ts
import {
  createMiddlewareChain,
  withQuery,
} from "@tinystack/next-middleware"
import { z } from "zod"

export const GET = createMiddlewareChain()
  .use(withAuth) // adds ctx.user
  .use(withQuery(z.object({ page: z.coerce.number().default(1) })))
  .handle(async (req, ctx) => {
    //                 ^ ctx is fully typed: { user: User; query: { page: number } }
    return Response.json(await listProjects(ctx.user, ctx.query.page))
  })
```

## Why

Every Next.js codebase grows a hand-rolled `use(...)` chain eventually. Most
of them get two things wrong:

1. **Ordering is unchecked.** A middleware that reads `ctx.user` can run
   before the one that sets it — and nothing complains until production.
2. **Responses get lost.** A middleware that forgets `return next()` silently
   swallows the handler's response.

This library fixes both:

- `use()` **rejects, at compile time**, any middleware whose requirements the
  chain doesn't yet provide:

  ```ts
  const needsUser = createTypedMiddleware<{ org: string }, { user: string }>(
    async (req, ctx, next) => next({ org: await orgOf(ctx.user) })
  )

  createMiddlewareChain().use(needsUser)
  //                          ^^^^^^^^^ ✖ Type error: chain provides {},
  //                                      middleware requires { user: string }

  createMiddlewareChain().use(withUser).use(needsUser) // ✔ compiles
  ```

- The runtime guarantees **exactly one response per request**: a dropped
  response (`await next()` without `return`) is rescued and reported via
  `onDroppedResponse`; a chain that produces nothing returns a JSON 500 (or
  your `fallbackResponse`); calling `next()` twice throws.

## Install

```sh
pnpm add @tinystack/next-middleware
```

`next` (≥14) and `zod` (≥3.25, if you use the validation middlewares) are peer
dependencies.

## Writing middleware

A middleware declares what it **adds** to ctx and what it **requires** from
middlewares before it:

```ts
import { createTypedMiddleware } from "@tinystack/next-middleware"

//                                     Adds ─────────┐   Requires ──┐
const withOrg = createTypedMiddleware<{ org: Org }, { user: User }>(
  async (req, ctx, next) => {
    const org = await findOrg(ctx.user)
    if (!org) return Response.json({ error: "No org" }, { status: 403 })

    return next({ org }) // always *return* next()
  }
)
```

Short-circuit by returning a `Response` without calling `next()`. Anything a
middleware throws propagates out of the chain — add your own error-boundary
middleware as the first `use()` if you want throws converted to responses.

## Included middlewares

All three validate with a zod schema, add the typed result to ctx, and respond
with a JSON 400 (including the zod issues) on invalid input. Override that via
`onInvalid` — return your own `Response` or throw into your error boundary.

| Middleware                  | Adds         | Notes                                                                               |
| --------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `withQuery(schema, opts?)`  | `ctx.query`  | Empty values become `undefined`; repeated keys become arrays                        |
| `withBody(schema, opts?)`   | `ctx.body`   | Malformed JSON fails validation like any other bad input; consumes the request body |
| `withParams(schema, opts?)` | `ctx.params` | Awaits the Next.js 15+ params promise before validating                             |

```ts
export const POST = createMiddlewareChain()
  .use(withParams(z.object({ projectId: z.uuid() })))
  .use(withBody(z.object({ name: z.string().min(1) })))
  .handle(async (req, ctx) =>
    Response.json(await rename(ctx.params.projectId, ctx.body.name))
  )
```

## Chain options

```ts
createMiddlewareChain({
  // Log dropped responses with your logger (default: console.warn)
  onDroppedResponse: ({ method, pathname }) =>
    logger.error("dropped", { method, pathname }),
  // Response when nothing in the chain produced one (default: JSON 500)
  fallbackResponse: (req) =>
    Response.json({ error: "No response" }, { status: 500 }),
})
```

Chains are immutable — `use()` returns a new chain — so you can fork a shared
base chain safely:

```ts
const authed = createMiddlewareChain().use(withAuth)

export const GET = authed.use(withQuery(listSchema)).handle(listProjects)
export const POST = authed.use(withBody(createSchema)).handle(createProject)
```

## When not to use it

Boring JSON APIs are the sweet spot. Streaming responses, webhooks with raw
body signatures, and file uploads are often clearer as plain route handlers.

## License

MIT
