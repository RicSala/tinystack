import { createMiddlewareChain, withParams } from "@tinystack/next-middleware"
import { z } from "zod"

import { withErrorBoundary, withGreeting, withUser } from "@/lib/middleware"
import { notes } from "@/lib/notes"

// Swap withUser and withGreeting below to see the compile-time ordering
// guarantee: withGreeting requires ctx.user, so use() rejects it until
// withUser has run.
export const GET = createMiddlewareChain()
  .use(withErrorBoundary)
  .use(withUser)
  .use(withGreeting)
  .use(withParams(z.object({ noteId: z.string().regex(/^n\d+$/) })))
  .handle(async (_req, ctx) => {
    const note = notes.find((candidate) => candidate.id === ctx.params.noteId)

    if (!note) {
      return Response.json({ error: "Note not found" }, { status: 404 })
    }

    return Response.json({ greeting: ctx.greeting, note, user: ctx.user })
  })
