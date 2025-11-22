import { z } from "zod";
import { assetSchema, ossProviderSchema } from "./asset.schema.js";
import { uuidSchema, userIdSchema, paginationRequestSchema } from "./common.schema.js";

/**
 * Asset API Schema Definitions
 * API request/response schemas for asset-related endpoints
 */

// POST /v1/assets/upload
export const uploadAssetRequestSchema = z.object({
  userId: userIdSchema,
  file: z.any(), // File upload (handled by multipart/form-data)
  projectId: uuidSchema.optional(),
});

export const uploadAssetResponseSchema = z.object({
  asset: assetSchema,
  publicUrl: z.string().url(),
});

// GET /v1/assets
export const listAssetsRequestSchema = paginationRequestSchema.extend({
  userId: userIdSchema,
  contentType: z.string().optional(),
});

export const listAssetsResponseSchema = z.object({
  assets: z.array(assetSchema),
});

// GET /v1/assets/:assetId
export const getAssetRequestSchema = z.object({
  assetId: z.string(),
  userId: userIdSchema,
});

export const getAssetResponseSchema = z.object({
  asset: assetSchema.nullable(),
  publicUrl: z.string().url().optional(),
});

// DELETE /v1/assets/:assetId
export const deleteAssetRequestSchema = z.object({
  assetId: z.string(),
  userId: userIdSchema,
});

export const deleteAssetResponseSchema = z.object({
  deleted: z.boolean(),
});

// GET /v1/assets/:assetId/url
export const getAssetUrlRequestSchema = z.object({
  assetId: z.string(),
  userId: userIdSchema,
  expiresIn: z.number().int().positive().optional().default(3600), // Default 1 hour
});

export const getAssetUrlResponseSchema = z.object({
  publicUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

// Type exports
export type UploadAssetRequestSchema = z.infer<typeof uploadAssetRequestSchema>;
export type UploadAssetResponseSchema = z.infer<typeof uploadAssetResponseSchema>;
export type ListAssetsRequestSchema = z.infer<typeof listAssetsRequestSchema>;
export type ListAssetsResponseSchema = z.infer<typeof listAssetsResponseSchema>;
export type GetAssetRequestSchema = z.infer<typeof getAssetRequestSchema>;
export type GetAssetResponseSchema = z.infer<typeof getAssetResponseSchema>;
export type DeleteAssetRequestSchema = z.infer<typeof deleteAssetRequestSchema>;
export type DeleteAssetResponseSchema = z.infer<typeof deleteAssetResponseSchema>;
export type GetAssetUrlRequestSchema = z.infer<typeof getAssetUrlRequestSchema>;
export type GetAssetUrlResponseSchema = z.infer<typeof getAssetUrlResponseSchema>;
