import type { z } from "zod"

import type { TypedMiddleware } from "../chain"
import { invalidResponse, type ValidationOptions } from "./invalid"

/**
 * Validates the request's search params against a zod schema and adds the
 * parsed result to ctx as `query`.
 *
 * Normalization before parsing:
 * - a missing or empty (`?key=`) single value becomes `undefined`, so
 *   `z.string().optional()` behaves as expected
 * - a repeated key (`?tag=a&tag=b`) becomes a `string[]`; model it with
 *   e.g. `z.union([z.string(), z.array(z.string())])`
 *
 * Invalid input sends a JSON 400 with the zod issues; override via
 * `onInvalid` (return a Response or throw).
 */
export const withQuery = <Schema extends z.ZodType>(
  schema: Schema,
  options: ValidationOptions = {}
): TypedMiddleware<{ query: z.output<Schema> }> => {
  return async (req, _ctx, next) => {
    const searchParams = req.nextUrl.searchParams
    const rawQuery: Record<string, unknown> = {}

    for (const key of new Set(searchParams.keys())) {
      const values = searchParams.getAll(key)
      rawQuery[key] =
        values.length > 1 ? values : values[0] === "" ? undefined : values[0]
    }

    const result = schema.safeParse(rawQuery)

    if (!result.success) {
      const onInvalid = options.onInvalid
      return onInvalid
        ? onInvalid(result.error, req)
        : invalidResponse("Invalid query parameters", result.error)
    }

    return next({ query: result.data as z.output<Schema> })
  }
}
