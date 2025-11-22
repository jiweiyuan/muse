import { z } from "zod"

/**
 * Video Generation Model Schemas
 *
 * This file defines the schema for different video generation models,
 * their parameters, and capabilities. Each model has its own parameter
 * schema based on the Krea.ai API documentation.
 */

// ============================================================================
// Model IDs (enum for type safety)
// ============================================================================

export const videoModelIdSchema = z.enum([
  "openai/sora-2",
  "google/veo-3",
  "kuaishou/kling-2.5",
])

export type VideoModelId = z.infer<typeof videoModelIdSchema>

// ============================================================================
// Model-Specific Parameter Schemas
// ============================================================================

/**
 * Sora 2 Parameters (OpenAI)
 * - Most popular video generation model
 * - Native audio generation
 * - 4s, 8s, 12s durations
 * - 720p resolution
 * - Start frame support
 */
export const sora2ParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  duration: z.enum(["4", "8", "12"]).optional().default("8"),
  resolution: z.enum(["720p"]).optional().default("720p"),
  aspect_ratio: z.enum([
    "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"
  ]).optional().default("16:9"),
  start_frame: z.string().url().optional(), // Reference image for first frame
  generate_audio: z.boolean().optional().default(true),
})

/**
 * Veo 3 Parameters (Google)
 * - Highest quality video generation
 * - Native audio generation
 * - 4s, 6s, 8s durations
 * - 720p, 1080p resolution
 * - Start frame support
 */
export const veo3ParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  duration: z.enum(["4", "6", "8"]).optional().default("6"),
  resolution: z.enum(["720p", "1080p"]).optional().default("1080p"),
  aspect_ratio: z.enum([
    "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"
  ]).optional().default("16:9"),
  start_frame: z.string().url().optional(), // Reference image for first frame
  generate_audio: z.boolean().optional().default(true),
})

/**
 * Kling 2.5 Parameters (Kuaishou)
 * - Excellent motion quality
 * - 5s, 10s durations
 * - 720p, 1080p resolution
 * - Start and end frame support
 */
export const kling25ParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  duration: z.enum(["5", "10"]).optional().default("5"),
  resolution: z.enum(["720p", "1080p"]).optional().default("1080p"),
  aspect_ratio: z.enum([
    "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"
  ]).optional().default("16:9"),
  start_frame: z.string().url().optional(), // Reference image for first frame
  end_frame: z.string().url().optional(), // Reference image for last frame
  motion_strength: z.enum(["low", "medium", "high"]).optional().default("medium"),
})

// ============================================================================
// Union Type for All Model Parameters
// ============================================================================

export const videoModelParamsSchema = z.union([
  sora2ParamsSchema,
  veo3ParamsSchema,
  kling25ParamsSchema,
])

export type Sora2Params = z.infer<typeof sora2ParamsSchema>
export type Veo3Params = z.infer<typeof veo3ParamsSchema>
export type Kling25Params = z.infer<typeof kling25ParamsSchema>
export type VideoModelParams = z.infer<typeof videoModelParamsSchema>

// ============================================================================
// Model Capabilities
// ============================================================================

export const videoModelCapabilitiesSchema = z.object({
  supportsTextToVideo: z.boolean(),
  supportsImageToVideo: z.boolean(),
  supportsAudioGeneration: z.boolean(),
  supportsStartFrame: z.boolean(),
  supportsEndFrame: z.boolean(),
  maxDuration: z.number(), // in seconds
  supportedResolutions: z.array(z.string()),
})

export type VideoModelCapabilities = z.infer<typeof videoModelCapabilitiesSchema>

// ============================================================================
// Model Configuration (for UI and validation)
// ============================================================================

export const videoModelConfigSchema = z.object({
  id: videoModelIdSchema,
  name: z.string(),
  description: z.string(),
  thumbnail: z.string().url(),
  badges: z.array(z.string()),
  capabilities: videoModelCapabilitiesSchema,
  defaultParams: z.record(z.any()), // Model-specific defaults
})

export type VideoModelConfig = z.infer<typeof videoModelConfigSchema>

// ============================================================================
// Task Body for Generate Video (includes model selection)
// ============================================================================

export const generateVideoWithModelBodySchema = z.object({
  modelId: videoModelIdSchema,
  modelParams: videoModelParamsSchema,
  storageAssetId: z
    .string()
    .min(1)
    .describe(
      "Pre-generated storage ID for the asset (e.g., 'c7b3d8f0-ai-video-1699234567.mp4'). " +
        "Generated by frontend using uniqueId() to ensure consistent ID format with manual uploads."
    ),
})

export type GenerateVideoWithModelBody = z.infer<typeof generateVideoWithModelBodySchema>
