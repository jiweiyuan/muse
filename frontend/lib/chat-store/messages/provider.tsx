"use client"

import { toast } from "@/components/ui/toast"
import { useUser } from "@/lib/user-store/provider"
import { useProjectStore } from "@/lib/project-store"
import type { UIMessage } from "@ai-sdk/react"
import { createContext, useContext, useEffect, useState } from "react"
import { getMessagesFromDb } from "./api"

interface MessagesContextType {
  messages: UIMessage[]
  isLoading: boolean
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>
  refresh: () => Promise<void>
  appendMessage: (
    message: UIMessage,
    overrideChatId?: string | null
  ) => void
  resetMessages: () => void
}

export const MessagesContext = createContext<MessagesContextType | null>(null)

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context)
    throw new Error("useMessages must be used within MessagesProvider")
  return context
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { activeChatId: chatId, activeProjectId } = useProjectStore()
  const { user, isLoading: isUserLoading } = useUser()

  useEffect(() => {
    // Wait for user to load first to ensure auth/session is established
    if (isUserLoading) {
      setIsLoading(true)
      return
    }

    // Don't fetch messages if user is not authenticated
    if (!user) {
      setMessages([])
      setIsLoading(false)
      return
    }

    if (chatId === null) {
      setMessages([])
      setIsLoading(false)
      return
    }

    // IMPORTANT: Clear messages immediately when chatId changes to prevent showing old messages
    setMessages([])
    setIsLoading(true)

    const load = async () => {
      if (!activeProjectId) {
        setIsLoading(false)
        return
      }
      try {
        const fresh = await getMessagesFromDb(activeProjectId, chatId)
        setMessages(fresh)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [chatId, isUserLoading, user, activeProjectId])

  const refresh = async () => {
    if (!chatId || !activeProjectId) return

    try {
      const fresh = await getMessagesFromDb(activeProjectId, chatId)
      setMessages(fresh)
    } catch {
      toast({ title: "Failed to refresh messages", status: "error" })
    }
  }

  const appendMessage = (
    message: UIMessage,
    overrideChatId?: string | null
  ) => {
    const targetChatId = overrideChatId ?? chatId
    if (!targetChatId) return

    // Only update local state if it's for the current chat
    if (targetChatId === chatId) {
      setMessages((prev) => [...prev, message])
    }
  }

  const resetMessages = () => {
    setMessages([])
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        isLoading,
        setMessages,
        refresh,
        appendMessage,
        resetMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}
