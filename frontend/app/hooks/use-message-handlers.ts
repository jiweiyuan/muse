import { UIMessage } from "@ai-sdk/react"
import { useCallback } from "react"

interface UseMessageHandlersProps {
  messages: UIMessage[]
  setMessages: (messages: UIMessage[]) => void
  regenerate: (requestOptions: {
    body: {
      id: string
      chatId: string
      userId: string
      model: string
      isAuthenticated: boolean
    }
  }) => void
  userId: string | undefined
  chatId: string | null
  selectedModel: string
  isAuthenticated: boolean
}

export function useMessageHandlers({
  messages,
  setMessages,
  regenerate,
  userId,
  chatId,
  selectedModel,
  isAuthenticated,
}: UseMessageHandlersProps) {
  const handleDelete = useCallback(
    (id: string) => {
      setMessages(messages.filter((message) => message.id !== id))
    },
    [messages, setMessages]
  )

  const handleEdit = useCallback(
    (id: string, newText: string) => {
      setMessages(
        messages.map((message) =>
          message.id === id
            ? {
                ...message,
                parts: [{ type: "text" as const, text: newText }],
              }
            : message
        )
      )
    },
    [messages, setMessages]
  )

  const handleReload = useCallback(async () => {
    if (!userId || !chatId) {
      return
    }

    const requestOptions = {
      body: {
        id: chatId,
        chatId,
        userId,
        model: selectedModel,
        isAuthenticated,
      },
    }

    regenerate(requestOptions)
  }, [userId, chatId, selectedModel, isAuthenticated, regenerate])

  return {
    handleDelete,
    handleEdit,
    handleReload,
  }
}
