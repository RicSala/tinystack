import type { z } from "zod"

import type { TypedMiddleware } from "../chain"
import { invalidResponse, type ValidationOptions } from "./invalid"

/**
 * Validates the request's headers against a zod schema and adds the parsed
 * result to ctx as `headers`.
 *
 * Header names are case-insensitive; the Fetch `Headers` API exposes them
 * lowercased, so write schema keys in lowercase
 * (`z.object({ "x-api-key": z.string() })`). Repeated headers arrive as a
 * single comma-joined string.
 *
 * Invalid input sends a JSON 400 with the zod issues; override via
 * `onInvalid` (return a Response or throw).
 */
export const withHeaders = <Schema extends z.ZodType>(
  schema: Schema,
  options: ValidationOptions = {}
): TypedMiddleware<{ headers: z.output<Schema> }> => {
  return async (req, _ctx, next) => {
    const rawHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      rawHeaders[key] = value
    })

    const result = schema.safeParse(rawHeaders)

    if (!result.success) {
      const onInvalid = options.onInvalid
      return onInvalid
        ? onInvalid(result.error, req)
        : invalidResponse("Invalid request headers", result.error)
    }

    return next({ headers: result.data as z.output<Schema> })
  }
}
