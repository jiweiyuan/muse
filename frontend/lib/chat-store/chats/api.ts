import type { Chats } from "@/lib/chat-store/types"
import { fetchClient } from "../../fetch"
import { API_BASE } from "../../routes"

type ChatRecord = {
  id: string
  title?: string | null
  userId?: string | null
  canvasId?: string | null
  projectId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  systemPrompt?: string | null
  public?: boolean | null
}

function adaptChatRecord(chat: ChatRecord): Chats {
  const createdAt = chat.createdAt ?? new Date().toISOString()
  const updatedAt = chat.updatedAt ?? chat.createdAt ?? new Date().toISOString()

  return {
    id: chat.id,
    title: chat.title ?? "New Chat",
    userId: chat.userId ?? "",
    canvasId: chat.canvasId ?? null,
    projectId: chat.projectId ?? null,
    activeStreamId: null, // Added for schema compatibility
    createdAt: createdAt,
    updatedAt: updatedAt,
    systemPrompt: chat.systemPrompt ?? null,
    public: chat.public ?? false,
  }
}

export async function fetchChats(projectId: string, userId: string): Promise<Chats[]> {
  try {
    const response = await fetchClient(
      `${API_BASE}/v1/projects/${projectId}/chats?userId=${userId}`
    )
    if (!response.ok) {
      throw new Error("Failed to fetch chats")
    }

    const data = await response.json()
    if (!Array.isArray(data.chats)) {
      return []
    }

    return data.chats.map(adaptChatRecord)
  } catch (error) {
    console.error("Failed to fetch chats:", error)
    return []
  }
}

export async function fetchProjectChats(projectId: string, userId: string): Promise<Chats[]> {
  try {
    const response = await fetchClient(
      `${API_BASE}/v1/projects/${projectId}/chats?userId=${userId}`
    )
    if (!response.ok) {
      throw new Error("Failed to fetch project chats")
    }

    const data = await response.json()
    if (!Array.isArray(data.chats)) {
      return []
    }

    return data.chats.map(adaptChatRecord)
  } catch (error) {
    console.error("Failed to fetch project chats:", error)
    return []
  }
}

export async function updateChatTitle(
  projectId: string,
  chatId: string,
  title: string
): Promise<void> {
  const response = await fetchClient(
    `${API_BASE}/v1/projects/${projectId}/chats/${chatId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || "Failed to update chat title")
  }
}

export async function deleteChat(projectId: string, chatId: string): Promise<void> {
  const response = await fetchClient(
    `${API_BASE}/v1/projects/${projectId}/chats/${chatId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || "Failed to delete chat")
  }
}

export async function createChat(
  projectId: string,
  userId: string,
  title?: string,
  isAuthenticated?: boolean,
  systemPrompt?: string
): Promise<Chats> {
  try {
    const payload: {
      userId: string
      title: string
      isAuthenticated?: boolean
      systemPrompt?: string
    } = {
      userId,
      title: title || "New Chat",
      isAuthenticated,
      systemPrompt,
    }

    const response = await fetchClient(
      `${API_BASE}/v1/projects/${projectId}/chats`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    const responseData = await response.json()

    if (!response.ok || !responseData.chat) {
      throw new Error(responseData.error || "Failed to create chat")
    }

    return adaptChatRecord(responseData.chat)
  } catch (error) {
    console.error("Error creating new chat:", error)
    throw error
  }
}
