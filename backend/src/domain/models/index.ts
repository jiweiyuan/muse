import { FREE_MODELS_IDS } from "../../config/constants.js"
import { claudeModels } from "./data/claude.js"
import { openaiModels } from "./data/openai.js"
import { ModelConfig } from "./types.js"

// Static models (always available)
const STATIC_MODELS: ModelConfig[] = [...openaiModels, ...claudeModels]

// Function to get all models
export async function getAllModels(): Promise<ModelConfig[]> {
  return STATIC_MODELS
}

export async function getModelsWithAccessFlags(): Promise<ModelConfig[]> {
  const models = await getAllModels()

  const freeModels = models
    .filter((model) =>
      (FREE_MODELS_IDS as readonly string[]).includes(model.id)
    )
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  const proModels = models
    .filter((model) => !freeModels.map((m) => m.id).includes(model.id))
    .map((model) => ({
      ...model,
      accessible: false,
    }))

  return [...freeModels, ...proModels]
}

export async function getModelsForProvider(
  provider: string
): Promise<ModelConfig[]> {
  const models = STATIC_MODELS

  const providerModels = models
    .filter((model) => model.providerId === provider)
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  return providerModels
}

// Function to get models based on user's available providers
export async function getModelsForUserProviders(
  providers: string[]
): Promise<ModelConfig[]> {
  const providerModels = await Promise.all(
    providers.map((provider) => getModelsForProvider(provider))
  )

  const flatProviderModels = providerModels.flat()

  return flatProviderModels
}

// Synchronous function to get model info for simple lookups
export function getModelInfo(modelId: string): ModelConfig | undefined {
  return STATIC_MODELS.find((model) => model.id === modelId)
}

// Refresh models cache (no-op for static models, placeholder for future dynamic models)
export function refreshModelsCache(): void {
  // Currently a no-op as models are static
  // This function exists for API compatibility and future dynamic model support
}

// For backward compatibility - static models only
export const MODELS: ModelConfig[] = STATIC_MODELS
