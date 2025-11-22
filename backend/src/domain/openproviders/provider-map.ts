import type { Provider, SupportedModel } from "./types.js"

// map each model ID to its provider
const MODEL_PROVIDER_MAP: Record<string, Provider> = {
  o1: "openai",
  "o1-2024-12-17": "openai",
  "o1-mini": "openai",
  "o1-mini-2024-09-12": "openai",
  "o1-preview": "openai",
  "o1-preview-2024-09-12": "openai",
  "o3-mini": "openai",
  "o3-mini-2025-01-31": "openai",
  "gpt-4.1": "openai",
  "gpt-4.1-2025-04-14": "openai",
  "gpt-4.1-mini": "openai",
  "gpt-4.1-mini-2025-04-14": "openai",
  "gpt-4.1-nano": "openai",
  "gpt-4.1-nano-2025-04-14": "openai",
  "gpt-4o": "openai",
  "gpt-4o-2024-05-13": "openai",
  "gpt-4o-2024-08-06": "openai",
  "gpt-4o-2024-11-20": "openai",
  "gpt-4o-audio-preview": "openai",
  "gpt-4o-audio-preview-2024-10-01": "openai",
  "gpt-4o-audio-preview-2024-12-17": "openai",
  "gpt-4o-search-preview": "openai",
  "gpt-4o-search-preview-2025-03-11": "openai",
  "gpt-4o-mini": "openai",
  "gpt-4o-mini-2024-07-18": "openai",
  "gpt-4-turbo": "openai",
  "gpt-4-turbo-2024-04-09": "openai",
  "gpt-4-turbo-preview": "openai",
  "gpt-4-0125-preview": "openai",
  "gpt-4-1106-preview": "openai",
  "gpt-4": "openai",
  "gpt-4-0613": "openai",
  "gpt-4.5-preview": "openai",
  "gpt-4.5-preview-2025-02-27": "openai",
  "gpt-3.5-turbo-0125": "openai",
  "gpt-3.5-turbo": "openai",
  "gpt-3.5-turbo-1106": "openai",
  "chatgpt-4o-latest": "openai",
  "gpt-3.5-turbo-instruct": "openai",
  o3: "openai",
  "o3-2025-04-16": "openai",
  "o4-mini": "openai",
  "o4-mini-2025-04-16": "openai",

  // Anthropic
  "claude-3-7-sonnet-20250219": "anthropic",
  "claude-3-5-sonnet-latest": "anthropic",
  "claude-3-5-sonnet-20241022": "anthropic",
  "claude-3-5-sonnet-20240620": "anthropic",
  "claude-3-5-haiku-latest": "anthropic",
  "claude-3-5-haiku-20241022": "anthropic",
  "claude-3-opus-latest": "anthropic",
  "claude-3-opus-20240229": "anthropic",
  "claude-3-sonnet-20240229": "anthropic",
  "claude-3-haiku-20240307": "anthropic",
}

export function getProviderForModel(model: SupportedModel): Provider {
  if (model.startsWith("openrouter:")) {
    return "openrouter"
  }

  // Check the static mapping
  const provider = MODEL_PROVIDER_MAP[model]
  if (provider) return provider

  throw new Error(`Unknown provider for model: ${model}`)
}
