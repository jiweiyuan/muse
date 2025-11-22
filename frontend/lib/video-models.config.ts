import type { VideoModelConfig, VideoModelId } from "@muse/shared-schemas"
export type { VideoModelConfig }

/**
 * Video Generation Model Configurations
 *
 * This file defines the UI configuration for each video generation model.
 * Each model specifies its capabilities, default parameters, and UI fields.
 *
 * Top 3 most popular models from Krea.ai:
 * 1. Sora 2 (OpenAI) - Most popular, audio support
 * 2. Veo 3 (Google) - Highest quality
 * 3. Kling 2.5 (Kuaishou) - Excellent motion
 */

export const VIDEO_MODELS: Record<VideoModelId, VideoModelConfig> = {
  "openai/sora-2": {
    id: "openai/sora-2",
    name: "Sora 2",
    description: "OpenAI's most popular video generation model with native audio generation and excellent prompt adherence",
    thumbnail: "/models/openai.png",
    badges: ["Most Popular", "Audio Support", "720p"],
    capabilities: {
      supportsTextToVideo: true,
      supportsImageToVideo: true,
      supportsAudioGeneration: true,
      supportsStartFrame: true,
      supportsEndFrame: false,
      maxDuration: 12,
      supportedResolutions: ["720p"],
    },
    defaultParams: {
      duration: "8",
      resolution: "720p",
      aspect_ratio: "16:9",
      generate_audio: true,
    },
  },

  "google/veo-3": {
    id: "google/veo-3",
    name: "Veo 3",
    description: "Google's highest quality video generation model with 1080p support and native audio generation",
    thumbnail: "/models/google.png",
    badges: ["Highest Quality", "1080p", "Audio Support"],
    capabilities: {
      supportsTextToVideo: true,
      supportsImageToVideo: true,
      supportsAudioGeneration: true,
      supportsStartFrame: true,
      supportsEndFrame: false,
      maxDuration: 8,
      supportedResolutions: ["720p", "1080p"],
    },
    defaultParams: {
      duration: "6",
      resolution: "1080p",
      aspect_ratio: "16:9",
      generate_audio: true,
    },
  },

  "kuaishou/kling-2.5": {
    id: "kuaishou/kling-2.5",
    name: "Kling 2.5",
    description: "Kuaishou's video model optimized for excellent motion quality and dynamic camera work",
    thumbnail: "/models/kling.png",
    badges: ["Excellent Motion", "1080p", "End Frame Support"],
    capabilities: {
      supportsTextToVideo: true,
      supportsImageToVideo: true,
      supportsAudioGeneration: false,
      supportsStartFrame: true,
      supportsEndFrame: true,
      maxDuration: 10,
      supportedResolutions: ["720p", "1080p"],
    },
    defaultParams: {
      duration: "5",
      resolution: "1080p",
      aspect_ratio: "16:9",
      motion_strength: "medium",
    },
  },
}

/**
 * Get model configuration by ID
 */
export function getVideoModelConfig(modelId: VideoModelId): VideoModelConfig {
  return VIDEO_MODELS[modelId]
}

/**
 * Get all available video models as array
 */
export function getAllVideoModels(): VideoModelConfig[] {
  return Object.values(VIDEO_MODELS)
}

/**
 * Get models that support a specific mode
 */
export function getVideoModelsByMode(mode: "text-to-video" | "image-to-video"): VideoModelConfig[] {
  return getAllVideoModels().filter((model) => {
    if (mode === "text-to-video") {
      return model.capabilities.supportsTextToVideo
    } else {
      return model.capabilities.supportsImageToVideo
    }
  })
}
