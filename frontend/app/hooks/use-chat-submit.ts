import { toast } from "@/components/ui/toast"
import { Attachment } from "@/lib/file-handling"
import { MESSAGE_MAX_LENGTH, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { generateAndUpdateChatTitle } from "@/lib/utils/generate-title"
import { useProjectStore } from "@/lib/project-store"
import { useCallback, useRef } from "react"

interface UseChatSubmitProps {
  userId: string | undefined
  chatId: string | null
  input: string
  files: File[]
  selectedModel: string
  isAuthenticated: boolean
  enableSearch: boolean
  systemPrompt: string
  clearInput: () => void
  clearFiles: () => void
  handleFileUploads: (uid: string, chatId: string) => Promise<Attachment[] | null>
  createNewChat: (
    projectId: string,
    userId: string,
    title?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string
  ) => Promise<{ id: string } | undefined>
  sendMessage: (
    messagePayload: {
      role: "user"
      parts: Array<
        { type: "text"; text: string } | { type: "file"; url: string; mediaType: string }
      >
    },
    requestOptions: {
      body: {
        id: string
        chatId: string
        userId: string
        model: string
        isAuthenticated: boolean
        enableSearch?: boolean
      }
    }
  ) => void
  bumpChat?: (chatId: string) => void
  onNavigate?: (chatId: string) => void
  messagesLength: number
  updateChatTitle?: (projectId: string, chatId: string, title: string) => void
}

export function useChatSubmit({
  userId,
  chatId,
  input,
  files,
  selectedModel,
  isAuthenticated,
  enableSearch,
  systemPrompt,
  clearInput,
  clearFiles,
  handleFileUploads,
  createNewChat,
  sendMessage,
  bumpChat,
  onNavigate,
  messagesLength,
  updateChatTitle,
}: UseChatSubmitProps) {
  const latestChatIdRef = useRef<string | null>(chatId)
  const hasSentFirstMessageRef = useRef(false)
  const titleGeneratedForChatsRef = useRef<Set<string>>(new Set())
  const { activeProjectId, setActiveChatId } = useProjectStore()

  const ensureChatExists = useCallback(
    async (uid: string, inputText: string) => {
      // If we already have a chatId, use it (e.g., from button-created projects)
      if (chatId) {
        return chatId
      }

      if (!isAuthenticated) {
        const storedGuestChatId = localStorage.getItem("guestChatId")
        if (storedGuestChatId) return storedGuestChatId
      }

      // Only create a new chat if we don't have one
      if (messagesLength === 0) {
        if (!activeProjectId) {
          toast({ title: "No active project", status: "error" })
          return null
        }
        try {
          const newChat = await createNewChat(
            activeProjectId,
            uid,
            inputText,
            isAuthenticated,
            systemPrompt || SYSTEM_PROMPT_DEFAULT
          )

          if (!newChat) return null

          // Store the chat ID in project store if we're in a project context
          if (activeProjectId && newChat.id) {
            setActiveChatId(newChat.id)
          }

          if (!isAuthenticated) {
            localStorage.setItem("guestChatId", newChat.id)
          }

          return newChat.id
        } catch (err: unknown) {
          let errorMessage = "Something went wrong."
          try {
            const errorObj = err as { message?: string }
            if (errorObj.message) {
              const parsed = JSON.parse(errorObj.message)
              errorMessage = parsed.error || errorMessage
            }
          } catch {
            const errorObj = err as { message?: string }
            errorMessage = errorObj.message || errorMessage
          }
          toast({
            title: errorMessage,
            status: "error",
          })
          return null
        }
      }

      return chatId
    },
    [
      isAuthenticated,
      messagesLength,
      createNewChat,
      systemPrompt,
      chatId,
      activeProjectId,
      setActiveChatId,
    ]
  )

  const submit = useCallback(async () => {
    if (!userId) {
      return false
    }

    const currentInput = input

    try {
      if (!currentInput.trim() && files.length === 0) {
        return false
      }

      if (currentInput.length > MESSAGE_MAX_LENGTH) {
        toast({
          title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
          status: "error",
        })
        return false
      }

      const currentChatId = await ensureChatExists(userId, currentInput)
      if (!currentChatId) {
        return false
      }

      latestChatIdRef.current = currentChatId
      if (!chatId) {
        hasSentFirstMessageRef.current = true
      }

      let attachments: Attachment[] = []
      if (files.length > 0) {
        const uploaded = await handleFileUploads(userId, currentChatId)
        if (uploaded === null) {
          return false
        }
        attachments = uploaded
      }

      // Create message payload with parts array (AI SDK v5 format)
      const messageParts: Array<
        { type: "text"; text: string } | { type: "file"; url: string; mediaType: string }
      > = [{ type: "text" as const, text: currentInput }]

      // Add file parts from uploaded attachments
      if (attachments && attachments.length > 0) {
        attachments.forEach((attachment) => {
          messageParts.push({
            type: "file" as const,
            url: attachment.url,
            mediaType: attachment.contentType,
          })
        })
      }

      const messagePayload = {
        role: "user" as const,
        parts: messageParts,
      }

      const requestOptions = {
        body: {
          id: currentChatId,
          chatId: currentChatId,
          userId,
          model: selectedModel,
          isAuthenticated,
          enableSearch,
        },
      }

      clearInput()
      clearFiles()

      sendMessage(messagePayload, requestOptions)

      // Generate title for the first message (in background, don't block)
      // Only generate if we haven't already generated a title for this chat
      const shouldGenerateTitle =
        isAuthenticated &&
        !titleGeneratedForChatsRef.current.has(currentChatId) &&
        messagesLength === 0

      if (shouldGenerateTitle && activeProjectId) {
        titleGeneratedForChatsRef.current.add(currentChatId)
        generateAndUpdateChatTitle(
          activeProjectId,
          currentChatId,
          userId,
          currentInput,
          updateChatTitle,
          (titleChatId) => latestChatIdRef.current === titleChatId
        )
      }

      // Navigate to the new chat after sending message (for creating first message)
      if (isAuthenticated && !chatId && currentChatId && onNavigate) {
        onNavigate(currentChatId)
      }

      if (messagesLength > 0 && bumpChat) {
        bumpChat(currentChatId)
      }

      return true
    } catch (error) {
      if (!chatId) {
        hasSentFirstMessageRef.current = false
      }
      console.error("Submit error:", error)
      toast({ title: "Failed to send message", status: "error" })
      return false
    }
  }, [
    userId,
    input,
    files,
    selectedModel,
    isAuthenticated,
    enableSearch,
    clearInput,
    clearFiles,
    handleFileUploads,
    sendMessage,
    ensureChatExists,
    bumpChat,
    onNavigate,
    messagesLength,
    chatId,
    updateChatTitle,
    activeProjectId,
  ])

  return { submit, latestChatIdRef }
}
