import { createTypedMiddleware } from "@tinystack/next-middleware"

export type User = { id: string; name: string }

// First middleware in every chain: converts anything thrown downstream into
// a JSON response instead of an unhandled 500.
export const withErrorBoundary = createTypedMiddleware<Record<string, never>>(
  async (_req, _ctx, next) => {
    try {
      return await next({})
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return Response.json({ error: message }, { status: 500 })
    }
  }
)

// Adds ctx.user; short-circuits with a 401 when the header is missing.
export const withUser = createTypedMiddleware<{ user: User }>(
  async (req, _ctx, next) => {
    const name = req.headers.get("x-user")

    if (!name) {
      return Response.json({ error: "Missing x-user header" }, { status: 401 })
    }

    return next({ user: { id: `user_${name}`, name } })
  }
)

// Requires ctx.user — the ordering guarantee in action: placing this before
// withUser in a chain is a compile-time error, not a production surprise.
export const withGreeting = createTypedMiddleware<
  { greeting: string },
  { user: User }
>(async (_req, ctx, next) => next({ greeting: `Hello, ${ctx.user.name}!` }))
