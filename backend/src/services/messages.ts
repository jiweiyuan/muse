import { Attachment } from "@ai-sdk/ui-utils"
import { asc, eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { messages } from "../infra/db/schema.js"
import { sanitizeUserInput } from "./sanitize.js"
import { ContentPart, MessagePayload } from "../types/messages.js"

const DEFAULT_STEP = 0

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
  const toolMap = new Map<string, ContentPart>()
  const textParts: string[] = []

  for (const msg of payload) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") {
          textParts.push(part.text || "")
          parts.push(part)
        } else if (part.type === "tool-invocation" && part.toolInvocation) {
          const { toolCallId, state } = part.toolInvocation
          if (!toolCallId) continue

          const existing = toolMap.get(toolCallId)
          if (state === "result" || !existing) {
            toolMap.set(toolCallId, {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                args: part.toolInvocation?.args || {},
              },
            })
          }
        } else if (part.type === "reasoning") {
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
      for (const part of msg.content) {
        if (part.type === "tool-result") {
          const toolCallId = part.toolCallId || ""
          toolMap.set(toolCallId, {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              step: DEFAULT_STEP,
              toolCallId,
              toolName: part.toolName || "",
              result: part.result,
            },
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
