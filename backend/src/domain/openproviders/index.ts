import { anthropic, createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI, openai } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import { getProviderForModel } from "./provider-map.js"
import type { AnthropicModel, OpenAIModel, SupportedModel } from "./types.js"

type OpenAIChatSettings = Parameters<typeof openai>[0]
type AnthropicProviderSettings = Parameters<typeof anthropic>[0]

type ModelSettings<T extends SupportedModel> = T extends OpenAIModel
  ? OpenAIChatSettings
  : T extends AnthropicModel
    ? AnthropicProviderSettings
    : never

export type OpenProvidersOptions<T extends SupportedModel> = ModelSettings<T>

export function openproviders<T extends SupportedModel>(
  modelId: T,
  settings?: OpenProvidersOptions<T>,
  apiKey?: string
): LanguageModel {
  const provider = getProviderForModel(modelId)

  if (provider === "openai") {
    if (apiKey) {
      const openaiProvider = createOpenAI({
        apiKey,
      })
      return openaiProvider(modelId as OpenAIModel)
    }
    return openai(modelId as OpenAIModel)
  }

  if (provider === "anthropic") {
    if (apiKey) {
      const anthropicProvider = createAnthropic({ apiKey })
      return anthropicProvider(modelId as AnthropicModel)
    }
    return anthropic(modelId as AnthropicModel)
  }

  throw new Error(`Unsupported model: ${modelId}`)
}
