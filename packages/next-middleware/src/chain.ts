import type { NextRequest } from "next/server"

export type MiddlewareResponse = Response
type NextFn<Adds> = (additions: Adds) => Promise<MiddlewareResponse | void>

export type TypedMiddleware<
  Adds extends object = object,
  Requires extends object = object,
> = ((
  req: NextRequest,
  ctx: Requires,
  next: NextFn<Adds>
) => Promise<MiddlewareResponse | void>) & {
  __adds?: Adds
}

export type TypedRouteHandler = (
  req: NextRequest,
  context: unknown
) => Promise<MiddlewareResponse>

export type MiddlewareChainOptions = {
  /**
   * Called when a middleware ran `next()` but did not return its response
   * (`await next()` without `return`). The chain rescues the deepest response
   * it saw, so the request still succeeds — this hook is your chance to log
   * the programming error. Defaults to `console.warn`.
   */
  onDroppedResponse?: (info: { method: string; pathname: string }) => void
  /**
   * Produces the response when nothing in the chain produced one (every
   * middleware and the handler returned void). Defaults to a JSON 500.
   */
  fallbackResponse?: (req: NextRequest) => MiddlewareResponse
}

const defaultOnDroppedResponse = (info: {
  method: string
  pathname: string
}) => {
  console.warn(
    "[next-middleware] Middleware dropped the response — missing `return next(...)`",
    info
  )
}

const defaultFallbackResponse = () =>
  Response.json(
    { error: "Middleware chain produced no response" },
    { status: 500 }
  )

// Exported as a type only so factory return types are nameable in declaration
// emit; construct chains via createMiddlewareChain.
export type { MiddlewareChainBuilder }

class MiddlewareChainBuilder<
  BaseCtx extends object = object,
  Additions extends object = object,
> {
  constructor(
    private readonly middlewares: TypedMiddleware<object, never>[],
    private readonly options: MiddlewareChainOptions
  ) {}

  use<Added extends object>(
    middleware: TypedMiddleware<Added, BaseCtx & Additions>
  ): MiddlewareChainBuilder<BaseCtx, Additions & Added> {
    return new MiddlewareChainBuilder<BaseCtx, Additions & Added>(
      [...this.middlewares, middleware],
      this.options
    )
  }

  handle(
    originalHandler: (
      req: NextRequest,
      ctx: BaseCtx & Additions
    ) => MiddlewareResponse | Promise<MiddlewareResponse>
  ): TypedRouteHandler {
    const { middlewares, options } = this

    const routeHandler = async (
      req: NextRequest,
      nextCtx: unknown
    ): Promise<MiddlewareResponse> => {
      let ctx: Record<string, unknown> = { ...(nextCtx as object) }
      // Remembers the response a middleware drops by forgetting `return next()`.
      let deepestResponse: MiddlewareResponse | undefined

      const executeMiddleware = async (
        index: number
      ): Promise<MiddlewareResponse | void> => {
        if (index >= middlewares.length) {
          return originalHandler(req, ctx as BaseCtx & Additions)
        }

        const middleware = middlewares[index]

        if (!middleware) {
          throw new Error("Middleware chain is corrupted: missing middleware")
        }

        let nextCalled = false

        const next = async (additions: object) => {
          if (nextCalled) {
            throw new Error(
              "next() called multiple times in the same middleware"
            )
          }
          nextCalled = true
          ctx = { ...ctx, ...additions }
          const result = await executeMiddleware(index + 1)
          deepestResponse = result ?? deepestResponse
          return result
        }

        // Requires is erased to `never` in storage; use() already proved the
        // chain provides each middleware's Requires before it runs.
        return middleware(req, ctx as never, next)
      }

      const result = await executeMiddleware(0)

      if (!result && deepestResponse) {
        const onDroppedResponse =
          options.onDroppedResponse ?? defaultOnDroppedResponse
        onDroppedResponse({
          method: req.method,
          pathname: req.nextUrl.pathname,
        })
        return deepestResponse
      }

      return (
        result ?? (options.fallbackResponse ?? defaultFallbackResponse)(req)
      )
    }

    return routeHandler
  }
}

export function createMiddlewareChain<BaseCtx extends object = object>(
  options: MiddlewareChainOptions = {}
) {
  return new MiddlewareChainBuilder<BaseCtx>([], options)
}

export function createTypedMiddleware<
  Adds extends object,
  Requires extends object = object,
>(
  fn: (
    req: NextRequest,
    ctx: Requires,
    next: NextFn<Adds>
  ) => Promise<MiddlewareResponse | void>
): TypedMiddleware<Adds, Requires> {
  return fn
}
