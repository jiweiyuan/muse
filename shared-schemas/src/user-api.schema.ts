import { z } from "zod";
import {
  userSchema,
  userProfileSchema,
  userPreferencesSchema,
  layoutSchema,
} from "./user.schema.js";
import { emailSchema, userIdSchema } from "./common.schema.js";

/**
 * User API Schema Definitions
 * API request/response schemas for user-related endpoints
 */

// GET /v1/users/:userId
export const getUserRequestSchema = z.object({
  userId: userIdSchema,
});

export const getUserResponseSchema = z.object({
  user: userSchema.nullable(),
});

// PATCH /v1/users/:userId
export const updateUserRequestSchema = z.object({
  userId: userIdSchema,
  name: z.string().optional(),
  email: emailSchema.optional(),
  image: z.string().url().optional(),
});

export const updateUserResponseSchema = z.object({
  user: userSchema,
});

// GET /v1/users/:userId/preferences
export const getUserPreferencesRequestSchema = z.object({
  userId: userIdSchema,
});

export const getUserPreferencesResponseSchema = z.object({
  preferences: userPreferencesSchema.nullable(),
});

// PATCH /v1/users/:userId/preferences
export const updateUserPreferencesRequestSchema = z.object({
  userId: userIdSchema,
  layout: layoutSchema.optional(),
  promptSuggestions: z.boolean().optional(),
  showToolInvocations: z.boolean().optional(),
  showConversationPreviews: z.boolean().optional(),
  hiddenModels: z.array(z.string()).optional(),
});

export const updateUserPreferencesResponseSchema = z.object({
  preferences: userPreferencesSchema,
});

// Type exports
export type GetUserRequestSchema = z.infer<typeof getUserRequestSchema>;
export type GetUserResponseSchema = z.infer<typeof getUserResponseSchema>;
export type UpdateUserRequestSchema = z.infer<typeof updateUserRequestSchema>;
export type UpdateUserResponseSchema = z.infer<typeof updateUserResponseSchema>;
export type GetUserPreferencesRequestSchema = z.infer<typeof getUserPreferencesRequestSchema>;
export type GetUserPreferencesResponseSchema = z.infer<typeof getUserPreferencesResponseSchema>;
export type UpdateUserPreferencesRequestSchema = z.infer<typeof updateUserPreferencesRequestSchema>;
export type UpdateUserPreferencesResponseSchema = z.infer<typeof updateUserPreferencesResponseSchema>;
