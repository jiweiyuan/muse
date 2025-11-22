export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
}

export function createEnvWithUserKeys(
  userKeys: Record<string, string> = {}
): typeof env {
  return {
    OPENAI_API_KEY: userKeys.openai || env.OPENAI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY:
      userKeys.google || env.GOOGLE_GENERATIVE_AI_API_KEY,
    ANTHROPIC_API_KEY: userKeys.anthropic || env.ANTHROPIC_API_KEY,
    OPENROUTER_API_KEY: userKeys.openrouter || env.OPENROUTER_API_KEY,
  }
}
