import { z } from "zod";
import { uuidSchema, userIdSchema, isoDateTimeSchema } from "./common.schema.js";

/**
 * Asset Schema Definitions
 * File storage and asset management schemas
 */

// OSS provider enum
export const ossProviderSchema = z.enum(["cloudflare"]);

// Asset schema
export const assetSchema = z.object({
  id: uuidSchema,
  assetId: z.string().min(1),
  userId: userIdSchema,
  // Object storage metadata
  ossProvider: ossProviderSchema.default("cloudflare"),
  ossBucket: z.string().min(1),
  ossKey: z.string().min(1),
  ossEtag: z.string().nullable(),
  // File metadata
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
  originalFilename: z.string().nullable(),
  // Timestamps
  uploadedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});

// Asset with public URL
export const assetWithUrlSchema = assetSchema.extend({
  publicUrl: z.string().url(),
});

// Type exports
export type OssProviderSchema = z.infer<typeof ossProviderSchema>;
export type AssetSchema = z.infer<typeof assetSchema>;
export type AssetWithUrlSchema = z.infer<typeof assetWithUrlSchema>;
