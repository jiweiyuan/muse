import { z } from "zod";
import { userPreferencesSchema, layoutSchema } from "./user.schema.js";
import { userIdSchema } from "./common.schema.js";

/**
 * Preference API Schema Definitions
 * API request/response schemas for user preference endpoints
 */

// GET /v1/preferences
export const getPreferencesRequestSchema = z.object({
  userId: userIdSchema.optional(),
});

export const getPreferencesResponseSchema = userPreferencesSchema;

// PUT /v1/preferences
export const updatePreferencesRequestSchema = z.object({
  userId: userIdSchema.optional(),
  layout: layoutSchema.optional(),
  prompt_suggestions: z.boolean().optional(),
  show_tool_invocations: z.boolean().optional(),
  show_conversation_previews: z.boolean().optional(),
  hidden_models: z.array(z.string()).optional(),
});

export const updatePreferencesResponseSchema = z.object({
  success: z.boolean(),
  userId: userIdSchema,
  layout: layoutSchema.optional(),
  promptSuggestions: z.boolean().optional(),
  showToolInvocations: z.boolean().optional(),
  showConversationPreviews: z.boolean().optional(),
  hiddenModels: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Type exports
export type GetPreferencesRequestSchema = z.infer<typeof getPreferencesRequestSchema>;
export type GetPreferencesResponseSchema = z.infer<typeof getPreferencesResponseSchema>;
export type UpdatePreferencesRequestSchema = z.infer<typeof updatePreferencesRequestSchema>;
export type UpdatePreferencesResponseSchema = z.infer<typeof updatePreferencesResponseSchema>;
