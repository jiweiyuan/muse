import { z } from "zod";

/**
 * Common Schema Definitions
 * Base schemas used across multiple domain entities
 */

// UUID validation
export const uuidSchema = z.string().uuid("Invalid UUID format");

// ISO 8601 date-time string
export const isoDateTimeSchema = z.string().datetime();

// Email validation
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .toLowerCase()
  .trim();

// Non-empty string
export const nonEmptyStringSchema = z.string().min(1, "Cannot be empty").trim();

// Pagination schemas
export const paginationRequestSchema = z.object({
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

export const paginationResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

// User ID (text format from better-auth)
export const userIdSchema = z.string().min(1, "User ID is required");

// Error response
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
});

// Success response
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Type exports
export type UuidSchema = z.infer<typeof uuidSchema>;
export type IsoDateTimeSchema = z.infer<typeof isoDateTimeSchema>;
export type EmailSchema = z.infer<typeof emailSchema>;
export type NonEmptyStringSchema = z.infer<typeof nonEmptyStringSchema>;
export type PaginationRequestSchema = z.infer<typeof paginationRequestSchema>;
export type PaginationResponseSchema = z.infer<typeof paginationResponseSchema>;
export type UserIdSchema = z.infer<typeof userIdSchema>;
export type ErrorResponseSchema = z.infer<typeof errorResponseSchema>;
export type SuccessResponseSchema = z.infer<typeof successResponseSchema>;
