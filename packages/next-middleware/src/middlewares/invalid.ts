import type { NextRequest } from "next/server"
import type { z } from "zod"

import type { MiddlewareResponse } from "../chain"

/**
 * Override what happens when validation fails. Return a Response to send it,
 * or throw — a thrown error propagates to your error-handling middleware.
 */
export type OnInvalid = (
  error: z.ZodError,
  req: NextRequest
) => MiddlewareResponse | Promise<MiddlewareResponse>

export type ValidationOptions = {
  onInvalid?: OnInvalid
}

export const invalidResponse = (
  message: string,
  error: z.ZodError
): MiddlewareResponse =>
  Response.json({ error: message, issues: error.issues }, { status: 400 })
