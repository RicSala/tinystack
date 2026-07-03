import { NextRequest, NextResponse } from "next/server"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import {
  createMiddlewareChain,
  withBody,
  withErrorBoundary,
  withHeaders,
  withParams,
  withQuery,
} from "../src/index"

const request = (
  url = "http://localhost/api/test",
  init?: ConstructorParameters<typeof NextRequest>[1]
) => new NextRequest(url, init)

const jsonRequest = (body: string) =>
  request("http://localhost/api/test", {
    body,
    headers: { "content-type": "application/json" },
    method: "POST",
  })

describe("withQuery", () => {
  const echoQuery = (
    schema: z.ZodType,
    options?: Parameters<typeof withQuery>[1]
  ) =>
    createMiddlewareChain()
      .use(withQuery(schema, options))
      .handle(async (_req, ctx) => NextResponse.json({ query: ctx.query }))

  it("parses valid query params into ctx.query", async () => {
    const handler = echoQuery(z.object({ page: z.coerce.number() }))

    const response = await handler(
      request("http://localhost/api/test?page=2"),
      {}
    )

    expect(await response.json()).toEqual({ query: { page: 2 } })
  })

  it("returns a 400 with issues on invalid query params", async () => {
    const handler = echoQuery(z.object({ page: z.coerce.number() }))

    const response = await handler(request("http://localhost/api/test"), {})
    const body = (await response.json()) as { error: string; issues: unknown[] }

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid query parameters")
    expect(body.issues.length).toBeGreaterThan(0)
  })

  it("treats an empty value as undefined so optional fields pass", async () => {
    const handler = echoQuery(z.object({ q: z.string().optional() }))

    const response = await handler(request("http://localhost/api/test?q="), {})

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ query: {} })
  })

  it("collects repeated keys into an array", async () => {
    const handler = echoQuery(
      z.object({ tag: z.union([z.string(), z.array(z.string())]) })
    )

    const response = await handler(
      request("http://localhost/api/test?tag=a&tag=b"),
      {}
    )

    expect(await response.json()).toEqual({ query: { tag: ["a", "b"] } })
  })

  it("delegates invalid input to onInvalid when provided", async () => {
    const onInvalid = vi.fn(() =>
      Response.json({ custom: true }, { status: 422 })
    )
    const handler = echoQuery(z.object({ page: z.coerce.number() }), {
      onInvalid,
    })

    const response = await handler(request("http://localhost/api/test"), {})

    expect(response.status).toBe(422)
    expect(onInvalid).toHaveBeenCalledOnce()
  })

  it("lets onInvalid throw so an error middleware can take over", async () => {
    const handler = echoQuery(z.object({ page: z.coerce.number() }), {
      onInvalid: () => {
        throw new Error("validation failed")
      },
    })

    await expect(
      handler(request("http://localhost/api/test"), {})
    ).rejects.toThrow("validation failed")
  })
})

describe("withBody", () => {
  const echoBody = (schema: z.ZodType) =>
    createMiddlewareChain()
      .use(withBody(schema))
      .handle(async (_req, ctx) => NextResponse.json({ body: ctx.body }))

  it("parses a valid JSON body into ctx.body", async () => {
    const handler = echoBody(z.object({ name: z.string() }))

    const response = await handler(jsonRequest('{"name":"Ada"}'), {})

    expect(await response.json()).toEqual({ body: { name: "Ada" } })
  })

  it("returns a 400 on malformed JSON instead of a generic internal error", async () => {
    const handler = echoBody(z.object({ name: z.string() }))

    const response = await handler(jsonRequest("{not json"), {})
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid request body")
  })

  it("returns a 400 with issues when the body fails the schema", async () => {
    const handler = echoBody(z.object({ name: z.string() }))

    const response = await handler(jsonRequest('{"name":42}'), {})
    const body = (await response.json()) as { issues: unknown[] }

    expect(response.status).toBe(400)
    expect(body.issues.length).toBeGreaterThan(0)
  })
})

describe("withHeaders", () => {
  const echoHeaders = (
    schema: z.ZodType,
    options?: Parameters<typeof withHeaders>[1]
  ) =>
    createMiddlewareChain()
      .use(withHeaders(schema, options))
      .handle(async (_req, ctx) => NextResponse.json({ headers: ctx.headers }))

  it("parses valid headers into ctx.headers, matching case-insensitively", async () => {
    const handler = echoHeaders(z.object({ "x-api-key": z.string() }))

    const response = await handler(
      request("http://localhost/api/test", {
        headers: { "X-Api-Key": "secret" },
      }),
      {}
    )

    expect(await response.json()).toEqual({
      headers: { "x-api-key": "secret" },
    })
  })

  it("returns a 400 with issues when a required header is missing", async () => {
    const handler = echoHeaders(z.object({ "x-api-key": z.string() }))

    const response = await handler(request(), {})
    const body = (await response.json()) as { error: string; issues: unknown[] }

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid request headers")
    expect(body.issues.length).toBeGreaterThan(0)
  })

  it("delegates invalid input to onInvalid when provided", async () => {
    const onInvalid = vi.fn(() =>
      Response.json({ custom: true }, { status: 401 })
    )
    const handler = echoHeaders(z.object({ "x-api-key": z.string() }), {
      onInvalid,
    })

    const response = await handler(request(), {})

    expect(response.status).toBe(401)
    expect(onInvalid).toHaveBeenCalledOnce()
  })
})

describe("withErrorBoundary", () => {
  it("converts a throw from the handler into onError's response", async () => {
    const handler = createMiddlewareChain()
      .use(
        withErrorBoundary((error) =>
          Response.json({ error: String(error) }, { status: 500 })
        )
      )
      .handle(async () => {
        throw new Error("boom")
      })

    const response = await handler(request(), {})

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Error: boom" })
  })

  it("catches throws from later middlewares (e.g. a throwing onInvalid)", async () => {
    const handler = createMiddlewareChain()
      .use(withErrorBoundary(() => Response.json({}, { status: 422 })))
      .use(
        withQuery(z.object({ page: z.coerce.number() }), {
          onInvalid: () => {
            throw new Error("validation failed")
          },
        })
      )
      .handle(async () => NextResponse.json({}))

    const response = await handler(request(), {})

    expect(response.status).toBe(422)
  })

  it("passes the response through untouched when nothing throws", async () => {
    const onError = vi.fn(() => Response.json({}, { status: 500 }))
    const handler = createMiddlewareChain()
      .use(withErrorBoundary(onError))
      .handle(async () => NextResponse.json({ ok: true }))

    const response = await handler(request(), {})

    expect(await response.json()).toEqual({ ok: true })
    expect(onError).not.toHaveBeenCalled()
  })
})

describe("withParams", () => {
  it("awaits the Next.js 15+ params promise and validates it", async () => {
    const handler = createMiddlewareChain()
      .use(withParams(z.object({ id: z.coerce.number() })))
      .handle(async (_req, ctx) => NextResponse.json({ params: ctx.params }))

    const response = await handler(request(), {
      params: Promise.resolve({ id: "42" }),
    })

    expect(await response.json()).toEqual({ params: { id: 42 } })
  })

  it("accepts plain object params from older Next.js versions", async () => {
    const handler = createMiddlewareChain()
      .use(withParams(z.object({ id: z.string() })))
      .handle(async (_req, ctx) => NextResponse.json({ params: ctx.params }))

    const response = await handler(request(), { params: { id: "42" } })

    expect(await response.json()).toEqual({ params: { id: "42" } })
  })

  it("returns a 400 when params fail the schema", async () => {
    const handler = createMiddlewareChain()
      .use(withParams(z.object({ id: z.uuid() })))
      .handle(async (_req, ctx) => NextResponse.json({ params: ctx.params }))

    const response = await handler(request(), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    })
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid route parameters")
  })
})
