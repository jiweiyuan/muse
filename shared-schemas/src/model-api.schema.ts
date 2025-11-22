import { z } from "zod";
import { modelConfigSchema } from "./model.schema.js";
import { userIdSchema } from "./common.schema.js";

/**
 * Model API Schema Definitions
 * API request/response schemas for model-related endpoints
 */

// GET /v1/models
export const listModelsRequestSchema = z.object({
  userId: userIdSchema.optional(),
});

export const modelWithAccessSchema = modelConfigSchema.extend({
  requiresKey: z.boolean(),
  hasKey: z.boolean().optional(),
});

export const listModelsResponseSchema = z.object({
  models: z.array(modelWithAccessSchema),
});

// POST /v1/models/refresh
export const refreshModelsRequestSchema = z.object({});

export const refreshModelsResponseSchema = z.object({
  message: z.string(),
  models: z.array(modelConfigSchema),
  timestamp: z.string(),
  count: z.number(),
});

// Type exports
export type ListModelsRequestSchema = z.infer<typeof listModelsRequestSchema>;
export type ModelWithAccessSchema = z.infer<typeof modelWithAccessSchema>;
export type ListModelsResponseSchema = z.infer<typeof listModelsResponseSchema>;
export type RefreshModelsRequestSchema = z.infer<typeof refreshModelsRequestSchema>;
export type RefreshModelsResponseSchema = z.infer<typeof refreshModelsResponseSchema>;
