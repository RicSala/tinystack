import type { NextRequest } from "next/server"

import type { MiddlewareResponse, TypedMiddleware } from "../chain"

/**
 * Maps an error thrown downstream to the Response the client receives.
 * Anything it throws itself propagates out of the chain.
 */
export type OnError = (
  error: unknown,
  req: NextRequest
) => MiddlewareResponse | Promise<MiddlewareResponse>

/**
 * Catches anything thrown by later middlewares or the handler and converts it
 * to a response via `onError`. Add it as the first `use()` so it wraps the
 * whole chain — it only sees throws from middlewares after it.
 *
 * The error-to-response mapping is entirely yours: `onError` receives the raw
 * thrown value (typed `unknown`) and the request.
 */
export const withErrorBoundary = (onError: OnError): TypedMiddleware => {
  return async (req, _ctx, next) => {
    try {
      return await next({})
    } catch (error) {
      return onError(error, req)
    }
  }
}
