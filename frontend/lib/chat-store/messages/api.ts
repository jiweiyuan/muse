import { fetchClient } from "@/lib/fetch"
import { API_BASE } from "@/lib/routes"
import type { UIMessage } from "@ai-sdk/react"

type MessageRecord = Partial<UIMessage> & {
  id: string | number
  createdAt?: string | number | Date | null
  messageGroupId?: string | null
  model?: string | null
  content?: string
}

function adaptMessageRecord(message: MessageRecord): UIMessage {
  const {
    messageGroupId,
    createdAt,
    content,
    ...rest
  } = message;

  const resolvedCreatedAt = createdAt ?? new Date()

  // Convert old content format to new parts format if needed
  let parts = message.parts || []
  if (parts.length === 0 && content) {
    parts = [{ type: "text", text: content }]
  }

  return {
    ...rest,
    id: String(message.id),
    role: message.role || "assistant",
    parts,
    createdAt: new Date(resolvedCreatedAt),
    message_group_id: messageGroupId,
    model: typeof message.model === "string" ? message.model : undefined,
  } as UIMessage;
}

export async function getMessagesFromDb(
  projectId: string,
  chatId: string
): Promise<UIMessage[]> {
  try {
    const response = await fetchClient(
      `${API_BASE}/v1/projects/${projectId}/chats/${chatId}/messages`
    )
    if (!response.ok) {
      throw new Error("Failed to fetch messages")
    }

    const data = await response.json()
    const messages = Array.isArray(data.messages) ? data.messages : []

    return messages.map(adaptMessageRecord)
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return []
  }
}
