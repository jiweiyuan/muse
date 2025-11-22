"use client"

import { toast } from "@/components/ui/toast"
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react"
import { useUser } from "@/lib/user-store/provider"
import {  SYSTEM_PROMPT_DEFAULT } from "../../config"
import type { Chats } from "../types"
import {
  createChat,
  deleteChat as deleteChatOnServer,
  fetchChats,
  fetchProjectChats,
  updateChatTitle as updateChatTitleOnServer,
} from "./api"

interface ChatsContextType {
  chats: Chats[]
  refresh: (projectId: string) => Promise<void>
  isLoading: boolean
  updateTitle: (projectId: string, chatId: string, title: string) => Promise<void>
  deleteChat: (
    projectId: string,
    chatId: string,
    currentChatId?: string,
    redirect?: () => void
  ) => Promise<void>
  setChats: React.Dispatch<React.SetStateAction<Chats[]>>
  createNewChat: (
    projectId: string,
    userId: string,
    title?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string
  ) => Promise<Chats | undefined>
  resetChats: () => Promise<void>
  getChatById: (id: string) => Chats | undefined
  bumpChat: (id: string) => Promise<void>
  loadProjectChats: (projectId: string, userId: string) => Promise<void>
}
const ChatsContext = createContext<ChatsContextType | null>(null)

export function useChats() {
  const context = useContext(ChatsContext)
  if (!context) throw new Error("useChats must be used within ChatsProvider")
  return context
}

export function ChatsProvider({
  userId,
  children,
}: {
  userId?: string
  children: React.ReactNode
}) {
  const { user } = useUser()
  const resolvedUserId = userId ?? user?.id
  const [isLoading, setIsLoading] = useState(true)
  const [chats, setChats] = useState<Chats[]>([])

  useLayoutEffect(() => {
    // Don't auto-load chats without a projectId
    // Chats will be loaded via loadProjectChats when needed
    if (!resolvedUserId) {
      setChats([])
      setIsLoading(false)
      return
    }

    // Initialize as not loading since we're not fetching yet
    setIsLoading(false)
  }, [resolvedUserId])

  const refresh = async (projectId: string) => {
    if (!resolvedUserId) return

    const fresh = await fetchChats(projectId, resolvedUserId)
    setChats(fresh)
  }

  const updateTitle = async (projectId: string, chatId: string, title: string) => {
    const prev = [...chats]
    const updatedChatWithNewTitle = prev.map((c) =>
      c.id === chatId ? { ...c, title, updatedAt: new Date().toISOString() } : c
    )
    const sorted = updatedChatWithNewTitle.sort(
      (a, b) => +new Date(b.updatedAt || "") - +new Date(a.updatedAt || "")
    )
    setChats(sorted)
    try {
      await updateChatTitleOnServer(projectId, chatId, title)
    } catch {
      setChats(prev)
      toast({ title: "Failed to update title", status: "error" })
    }
  }

  const deleteChat = async (
    projectId: string,
    chatId: string,
    currentChatId?: string | null,
    redirect?: () => void
  ) => {
    const prev = [...chats]
    setChats((prev) => prev.filter((c) => c.id !== chatId))

    try {
      await deleteChatOnServer(projectId, chatId)
      if (chatId === currentChatId && redirect) redirect()
    } catch {
      setChats(prev)
      toast({ title: "Failed to delete chat", status: "error" })
    }
  }

  const createNewChat = async (
    projectId: string,
    userId: string,
    title?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string
  ) => {
    if (!userId) return
    try {
      const newChat = await createChat(
        projectId,
        userId,
        title,
        isAuthenticated,
        systemPrompt
      )

      setChats((prev) => {
        const withoutNewChat = prev.filter((chat) => chat.id !== newChat.id)
        const nextChats = [
          {
            ...newChat,
            systemPrompt: newChat.systemPrompt || SYSTEM_PROMPT_DEFAULT,
          },
          ...withoutNewChat,
        ]

        return nextChats.sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
          return bTime - aTime
        })
      })

      return newChat
    } catch {
      toast({ title: "Failed to create chat", status: "error" })
    }
  }

  const resetChats = async () => {
    setChats([])
  }

  const getChatById = useCallback((id: string) => {
    const chat = chats.find((c) => c.id === id)
    return chat
  }, [chats])

  const bumpChat = async (id: string) => {
    const prev = [...chats]
    const updatedChatWithNewUpdatedAt = prev.map((c) =>
      c.id === id ? { ...c, updatedAt: new Date().toISOString() } : c
    )
    const sorted = updatedChatWithNewUpdatedAt.sort(
      (a, b) => +new Date(b.updatedAt || "") - +new Date(a.updatedAt || "")
    )
    setChats(sorted)
  }

  const loadProjectChats = useCallback(async (projectId: string, userId: string) => {
    setIsLoading(true)
    try {
      const projectChats = await fetchProjectChats(projectId, userId)
      setChats(projectChats)
    } catch (error) {
      console.error("Failed to load project chats:", error)
      setChats([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <ChatsContext.Provider
      value={{
        chats,
        refresh,
        updateTitle,
        deleteChat,
        setChats,
        createNewChat,
        resetChats,
        getChatById,
        bumpChat,
        isLoading,
        loadProjectChats,
      }}
    >
      {children}
    </ChatsContext.Provider>
  )
}
