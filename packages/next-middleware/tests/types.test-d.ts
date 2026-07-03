import { NextResponse } from "next/server"
import { describe, expectTypeOf, it } from "vitest"
import { z } from "zod"

import {
  createMiddlewareChain,
  createTypedMiddleware,
  withParams,
  withQuery,
} from "../src/index"

const withUser = createTypedMiddleware<{ user: string }>(async (_r, _c, next) =>
  next({ user: "ada" })
)

const needsUser = createTypedMiddleware<{ org: string }, { user: string }>(
  async (_r, ctx, next) => next({ org: ctx.user })
)

const noAdds = createTypedMiddleware<Record<string, never>>(
  async (_r, _c, next) => next({})
)

describe("middleware ordering is enforced at compile time", () => {
  it("rejects a middleware whose Requires the chain does not yet provide", () => {
    // @ts-expect-error needsUser requires { user } before anything provides it
    createMiddlewareChain().use(needsUser)
  })

  it("accepts the same middleware once its Requires are provided", () => {
    createMiddlewareChain().use(withUser).use(needsUser)
  })
})

describe("handler ctx is the exact accumulated intersection", () => {
  it("types every addition on ctx", () => {
    createMiddlewareChain()
      .use(withUser)
      .use(needsUser)
      .handle(async (_req, ctx) => {
        expectTypeOf(ctx.user).toEqualTypeOf<string>()
        expectTypeOf(ctx.org).toEqualTypeOf<string>()
        return NextResponse.json({})
      })
  })

  it("rejects reading keys nobody added", () => {
    createMiddlewareChain()
      .use(withUser)
      .handle(async (_req, ctx) => {
        // @ts-expect-error `missing` was never added to ctx
        return NextResponse.json({ x: ctx.missing })
      })
  })

  it("no-addition middlewares do not poison later ctx types", () => {
    createMiddlewareChain()
      .use(noAdds)
      .use(withUser)
      .handle(async (_req, ctx) => {
        expectTypeOf(ctx.user).toEqualTypeOf<string>()
        return NextResponse.json({})
      })
  })

  it("threads BaseCtx through to the handler", () => {
    createMiddlewareChain<{ locale: string }>()
      .use(withUser)
      .handle(async (_req, ctx) => {
        expectTypeOf(ctx.locale).toEqualTypeOf<string>()
        expectTypeOf(ctx.user).toEqualTypeOf<string>()
        return NextResponse.json({})
      })
  })
})

describe("next() enforces the declared additions", () => {
  it("requires the additions object", () => {
    createTypedMiddleware<{ user: string }>(async (_r, _c, next) => {
      // @ts-expect-error additions object is required
      return next()
    })
  })

  it("rejects additions of the wrong shape", () => {
    createTypedMiddleware<{ user: string }>(async (_r, _c, next) => {
      // @ts-expect-error user must be a string
      return next({ user: 42 })
    })
  })
})

describe("zod middlewares type their ctx additions from the schema", () => {
  it("withQuery adds a typed query", () => {
    createMiddlewareChain()
      .use(withQuery(z.object({ page: z.coerce.number() })))
      .handle(async (_req, ctx) => {
        expectTypeOf(ctx.query.page).toEqualTypeOf<number>()
        return NextResponse.json({})
      })
  })

  it("withParams adds typed params", () => {
    createMiddlewareChain()
      .use(withParams(z.object({ id: z.string() })))
      .handle(async (_req, ctx) => {
        expectTypeOf(ctx.params.id).toEqualTypeOf<string>()
        return NextResponse.json({})
      })
  })
})
