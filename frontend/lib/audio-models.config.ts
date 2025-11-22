import type { AudioModelConfig, AudioModelId, AudioType } from "@muse/shared-schemas"
export type { AudioModelConfig }

/**
 * Audio Generation Model Configurations
 *
 * This file defines the UI configuration for each audio generation model.
 * Each model specifies its capabilities, default parameters, and UI fields.
 */

export const AUDIO_MODELS: Record<AudioModelId, AudioModelConfig> = {
  // ============================================================================
  // Text-to-Speech Models
  // ============================================================================

  "elevenlabs/tts": {
    id: "elevenlabs/tts",
    name: "ElevenLabs TTS",
    description: "High-quality, natural-sounding text-to-speech with multiple voice options and fine-tuned control",
    thumbnail: "/models/elevenlabs.png",
    badges: ["Natural Voice", "25+ Voices", "Adjustable Style"],
    capabilities: {
      audioType: "tts",
      maxDuration: 120, // ~5000 chars at normal speed
      supportsVoiceSelection: true,
      supportsStyleControl: true,
      supportsInstrumentSelection: false,
      supportsTempoControl: false,
      supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "pl", "ja", "ko", "zh"],
    },
    defaultParams: {
      voice: "rachel",
      stability: 0.5,
      clarity: 0.75,
      style_exaggeration: 0,
    },
  },

  "openai/tts-1": {
    id: "openai/tts-1",
    name: "OpenAI TTS-1",
    description: "Fast, cost-effective text-to-speech optimized for real-time applications",
    thumbnail: "/models/openai.png",
    badges: ["Fast", "6 Voices", "Real-time"],
    capabilities: {
      audioType: "tts",
      maxDuration: 90, // ~4096 chars at normal speed
      supportsVoiceSelection: true,
      supportsStyleControl: false,
      supportsInstrumentSelection: false,
      supportsTempoControl: true,
      supportedLanguages: ["multilingual"],
    },
    defaultParams: {
      voice: "alloy",
      speed: 1.0,
    },
  },

  "openai/tts-1-hd": {
    id: "openai/tts-1-hd",
    name: "OpenAI TTS-1 HD",
    description: "High-definition text-to-speech with superior audio quality and natural intonation",
    thumbnail: "/models/openai.png",
    badges: ["HD Quality", "6 Voices", "Natural"],
    capabilities: {
      audioType: "tts",
      maxDuration: 90, // ~4096 chars at normal speed
      supportsVoiceSelection: true,
      supportsStyleControl: false,
      supportsInstrumentSelection: false,
      supportsTempoControl: true,
      supportedLanguages: ["multilingual"],
    },
    defaultParams: {
      voice: "alloy",
      speed: 1.0,
    },
  },

  // ============================================================================
  // Music Generation Models
  // ============================================================================

  "meta/musicgen": {
    id: "meta/musicgen",
    name: "MusicGen",
    description: "Meta's AI music generator that creates high-quality music from text descriptions",
    thumbnail: "/models/meta.png",
    badges: ["AI Music", "30s Max", "Multiple Sizes"],
    capabilities: {
      audioType: "music",
      maxDuration: 30,
      supportsVoiceSelection: false,
      supportsStyleControl: true,
      supportsInstrumentSelection: false,
      supportsTempoControl: false,
    },
    defaultParams: {
      duration: 8,
      temperature: 1.0,
      top_k: 250,
      top_p: 0,
      classifier_free_guidance: 3,
      model_version: "large",
    },
  },

  "suno/v3.5": {
    id: "suno/v3.5",
    name: "Suno V3.5",
    description: "Advanced AI music generation with extended duration support and rich genre/mood controls",
    thumbnail: "/models/suno.png",
    badges: ["Pro Quality", "2min Max", "Genre Control"],
    capabilities: {
      audioType: "music",
      maxDuration: 120,
      supportsVoiceSelection: false,
      supportsStyleControl: true,
      supportsInstrumentSelection: true,
      supportsTempoControl: true,
    },
    defaultParams: {
      duration: 30,
      tempo: "medium",
    },
  },

  // ============================================================================
  // Sound Effects Models
  // ============================================================================

  "meta/audiogen": {
    id: "meta/audiogen",
    name: "AudioGen",
    description: "Generate realistic environmental and action sound effects from text descriptions",
    thumbnail: "/models/meta.png",
    badges: ["Sound FX", "10s Max", "Realistic"],
    capabilities: {
      audioType: "sfx",
      maxDuration: 10,
      supportsVoiceSelection: false,
      supportsStyleControl: false,
      supportsInstrumentSelection: false,
      supportsTempoControl: false,
    },
    defaultParams: {
      duration: 5,
      temperature: 1.0,
      top_k: 250,
      top_p: 0,
    },
  },

  "elevenlabs/sfx": {
    id: "elevenlabs/sfx",
    name: "ElevenLabs SFX",
    description: "AI-powered sound effects generator with high quality and quick generation times",
    thumbnail: "/models/elevenlabs.png",
    badges: ["Quick Gen", "22s Max", "High Quality"],
    capabilities: {
      audioType: "sfx",
      maxDuration: 22,
      supportsVoiceSelection: false,
      supportsStyleControl: false,
      supportsInstrumentSelection: false,
      supportsTempoControl: false,
    },
    defaultParams: {
      duration: 5,
    },
  },
}

/**
 * Get model configuration by ID
 */
export function getAudioModelConfig(modelId: AudioModelId): AudioModelConfig {
  return AUDIO_MODELS[modelId]
}

/**
 * Get all available models as array
 */
export function getAllAudioModels(): AudioModelConfig[] {
  return Object.values(AUDIO_MODELS)
}

/**
 * Get models filtered by audio type
 */
export function getAudioModelsByType(audioType: AudioType): AudioModelConfig[] {
  return getAllAudioModels().filter((model) => model.capabilities.audioType === audioType)
}

/**
 * UI Field Configurations for each model
 * Defines what form fields to show and their types
 */

export type FieldType = "select" | "number" | "slider" | "toggle" | "text" | "textarea"

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
  placeholder?: string
  rows?: number // For textarea
  advanced?: boolean // Mark as advanced parameter (collapsed by default)
  fullWidth?: boolean // Render as full width (not in grid)
}

export const AUDIO_MODEL_UI_FIELDS: Record<AudioModelId, FieldConfig[]> = {
  "elevenlabs/tts": [
    {
      name: "voice",
      label: "Voice",
      type: "select",
      options: [
        { value: "rachel", label: "Rachel (Female, Calm)" },
        { value: "drew", label: "Drew (Male, Well-Rounded)" },
        { value: "clyde", label: "Clyde (Male, War Veteran)" },
        { value: "paul", label: "Paul (Male, Narration)" },
        { value: "domi", label: "Domi (Female, Strong)" },
        { value: "dave", label: "Dave (Male, British)" },
        { value: "fin", label: "Fin (Male, Irish)" },
        { value: "sarah", label: "Sarah (Female, Soft)" },
        { value: "antoni", label: "Antoni (Male, Well-Rounded)" },
        { value: "thomas", label: "Thomas (Male, Calm)" },
        { value: "charlie", label: "Charlie (Male, Casual)" },
        { value: "emily", label: "Emily (Female, Calm)" },
        { value: "elli", label: "Elli (Female, Emotional)" },
        { value: "callum", label: "Callum (Male, Intense)" },
        { value: "patrick", label: "Patrick (Male, Shouty)" },
        { value: "harry", label: "Harry (Male, Anxious)" },
        { value: "liam", label: "Liam (Male, Neutral)" },
        { value: "dorothy", label: "Dorothy (Female, Pleasant)" },
        { value: "josh", label: "Josh (Male, Young)" },
        { value: "arnold", label: "Arnold (Male, Crisp)" },
        { value: "charlotte", label: "Charlotte (Female, English)" },
        { value: "alice", label: "Alice (Female, British)" },
        { value: "matilda", label: "Matilda (Female, Warm)" },
        { value: "james", label: "James (Male, News)" },
      ],
      defaultValue: "rachel",
      fullWidth: true,
    },
    {
      name: "stability",
      label: "Stability",
      type: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      description: "Higher = more consistent, lower = more expressive",
      advanced: true,
    },
    {
      name: "clarity",
      label: "Clarity",
      type: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.75,
      description: "Higher = clearer enunciation",
      advanced: true,
    },
    {
      name: "style_exaggeration",
      label: "Style Exaggeration",
      type: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0,
      description: "Higher = more exaggerated speaking style",
      advanced: true,
    },
  ],

  "openai/tts-1": [
    {
      name: "voice",
      label: "Voice",
      type: "select",
      options: [
        { value: "alloy", label: "Alloy (Neutral)" },
        { value: "echo", label: "Echo (Male)" },
        { value: "fable", label: "Fable (British Male)" },
        { value: "onyx", label: "Onyx (Deep Male)" },
        { value: "nova", label: "Nova (Female)" },
        { value: "shimmer", label: "Shimmer (Soft Female)" },
      ],
      defaultValue: "alloy",
      fullWidth: true,
    },
    {
      name: "speed",
      label: "Speed",
      type: "slider",
      min: 0.25,
      max: 4.0,
      step: 0.25,
      defaultValue: 1.0,
      description: "Speech speed (0.25x to 4.0x)",
      fullWidth: true,
    },
  ],

  "openai/tts-1-hd": [
    {
      name: "voice",
      label: "Voice",
      type: "select",
      options: [
        { value: "alloy", label: "Alloy (Neutral)" },
        { value: "echo", label: "Echo (Male)" },
        { value: "fable", label: "Fable (British Male)" },
        { value: "onyx", label: "Onyx (Deep Male)" },
        { value: "nova", label: "Nova (Female)" },
        { value: "shimmer", label: "Shimmer (Soft Female)" },
      ],
      defaultValue: "alloy",
      fullWidth: true,
    },
    {
      name: "speed",
      label: "Speed",
      type: "slider",
      min: 0.25,
      max: 4.0,
      step: 0.25,
      defaultValue: 1.0,
      description: "Speech speed (0.25x to 4.0x)",
      fullWidth: true,
    },
  ],

  "meta/musicgen": [
    {
      name: "duration",
      label: "Duration (seconds)",
      type: "slider",
      min: 1,
      max: 30,
      step: 1,
      defaultValue: 8,
      fullWidth: true,
    },
    {
      name: "model_version",
      label: "Model Size",
      type: "select",
      options: [
        { value: "small", label: "Small (Fastest)" },
        { value: "medium", label: "Medium (Balanced)" },
        { value: "large", label: "Large (Best Quality)" },
        { value: "melody", label: "Melody (Melodic Focus)" },
      ],
      defaultValue: "large",
      fullWidth: true,
    },
    {
      name: "temperature",
      label: "Temperature",
      type: "slider",
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1.0,
      description: "Higher = more creative/random",
      advanced: true,
    },
    {
      name: "top_k",
      label: "Top K",
      type: "number",
      min: 0,
      max: 250,
      step: 10,
      defaultValue: 250,
      description: "Number of top samples to consider",
      advanced: true,
    },
    {
      name: "classifier_free_guidance",
      label: "Guidance Scale",
      type: "slider",
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 3,
      description: "How closely to follow the prompt",
      advanced: true,
    },
  ],

  "suno/v3.5": [
    {
      name: "duration",
      label: "Duration (seconds)",
      type: "slider",
      min: 5,
      max: 120,
      step: 5,
      defaultValue: 30,
      fullWidth: true,
    },
    {
      name: "genre",
      label: "Genre (optional)",
      type: "text",
      placeholder: "e.g., jazz, rock, classical",
      description: "Specify the music genre",
      fullWidth: true,
    },
    {
      name: "mood",
      label: "Mood (optional)",
      type: "text",
      placeholder: "e.g., upbeat, melancholic, energetic",
      description: "Specify the overall mood",
      fullWidth: true,
    },
    {
      name: "tempo",
      label: "Tempo",
      type: "select",
      options: [
        { value: "very_slow", label: "Very Slow" },
        { value: "slow", label: "Slow" },
        { value: "medium", label: "Medium" },
        { value: "fast", label: "Fast" },
        { value: "very_fast", label: "Very Fast" },
      ],
      defaultValue: "medium",
      fullWidth: true,
    },
  ],

  "meta/audiogen": [
    {
      name: "duration",
      label: "Duration (seconds)",
      type: "slider",
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 5,
      fullWidth: true,
    },
    {
      name: "temperature",
      label: "Temperature",
      type: "slider",
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1.0,
      description: "Higher = more creative/random",
      advanced: true,
    },
    {
      name: "top_k",
      label: "Top K",
      type: "number",
      min: 0,
      max: 250,
      step: 10,
      defaultValue: 250,
      description: "Number of top samples to consider",
      advanced: true,
    },
  ],

  "elevenlabs/sfx": [
    {
      name: "duration",
      label: "Duration (seconds)",
      type: "slider",
      min: 0.5,
      max: 22,
      step: 0.5,
      defaultValue: 5,
      fullWidth: true,
    },
  ],
}

/**
 * Get UI fields for a specific model
 */
export function getAudioModelUIFields(modelId: AudioModelId): FieldConfig[] {
  return AUDIO_MODEL_UI_FIELDS[modelId]
}
