import { z } from "zod";
import { uuidSchema } from "./common.schema.js";

/**
 * Tool API Schema Definitions
 * API request/response schemas for AI tool endpoints (image processing, generation, etc.)
 */

// POST /v1/tools/image/upscale
export const upscaleImageRequestSchema = z.object({
  assetId: z.string(),
  factor: z.union([z.literal(2), z.literal(4)]),
  canvasId: uuidSchema,
});

export const imageProcessResponseSchema = z.object({
  assetId: z.string(),
  assetUrl: z.string().url(),
});

// POST /v1/tools/image/remove-background
export const removeBackgroundRequestSchema = z.object({
  assetId: z.string(),
  canvasId: uuidSchema,
});

// POST /v1/tools/image/generate
export const generateImageRequestSchema = z.object({
  prompt: z.string().min(1),
  canvasId: uuidSchema,
  aspectRatio: z.string().optional(),
  outputFormat: z.string().optional(),
});

// Type exports
export type UpscaleImageRequestSchema = z.infer<typeof upscaleImageRequestSchema>;
export type ImageProcessResponseSchema = z.infer<typeof imageProcessResponseSchema>;
export type RemoveBackgroundRequestSchema = z.infer<typeof removeBackgroundRequestSchema>;
export type GenerateImageRequestSchema = z.infer<typeof generateImageRequestSchema>;
