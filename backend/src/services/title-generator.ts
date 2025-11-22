import { generateText } from "ai"
import { createOpenAI, openai } from "@ai-sdk/openai"
import { getEffectiveApiKey } from "./userKeys.js"

/**
 * Generate a concise chat title from the user's first message
 * Uses a fast, inexpensive model (gpt-4o-mini) for title generation
 */
export async function generateChatTitle(
  userMessage: string,
  apiKey?: string
): Promise<string> {
  try {
    // Truncate message if too long (keep first 1000 chars)
    const truncatedMessage = userMessage.slice(0, 1000)

    const openai = createOpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    })

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Generate a concise, descriptive title (max 6 words) for a chat conversation that starts with this message: "${truncatedMessage}".

Rules:
- Return ONLY the title, no quotes, no explanation
- Maximum 6 words
- Use title case
- Be specific and descriptive
- No generic titles like "New Chat" or "Conversation"

Example good titles:
- "Python Data Analysis Help"
- "Recipe for Chocolate Cake"
- "Travel Tips for Japan"
- "Debug React Component Error"`,
      temperature: 0.7,
    })

    // Clean up the response and limit length
    const title = text
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, 60)

    return title || "New Chat"
  } catch (error) {
    console.error("Failed to generate chat title:", error)
    // Fallback: use first few words of the message
    const words = userMessage.trim().split(/\s+/).slice(0, 5)
    return words.length > 0 ? words.join(" ") : "New Chat"
  }
}

/**
 * Generate a concise title from an image generation prompt using AI
 * @param prompt - The image generation prompt
 * @param userId - Optional user ID for custom API key lookup
 * @returns A short, concise title (3-8 words)
 */
export async function generateTitleFromPrompt(
  prompt: string,
  userId?: string
): Promise<string> {
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("prompt is required and must be a non-empty string")
  }

  // Get user-specific or default OpenAI API key
  const apiKey = userId ? await getEffectiveApiKey(userId, "openai") : undefined
  const model = apiKey
    ? createOpenAI({ apiKey })("gpt-4o-mini")
    : openai("gpt-4o-mini")

  // Use OpenAI GPT-4o Mini (fast and cost-effective)
  const { text } = await generateText({
    model,
    system:
      "You are a professional image title generator. " +
      "You write simple, clear, and concise titles. " +
      "Generate a short title (3-8 words) based on the image description prompt. " +
      "Return ONLY the title text, nothing else.",
    prompt: `Generate a concise title for an image described as: ${prompt}`,
  })

  // Clean up the response (remove quotes, extra whitespace)
  const title = text.trim().replace(/^["']|["']$/g, "")

  return title
}
