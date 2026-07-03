import type { z } from "zod"

import type { TypedMiddleware } from "../chain"
import { invalidResponse, type ValidationOptions } from "./invalid"

/**
 * Parses the request's JSON body against a zod schema and adds the result to
 * ctx as `body`. Malformed JSON is treated like any other invalid input (the
 * schema sees `undefined`), so it never escapes as a generic internal error.
 *
 * Note: this consumes the request body — downstream code should read
 * `ctx.body`, not `req.json()`.
 *
 * Invalid input sends a JSON 400 with the zod issues; override via
 * `onInvalid` (return a Response or throw).
 */
export const withBody = <Schema extends z.ZodType>(
  schema: Schema,
  options: ValidationOptions = {}
): TypedMiddleware<{ body: z.output<Schema> }> => {
  return async (req, _ctx, next) => {
    const rawBody: unknown = await req.json().catch(() => undefined)

    const result = schema.safeParse(rawBody)

    if (!result.success) {
      const onInvalid = options.onInvalid
      return onInvalid
        ? onInvalid(result.error, req)
        : invalidResponse("Invalid request body", result.error)
    }

    return next({ body: result.data as z.output<Schema> })
  }
}
