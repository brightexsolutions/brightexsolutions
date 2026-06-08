/**
 * Standard API error classes.
 *
 * Throw these in any route handler — withRoute() catches them and converts
 * them to safe JSON responses without leaking internal DB error messages.
 *
 * Usage:
 *   import { ApiError, Errors } from "@/lib/api-error";
 *   throw Errors.unauthorized();
 *   throw Errors.notFound("Invoice");
 *   throw new ApiError(422, "Duplicate invoice number", "DUPLICATE");
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const Errors = {
  unauthorized: ()              => new ApiError(401, "Unauthorised",           "UNAUTHORIZED"),
  forbidden:    ()              => new ApiError(403, "Forbidden",               "FORBIDDEN"),
  notFound:     (r = "Resource")=> new ApiError(404, `${r} not found`,         "NOT_FOUND"),
  badRequest:   (msg?: string)  => new ApiError(400, msg ?? "Invalid input",   "BAD_REQUEST"),
  conflict:     (msg?: string)  => new ApiError(409, msg ?? "Conflict",        "CONFLICT"),
  internal:     (msg?: string)  => new ApiError(500, msg ?? "Internal server error", "INTERNAL"),
};
