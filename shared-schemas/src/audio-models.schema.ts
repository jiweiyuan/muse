import { z } from "zod"

/**
 * Audio Generation Model Schemas
 *
 * This file defines the schema for different audio generation models,
 * their parameters, and capabilities. Supports:
 * - Text-to-Speech (TTS)
 * - Music Generation
 * - Sound Effects (SFX)
 */

// ============================================================================
// Model IDs (enum for type safety)
// ============================================================================

export const audioModelIdSchema = z.enum([
  // Text-to-Speech Models
  "elevenlabs/tts",
  "openai/tts-1",
  "openai/tts-1-hd",
  // Music Generation Models
  "meta/musicgen",
  "suno/v3.5",
  // Sound Effects Models
  "meta/audiogen",
  "elevenlabs/sfx",
])

export type AudioModelId = z.infer<typeof audioModelIdSchema>

// ============================================================================
// Audio Types
// ============================================================================

export const audioTypeSchema = z.enum(["tts", "music", "sfx"])
export type AudioType = z.infer<typeof audioTypeSchema>

// ============================================================================
// Model-Specific Parameter Schemas
// ============================================================================

/**
 * ElevenLabs TTS Parameters
 * - High-quality voice synthesis
 * - Multiple voice options
 * - Adjustable stability and clarity
 */
export const elevenlabsTTSParamsSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.enum([
    "rachel", "drew", "clyde", "paul", "domi", "dave", "fin",
    "sarah", "antoni", "thomas", "charlie", "emily", "elli",
    "callum", "patrick", "harry", "liam", "dorothy", "josh",
    "arnold", "charlotte", "alice", "matilda", "james"
  ]).optional().default("rachel"),
  stability: z.number().min(0).max(1).optional().default(0.5),
  clarity: z.number().min(0).max(1).optional().default(0.75),
  style_exaggeration: z.number().min(0).max(1).optional().default(0),
})

/**
 * OpenAI TTS Parameters
 * - Multiple voice options
 * - Two quality tiers (tts-1 and tts-1-hd)
 * - Speed control
 */
export const openaiTTSParamsSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional().default("alloy"),
  speed: z.number().min(0.25).max(4.0).optional().default(1.0),
})

/**
 * Meta MusicGen Parameters
 * - Text-to-music generation
 * - Adjustable duration and temperature
 * - Multiple model sizes
 */
export const musicgenParamsSchema = z.object({
  prompt: z.string().min(1).max(1000),
  duration: z.number().min(1).max(30).optional().default(8),
  temperature: z.number().min(0).max(2).optional().default(1.0),
  top_k: z.number().int().min(0).max(250).optional().default(250),
  top_p: z.number().min(0).max(1).optional().default(0),
  classifier_free_guidance: z.number().min(0).max(10).optional().default(3),
  model_version: z.enum(["melody", "large", "medium", "small"]).optional().default("large"),
})

/**
 * Suno V3.5 Parameters
 * - High-quality music generation
 * - Style and mood controls
 * - Longer durations supported
 */
export const sunoV35ParamsSchema = z.object({
  prompt: z.string().min(1).max(2000),
  duration: z.number().min(5).max(120).optional().default(30),
  genre: z.string().optional(),
  mood: z.string().optional(),
  instruments: z.array(z.string()).optional(),
  tempo: z.enum(["very_slow", "slow", "medium", "fast", "very_fast"]).optional().default("medium"),
})

/**
 * Meta AudioGen Parameters
 * - Sound effects generation
 * - Environmental and action sounds
 */
export const audiogenParamsSchema = z.object({
  prompt: z.string().min(1).max(500),
  duration: z.number().min(1).max(10).optional().default(5),
  temperature: z.number().min(0).max(2).optional().default(1.0),
  top_k: z.number().int().min(0).max(250).optional().default(250),
  top_p: z.number().min(0).max(1).optional().default(0),
})

/**
 * ElevenLabs Sound Effects Parameters
 * - AI-generated sound effects
 * - Short duration, high quality
 */
export const elevenlabsSFXParamsSchema = z.object({
  prompt: z.string().min(1).max(500),
  duration: z.number().min(0.5).max(22).optional().default(5),
})

// ============================================================================
// Union Type for All Model Parameters
// ============================================================================

export const audioModelParamsSchema = z.union([
  elevenlabsTTSParamsSchema,
  openaiTTSParamsSchema,
  musicgenParamsSchema,
  sunoV35ParamsSchema,
  audiogenParamsSchema,
  elevenlabsSFXParamsSchema,
])

export type ElevenlabsTTSParams = z.infer<typeof elevenlabsTTSParamsSchema>
export type OpenAITTSParams = z.infer<typeof openaiTTSParamsSchema>
export type MusicgenParams = z.infer<typeof musicgenParamsSchema>
export type SunoV35Params = z.infer<typeof sunoV35ParamsSchema>
export type AudiogenParams = z.infer<typeof audiogenParamsSchema>
export type ElevenlabsSFXParams = z.infer<typeof elevenlabsSFXParamsSchema>
export type AudioModelParams = z.infer<typeof audioModelParamsSchema>

// ============================================================================
// Model Capabilities
// ============================================================================

export const audioModelCapabilitiesSchema = z.object({
  audioType: audioTypeSchema,
  maxDuration: z.number(), // Maximum duration in seconds
  supportsVoiceSelection: z.boolean(),
  supportsStyleControl: z.boolean(),
  supportsInstrumentSelection: z.boolean(),
  supportsTempoControl: z.boolean(),
  supportedLanguages: z.array(z.string()).optional(),
})

export type AudioModelCapabilities = z.infer<typeof audioModelCapabilitiesSchema>

// ============================================================================
// Model Configuration (for UI and validation)
// ============================================================================

export const audioModelConfigSchema = z.object({
  id: audioModelIdSchema,
  name: z.string(),
  description: z.string(),
  thumbnail: z.string().url(),
  badges: z.array(z.string()),
  capabilities: audioModelCapabilitiesSchema,
  defaultParams: z.record(z.any()), // Model-specific defaults
})

export type AudioModelConfig = z.infer<typeof audioModelConfigSchema>

// ============================================================================
// Task Body for Generate Audio (includes model selection)
// ============================================================================

export const generateAudioWithModelBodySchema = z.object({
  modelId: audioModelIdSchema,
  modelParams: audioModelParamsSchema,
  storageAssetId: z
    .string()
    .min(1)
    .describe(
      "Pre-generated storage ID for the asset (e.g., 'c7b3d8f0-ai-audio-1699234567.mp3'). " +
        "Generated by frontend using uniqueId() to ensure consistent ID format with manual uploads."
    ),
})

export type GenerateAudioWithModelBody = z.infer<typeof generateAudioWithModelBodySchema>
