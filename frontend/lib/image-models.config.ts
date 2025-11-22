import type { ImageModelConfig, ImageModelId } from "@muse/shared-schemas"
export type { ImageModelConfig }

/**
 * Image Generation Model Configurations
 *
 * This file defines the UI configuration for each image generation model.
 * Each model specifies its capabilities, default parameters, and UI fields.
 */

export const IMAGE_MODELS: Record<ImageModelId, ImageModelConfig> = {
  "bytedance/seedream-4": {
    id: "bytedance/seedream-4",
    name: "Seedream 4.0",
    description: "Unified text-to-image generation and precise single-sentence editing at up to 4K resolution",
    thumbnail: "/models/jimeng.webp",
    badges: ["4K Resolution", "Set Generation"],
    capabilities: {
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsMultipleInputImages: true,
      maxInputImages: 10,
      supportsSequentialGeneration: true,
      supportsCustomDimensions: true,
      supportsPromptEnhancement: true,
      supportsSeedControl: false,
    },
    defaultParams: {
      size: "2K",
      aspect_ratio: "4:3",
      sequential_image_generation: "disabled",
      max_images: 1,
      enhance_prompt: false,
    },
  },

  "google/nano-banana": {
    id: "google/nano-banana",
    name: "Nano Banana",
    description: "Google's latest image editing model in Gemini 2.5. Optimized for conversational editing and multi-image fusion",
    thumbnail: "/models/google.png",
    badges: ["3 Images Input", "Image Editing", "Multi-Fusion"],
    capabilities: {
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsMultipleInputImages: true,
      maxInputImages: 3,
      supportsSequentialGeneration: false,
      supportsCustomDimensions: false,
      supportsPromptEnhancement: false,
      supportsSeedControl: false,
    },
    defaultParams: {
      aspect_ratio: "1:1",
      output_format: "png",
    },
  },

  "black-forest-labs/flux-1.1-pro": {
    id: "black-forest-labs/flux-1.1-pro",
    name: "FLUX 1.1 Pro",
    description: "Faster, better FLUX Pro. 6x faster than FLUX.1 with excellent image quality and prompt adherence",
    thumbnail: "/models/bfl.png",
    badges: ["Ultra Fast", "Redux Support", "High Quality"],
    capabilities: {
      supportsTextToImage: true,
      supportsImageToImage: true, // Via Redux
      supportsMultipleInputImages: false,
      maxInputImages: 1,
      supportsSequentialGeneration: false,
      supportsCustomDimensions: true,
      supportsPromptEnhancement: true,
      supportsSeedControl: true,
    },
    defaultParams: {
      aspect_ratio: "1:1",
      output_format: "png",
      output_quality: 80,
      safety_tolerance: 2,
      prompt_upsampling: false,
    },
  },
}

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: ImageModelId): ImageModelConfig {
  return IMAGE_MODELS[modelId]
}

/**
 * Get all available models as array
 */
export function getAllModels(): ImageModelConfig[] {
  return Object.values(IMAGE_MODELS)
}

/**
 * UI Field Configurations for each model
 * Defines what form fields to show and their types
 */

export type FieldType = "select" | "number" | "toggle" | "imageUpload"

export interface FieldConfig {
  name: string
  label: string
  type: FieldType
  options?: { value: string | number; label: string }[]
  min?: number
  max?: number
  step?: number
  defaultValue?: any
  description?: string
  dependsOn?: { field: string; value: any } // Conditional rendering
  advanced?: boolean // Mark as advanced parameter (collapsed by default)
  fullWidth?: boolean // Render as full width (not in grid)
  modeOnly?: "text-to-image" | "image-to-image" // Only show in specific mode
}

export const MODEL_UI_FIELDS: Record<ImageModelId, FieldConfig[]> = {
  "bytedance/seedream-4": [
    {
      name: "image_input",
      label: "Input Images",
      type: "imageUpload",
      description: "Upload 1-10 images for editing or fusion",
      modeOnly: "image-to-image",
      fullWidth: true,
    },
    {
      name: "aspect_ratio",
      label: "Aspect Ratio",
      type: "select",
      options: [
        { value: "1:1", label: "1:1" },
        { value: "2:3", label: "2:3" },
        { value: "3:2", label: "3:2" },
        { value: "3:4", label: "3:4" },
        { value: "4:3", label: "4:3" },
        { value: "4:5", label: "4:5" },
        { value: "5:4", label: "5:4" },
        { value: "9:16", label: "9:16" },
        { value: "16:9", label: "16:9" },
        { value: "21:9", label: "21:9" },
        { value: "match_input_image", label: "Match Input" },
      ],
      defaultValue: "4:3",
      fullWidth: true,
    },
    {
      name: "size",
      label: "Resolution",
      type: "select",
      options: [
        { value: "1K", label: "1K (1024px)" },
        { value: "2K", label: "2K (2048px)" },
        { value: "4K", label: "4K (4096px)" },
        { value: "custom", label: "Custom" },
      ],
      defaultValue: "2K",
      advanced: true,
    },
    {
      name: "width",
      label: "Width",
      type: "number",
      min: 1024,
      max: 4096,
      step: 64,
      description: "Custom width (only when size is 'custom')",
      dependsOn: { field: "size", value: "custom" },
      advanced: true,
    },
    {
      name: "height",
      label: "Height",
      type: "number",
      min: 1024,
      max: 4096,
      step: 64,
      description: "Custom height (only when size is 'custom')",
      dependsOn: { field: "size", value: "custom" },
      advanced: true,
    },
    {
      name: "sequential_image_generation",
      label: "Sequential Generation",
      type: "select",
      options: [
        { value: "disabled", label: "Single Image" },
        { value: "auto", label: "Auto (Multiple Related)" },
      ],
      defaultValue: "disabled",
      description: "Generate multiple related images (e.g., story scenes)",
      advanced: true,
    },
    {
      name: "max_images",
      label: "Max Images",
      type: "number",
      min: 1,
      max: 15,
      step: 1,
      defaultValue: 1,
      description: "Maximum images to generate (when sequential is 'auto')",
      dependsOn: { field: "sequential_image_generation", value: "auto" },
      advanced: true,
    },
    {
      name: "enhance_prompt",
      label: "Enhance Prompt",
      type: "toggle",
      defaultValue: false,
      description: "Enable prompt enhancement for higher quality (slower)",
      advanced: true,
    },
  ],

  "google/nano-banana": [
    {
      name: "image_input",
      label: "Input Images",
      type: "imageUpload",
      description: "Upload 1-3 images for editing or fusion",
      modeOnly: "image-to-image",
      fullWidth: true,
    },
    {
      name: "aspect_ratio",
      label: "Aspect Ratio",
      type: "select",
      options: [
        { value: "1:1", label: "1:1" },
        { value: "2:3", label: "2:3" },
        { value: "3:2", label: "3:2" },
        { value: "3:4", label: "3:4" },
        { value: "4:3", label: "4:3" },
        { value: "4:5", label: "4:5" },
        { value: "5:4", label: "5:4" },
        { value: "9:16", label: "9:16" },
        { value: "16:9", label: "16:9" },
        { value: "21:9", label: "21:9" },
      ],
      defaultValue: "1:1",
      fullWidth: true,
    },
  ],

  "black-forest-labs/flux-1.1-pro": [
    {
      name: "image_prompt",
      label: "Redux Image",
      type: "imageUpload",
      description: "Upload 1 image to guide generation (Redux mode)",
      modeOnly: "image-to-image",
      fullWidth: true,
    },
    {
      name: "aspect_ratio",
      label: "Aspect Ratio",
      type: "select",
      options: [
        { value: "1:1", label: "1:1" },
        { value: "2:3", label: "2:3" },
        { value: "3:2", label: "3:2" },
        { value: "3:4", label: "3:4" },
        { value: "4:3", label: "4:3" },
        { value: "4:5", label: "4:5" },
        { value: "5:4", label: "5:4" },
        { value: "9:16", label: "9:16" },
        { value: "16:9", label: "16:9" },
        { value: "21:9", label: "21:9" },
        { value: "custom", label: "Custom" },
      ],
      defaultValue: "1:1",
      fullWidth: true,
    },
    {
      name: "width",
      label: "Width",
      type: "number",
      min: 256,
      max: 1440,
      step: 32,
      description: "Custom width (must be multiple of 32)",
      dependsOn: { field: "aspect_ratio", value: "custom" },
      advanced: true,
    },
    {
      name: "height",
      label: "Height",
      type: "number",
      min: 256,
      max: 1440,
      step: 32,
      description: "Custom height (must be multiple of 32)",
      dependsOn: { field: "aspect_ratio", value: "custom" },
      advanced: true,
    },
    {
      name: "output_quality",
      label: "Output Quality",
      type: "number",
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 80,
      description: "Quality (0-100, higher is better)",
      advanced: true,
    },
    {
      name: "safety_tolerance",
      label: "Safety Tolerance",
      type: "number",
      min: 1,
      max: 6,
      step: 1,
      defaultValue: 2,
      description: "1 is most strict, 6 is most permissive",
      advanced: true,
    },
    {
      name: "prompt_upsampling",
      label: "Prompt Upsampling",
      type: "toggle",
      defaultValue: false,
      description: "Automatically enhance prompt for creative generation",
      advanced: true,
    },
    {
      name: "seed",
      label: "Seed (Optional)",
      type: "number",
      min: 0,
      max: 2147483647,
      step: 1,
      description: "Set for reproducible generation",
      advanced: true,
    },
  ],
}

/**
 * Get UI fields for a specific model
 */
export function getModelUIFields(modelId: ImageModelId): FieldConfig[] {
  return MODEL_UI_FIELDS[modelId]
}
