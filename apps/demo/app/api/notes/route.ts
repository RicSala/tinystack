import {
  createMiddlewareChain,
  withBody,
  withQuery,
} from "@tinystack/next-middleware"
import { z } from "zod"

import { withErrorBoundary } from "@/lib/middleware"
import { notes } from "@/lib/notes"

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Repeated keys (?tag=a&tag=b) arrive as an array, single keys as a string.
  tag: z.union([z.string(), z.array(z.string())]).optional(),
})

export const GET = createMiddlewareChain()
  .use(withErrorBoundary)
  .use(withQuery(listQuerySchema))
  .handle(async (_req, ctx) => {
    const tags =
      ctx.query.tag === undefined
        ? []
        : Array.isArray(ctx.query.tag)
          ? ctx.query.tag
          : [ctx.query.tag]

    const filtered =
      tags.length === 0
        ? notes
        : notes.filter((note) => tags.every((tag) => note.tags.includes(tag)))

    return Response.json({ notes: filtered, page: ctx.query.page })
  })

const createBodySchema = z.object({
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
})

export const POST = createMiddlewareChain()
  .use(withErrorBoundary)
  .use(withBody(createBodySchema))
  .handle(async (_req, ctx) => {
    const note = {
      id: `n${notes.length + 1}`,
      title: ctx.body.title,
      tags: ctx.body.tags,
    }
    notes.push(note)

    return Response.json({ note }, { status: 201 })
  })
