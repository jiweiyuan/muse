import { getMessagesFromDb } from "@/lib/chat-store/messages/api"
import type { UIMessage } from "@ai-sdk/react"
import { useCallback, useEffect, useRef, useState } from "react"

// Helper function to extract text content from message parts (AI SDK 5.0)
function getTextFromParts(parts: UIMessage["parts"]): string {
  if (!parts) return ""
  return parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("")
}

interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  createdAt: string
}

interface UseChatPreviewReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  fetchPreview: (projectId: string, chatId: string) => Promise<void>
  clearPreview: () => void
}

export function useChatPreview(): UseChatPreviewReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track current request to prevent race conditions
  const currentRequestRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPreview = useCallback(async (projectId: string, chatId: string) => {
    if (!chatId) return

    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Debounce the request to prevent rapid-fire calls
    debounceTimeoutRef.current = setTimeout(async () => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Set this as the current request
      currentRequestRef.current = chatId

      // Create new abort controller
      const controller = new AbortController()
      abortControllerRef.current = controller

      setError(null)
      setIsLoading(true)

      try {
        // Fetch from database
        const fresh = await getMessagesFromDb(projectId, chatId)
        if (
          fresh &&
          currentRequestRef.current === chatId &&
          !controller.signal.aborted
        ) {
          const freshMessages = fresh
            .slice(-5) // Get last 5 messages
            .map((msg) => ({
              id: msg.id,
              content: getTextFromParts(msg.parts),
              role: msg.role as "user" | "assistant",
              createdAt:
                (msg as { createdAt?: Date }).createdAt?.toISOString() || new Date().toISOString(),
            }))
          setMessages(freshMessages)
        }
      } catch (err) {
        // Only update error state if this is still the current request and not aborted
        if (
          currentRequestRef.current === chatId &&
          !controller.signal.aborted
        ) {
          console.error("Error fetching chat preview:", err)
          setError(
            err instanceof Error ? err.message : "Unknown error occurred"
          )
          setMessages([])
        }
      } finally {
        // Only update loading state if this is still the current request
        if (
          currentRequestRef.current === chatId &&
          !controller.signal.aborted
        ) {
          setIsLoading(false)
        }
      }
    }, 200) // 200ms debounce to prevent rapid calls
  }, [])

  const clearPreview = useCallback(() => {
    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Clear current request tracking
    currentRequestRef.current = null

    // Reset state
    setMessages([])
    setError(null)
    setIsLoading(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    isLoading,
    error,
    fetchPreview,
    clearPreview,
  }
}
