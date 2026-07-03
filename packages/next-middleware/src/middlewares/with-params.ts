import type { z } from "zod"

import type { TypedMiddleware } from "../chain"
import { invalidResponse, type ValidationOptions } from "./invalid"

/**
 * Validates the route's dynamic segment params against a zod schema and adds
 * the parsed result to ctx as `params`.
 *
 * Next.js 15+ passes params as a Promise in the handler's second argument;
 * this middleware awaits it (plain objects from older versions work too), so
 * handlers get resolved, validated params instead of a Promise.
 *
 * Invalid input sends a JSON 400 with the zod issues; override via
 * `onInvalid` (return a Response or throw).
 */
export const withParams = <Schema extends z.ZodType>(
  schema: Schema,
  options: ValidationOptions = {}
): TypedMiddleware<{ params: z.output<Schema> }> => {
  return async (req, ctx, next) => {
    const rawParams: unknown = await (ctx as { params?: unknown }).params

    const result = schema.safeParse(rawParams)

    if (!result.success) {
      const onInvalid = options.onInvalid
      return onInvalid
        ? onInvalid(result.error, req)
        : invalidResponse("Invalid route parameters", result.error)
    }

    return next({ params: result.data as z.output<Schema> })
  }
}
