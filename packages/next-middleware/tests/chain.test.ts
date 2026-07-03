import { NextRequest, NextResponse } from "next/server"
import { describe, expect, it, vi } from "vitest"

import { createMiddlewareChain, createTypedMiddleware } from "../src/index"

const request = () => new NextRequest("http://localhost/api/test")

describe("createMiddlewareChain", () => {
  it("runs middlewares in order and accumulates ctx for the handler", async () => {
    const order: string[] = []

    const withUser = createTypedMiddleware<{ user: string }>(
      async (_req, _ctx, next) => {
        order.push("user")
        return next({ user: "ada" })
      }
    )

    const withOrg = createTypedMiddleware<{ org: string }, { user: string }>(
      async (_req, ctx, next) => {
        order.push("org")
        return next({ org: `${ctx.user}-org` })
      }
    )

    const handler = createMiddlewareChain()
      .use(withUser)
      .use(withOrg)
      .handle(async (_req, ctx) => {
        order.push("handler")
        return NextResponse.json({ org: ctx.org, user: ctx.user })
      })

    const response = await handler(request(), {})

    expect(order).toEqual(["user", "org", "handler"])
    expect(await response.json()).toEqual({ org: "ada-org", user: "ada" })
  })

  it("spreads the incoming route context into ctx", async () => {
    const handler = createMiddlewareChain().handle(async (_req, ctx) =>
      NextResponse.json({ ctx })
    )

    const response = await handler(request(), { params: { id: "42" } })

    expect(await response.json()).toEqual({ ctx: { params: { id: "42" } } })
  })

  it("lets a middleware short-circuit without running the rest", async () => {
    const handlerSpy = vi.fn()

    const deny = createTypedMiddleware<Record<string, never>>(async () =>
      NextResponse.json({ error: "denied" }, { status: 401 })
    )

    const handler = createMiddlewareChain()
      .use(deny)
      .handle(async () => {
        handlerSpy()
        return NextResponse.json({ ok: true })
      })

    const response = await handler(request(), {})

    expect(response.status).toBe(401)
    expect(handlerSpy).not.toHaveBeenCalled()
  })

  it("forking a shared base chain does not leak middlewares across forks", async () => {
    const ran: string[] = []

    const tag = (name: string) =>
      createTypedMiddleware<Record<string, never>>(async (_req, _ctx, next) => {
        ran.push(name)
        return next({})
      })

    const base = createMiddlewareChain().use(tag("base"))
    const first = base
      .use(tag("first-only"))
      .handle(async () => NextResponse.json({ ok: true }))
    const second = base
      .use(tag("second-only"))
      .handle(async () => NextResponse.json({ ok: true }))

    await first(request(), {})
    await second(request(), {})

    expect(ran).toEqual(["base", "first-only", "base", "second-only"])
  })

  it("throws when a middleware calls next() twice", async () => {
    const handlerSpy = vi.fn()

    const doubleNext = createTypedMiddleware<Record<string, never>>(
      async (_req, _ctx, next) => {
        await next({})
        return next({})
      }
    )

    const handler = createMiddlewareChain()
      .use(doubleNext)
      .handle(async () => {
        handlerSpy()
        return NextResponse.json({ ok: true })
      })

    await expect(handler(request(), {})).rejects.toThrow(
      "next() called multiple times"
    )
    expect(handlerSpy).toHaveBeenCalledTimes(1)
  })

  it("rescues the response when a middleware forgets to return next()", async () => {
    const onDroppedResponse = vi.fn()

    const forgetful = createTypedMiddleware<Record<string, never>>(
      async (_req, _ctx, next) => {
        await next({})
      }
    )

    const handler = createMiddlewareChain({ onDroppedResponse })
      .use(forgetful)
      .handle(async () => NextResponse.json({ ok: true }))

    const response = await handler(request(), {})

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(onDroppedResponse).toHaveBeenCalledWith({
      method: "GET",
      pathname: "/api/test",
    })
  })

  it("warns via console by default when a response is dropped", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const forgetful = createTypedMiddleware<Record<string, never>>(
      async (_req, _ctx, next) => {
        await next({})
      }
    )

    const handler = createMiddlewareChain()
      .use(forgetful)
      .handle(async () => NextResponse.json({ ok: true }))

    await handler(request(), {})

    expect(warnSpy).toHaveBeenCalledOnce()
    warnSpy.mockRestore()
  })

  it("returns a JSON 500 when nothing in the chain produces a response", async () => {
    const swallow = createTypedMiddleware<Record<string, never>>(
      async () => undefined
    )

    const handler = createMiddlewareChain()
      .use(swallow)
      .handle(async () => NextResponse.json({ ok: true }))

    const response = await handler(request(), {})

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: "Middleware chain produced no response",
    })
  })

  it("uses the custom fallbackResponse when nothing produces a response", async () => {
    const swallow = createTypedMiddleware<Record<string, never>>(
      async () => undefined
    )

    const handler = createMiddlewareChain({
      fallbackResponse: (req) =>
        Response.json({ path: req.nextUrl.pathname }, { status: 502 }),
    })
      .use(swallow)
      .handle(async () => NextResponse.json({ ok: true }))

    const response = await handler(request(), {})

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ path: "/api/test" })
  })

  it("propagates errors thrown by middlewares and the handler", async () => {
    const handler = createMiddlewareChain().handle(async () => {
      throw new Error("boom")
    })

    await expect(handler(request(), {})).rejects.toThrow("boom")
  })
})
