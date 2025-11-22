import { z } from "zod"

/**
 * Image Generation Model Schemas
 *
 * This file defines the schema for different image generation models,
 * their parameters, and capabilities. Each model has its own parameter
 * schema based on the Replicate API documentation.
 */

// ============================================================================
// Model IDs (enum for type safety)
// ============================================================================

export const imageModelIdSchema = z.enum([
  "bytedance/seedream-4",
  "google/nano-banana",
  "black-forest-labs/flux-1.1-pro",
])

export type ImageModelId = z.infer<typeof imageModelIdSchema>

// ============================================================================
// Model-Specific Parameter Schemas
// ============================================================================

/**
 * Seedream 4.0 Parameters
 * - Supports text-to-image and image-to-image
 * - Multi-reference input (1-10 images)
 * - Sequential generation (up to 15 images)
 * - Custom dimensions (1024-4096px)
 */
export const seedream4ParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  image_input: z.array(z.string().url()).min(0).max(10).optional(),
  size: z.enum(["1K", "2K", "4K", "custom"]).optional().default("2K"),
  aspect_ratio: z.string().optional(), // e.g., "4:3", "16:9", "match_input_image"
  width: z.number().int().min(1024).max(4096).optional(),
  height: z.number().int().min(1024).max(4096).optional(),
  sequential_image_generation: z.enum(["disabled", "auto"]).optional().default("disabled"),
  max_images: z.number().int().min(1).max(15).optional().default(1),
  enhance_prompt: z.boolean().optional().default(false),
})

/**
 * Google Nano Banana Parameters
 * - Optimized for editing and multi-image fusion
 * - Supports multiple input images
 * - Various aspect ratios
 */
export const nanoBananaParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  image_input: z.array(z.string().url()).min(0).max(3).optional(),
  aspect_ratio: z.enum([
    "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
  ]).optional().default("1:1"),
  output_format: z.enum(["jpg", "png", "webp"]).optional().default("png"),
})

/**
 * FLUX 1.1 Pro Parameters
 * - Fast, high-quality text-to-image
 * - Supports Redux image prompting
 * - Customizable quality and safety
 */
export const flux11ProParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  aspect_ratio: z.enum([
    "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "custom"
  ]).optional().default("1:1"),
  width: z.number().int().min(256).max(1440).multipleOf(32).optional(),
  height: z.number().int().min(256).max(1440).multipleOf(32).optional(),
  image_prompt: z.string().url().optional(), // Redux: guide generation with image
  output_format: z.enum(["jpg", "png", "webp"]).optional().default("webp"),
  output_quality: z.number().int().min(0).max(100).optional().default(80),
  safety_tolerance: z.number().int().min(1).max(6).optional().default(2),
  prompt_upsampling: z.boolean().optional().default(false),
  seed: z.number().int().optional(),
})

// ============================================================================
// Union Type for All Model Parameters
// ============================================================================

export const imageModelParamsSchema = z.union([
  seedream4ParamsSchema,
  nanoBananaParamsSchema,
  flux11ProParamsSchema,
])

export type Seedream4Params = z.infer<typeof seedream4ParamsSchema>
export type NanoBananaParams = z.infer<typeof nanoBananaParamsSchema>
export type Flux11ProParams = z.infer<typeof flux11ProParamsSchema>
export type ImageModelParams = z.infer<typeof imageModelParamsSchema>

// ============================================================================
// Model Capabilities
// ============================================================================

export const imageModelCapabilitiesSchema = z.object({
  supportsTextToImage: z.boolean(),
  supportsImageToImage: z.boolean(),
  supportsMultipleInputImages: z.boolean(),
  maxInputImages: z.number().optional(),
  supportsSequentialGeneration: z.boolean(),
  supportsCustomDimensions: z.boolean(),
  supportsPromptEnhancement: z.boolean(),
  supportsSeedControl: z.boolean(),
})

export type ImageModelCapabilities = z.infer<typeof imageModelCapabilitiesSchema>

// ============================================================================
// Model Configuration (for UI and validation)
// ============================================================================

export const imageModelConfigSchema = z.object({
  id: imageModelIdSchema,
  name: z.string(),
  description: z.string(),
  thumbnail: z.string().url(),
  badges: z.array(z.string()),
  capabilities: imageModelCapabilitiesSchema,
  defaultParams: z.record(z.any()), // Model-specific defaults
})

export type ImageModelConfig = z.infer<typeof imageModelConfigSchema>

// ============================================================================
// Task Body for Generate Image (includes model selection)
// ============================================================================

export const generateImageWithModelBodySchema = z.object({
  modelId: imageModelIdSchema,
  modelParams: imageModelParamsSchema,
  storageAssetId: z
    .string()
    .min(1)
    .describe(
      "Pre-generated storage ID for the asset (e.g., 'c7b3d8f0-ai-1699234567.png'). " +
        "Generated by frontend using uniqueId() to ensure consistent ID format with manual uploads."
    ),
})

export type GenerateImageWithModelBody = z.infer<typeof generateImageWithModelBodySchema>
