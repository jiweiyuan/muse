import { Attachment } from "@ai-sdk/ui-utils"
import { asc, eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { messages } from "../infra/db/schema.js"
import { sanitizeUserInput } from "./sanitize.js"
import { ContentPart, MessagePayload } from "../types/messages.js"

export async function logUserMessage({
  userId,
  chatId,
  content,
  parts,
  attachments,
  messageGroupId,
}: {
  userId: string
  chatId: string
  content: string
  parts?: any[]
  attachments?: Attachment[]
  messageGroupId?: string
}) {
  await db.insert(messages).values({
    chatId,
    role: "user",
    content: sanitizeUserInput(content),
    parts: parts || null,
    experimentalAttachments: attachments || null,
    messageGroupId: messageGroupId || null,
  })
}

export async function saveAssistantMessage({
  chatId,
  messages: payload,
  messageGroupId,
  model,
}: {
  chatId: string
  messages: MessagePayload[]
  messageGroupId?: string
  model?: string
}) {
  const parts: ContentPart[] = []
  const toolMap = new Map<string, any>()
  const textParts: string[] = []

  for (const msg of payload) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content as any[]) {
        if (part.type === "text") {
          textParts.push(part.text || "")
          parts.push(part)
        }
        // AI SDK 5.0 format: tool parts have types like "tool-{toolName}" or "dynamic-tool"
        else if (part.type?.startsWith("tool-") || part.type === "dynamic-tool") {
          const toolCallId = part.toolCallId || ""
          if (!toolCallId) continue

          // Keep the most recent state for each tool call
          const existing = toolMap.get(toolCallId)
          const existingState = existing?.state || ""
          const currentState = part.state || ""

          // Priority: output-available > input-available > input-streaming
          const shouldUpdate =
            !existing ||
            currentState === "output-available" ||
            (currentState === "input-available" && existingState === "input-streaming")

          if (shouldUpdate) {
            toolMap.set(toolCallId, part)
          }
        }
        // Fallback for old format
        else if (part.type === "tool-invocation" && part.toolInvocation) {
          const { toolCallId, state } = part.toolInvocation
          if (!toolCallId) continue

          const existing = toolMap.get(toolCallId)
          if (state === "result" || !existing) {
            toolMap.set(toolCallId, part)
          }
        }
        else if (part.type === "reasoning") {
          parts.push({
            type: "reasoning",
            reasoning: part.text || "",
            details: [
              {
                type: "text",
                text: part.text || "",
              },
            ],
          })
        } else if (part.type === "step-start") {
          parts.push(part)
        }
      }
    } else if (msg.role === "tool" && Array.isArray(msg.content)) {
      for (const part of msg.content as any[]) {
        if (part.type === "tool-result") {
          const toolCallId = part.toolCallId || ""
          // Store as AI SDK 5.0 format
          toolMap.set(toolCallId, {
            type: `tool-${part.toolName || "unknown"}`,
            toolCallId,
            toolName: part.toolName || "",
            state: "output-available",
            output: part.result,
          })
        }
      }
    }
  }

  parts.push(...toolMap.values())
  const finalPlainText = textParts.join("\n\n")

  await db.insert(messages).values({
    chatId,
    role: "assistant",
    content: finalPlainText || "",
    parts,
    messageGroupId: messageGroupId || null,
    model: model || null,
  })
}

export async function clearMessageGroup(messageGroupId: string) {
  await db.delete(messages).where(eq(messages.messageGroupId, messageGroupId))
}

export async function getChatMessages(chatId: string) {
  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt))

  return chatMessages
}

export async function deleteChatMessages(chatId: string) {
  await db.delete(messages).where(eq(messages.chatId, chatId))
}

/**
 * Get the count of messages in a chat
 * Used to determine if title generation should occur
 */
export async function getChatMessageCount(chatId: string): Promise<number> {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))

  return result.length
}
