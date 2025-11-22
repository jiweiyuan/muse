"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useModel } from "@/app/components/chat/use-model"
import { useFileUpload } from "@/app/components/chat/use-file-upload"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { useChatSubmit } from "@/app/hooks/use-chat-submit"
import { useMessageHandlers } from "@/app/hooks/use-message-handlers"
import { toast } from "@/components/ui/toast"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useProjectStore } from "@/lib/project-store"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { API_BASE } from "@/lib/routes"
import { getModelInfo } from "@/lib/models"
import { usePendingMessageStore } from "@/lib/pending-message-store"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
import { generateAndUpdateChatTitle } from "@/lib/utils/generate-title"
import { useChat, UIMessage } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ConversationChatHeader } from "./conversation-chat-header"

// Deduplicate messages by ID (prevents duplicate key errors with resume streams)
const dedupeMessages = (messages: UIMessage[]) => {
  const seen = new Map<string, UIMessage>()
  // Keep the latest version of each message (in case of updates)
  messages.forEach(msg => {
    if (msg.id) {
      seen.set(msg.id, msg)
    }
  })
  return Array.from(seen.values())
}

interface ConversationChatProps {
  chatTitle?: string
  onCollapse?: () => void
  onNavigate?: (chatId: string) => void
}

/**
 * ConversationChat Component
 *
 * Responsibility: Existing chat conversation interface
 * - Loads messages from database
 * - Checks for pending message from Zustand (from home page navigation)
 * - Handles streaming responses
 * - Manages conversation history
 *
 * This component is ONLY used on chat pages (/c/[chatId]).
 * For the landing page, see HomeChat component.
 */
export function ConversationChat({ chatTitle, onCollapse, onNavigate }: ConversationChatProps = {}) {
  const { activeChatId: chatId, activeProjectId, activeChatData, switchToChat } = useProjectStore()

  const {
    getChatById,
    updateTitle,
    bumpChat,
    createNewChat,
    deleteChat,
    chats,
    isLoading: isChatsLoading,
  } = useChats()

  const currentChat = useMemo(
    () => (chatId ? getChatById(chatId) : null),
    [chatId, getChatById]
  )

  const {
    messages: initialMessages,
    appendMessage,
    isLoading: areMessagesLoading,
    resetMessages,
  } = useMessages()

  const { user, isLoading: isUserLoading } = useUser()

  // Zustand store for pending messages
  const {
    input: pendingInput,
    files: pendingFiles,
    model: pendingModel,
    enableSearch: pendingEnableSearch,
    hasPendingMessage,
    clearPendingMessage,
  } = usePendingMessageStore()

  // Draft management (persist input in localStorage)
  const { draftValue, clearDraft, setDraftValue } = useChatDraft(chatId)

  // File upload functionality
  const {
    files,
    setFiles,
    handleFileUploads,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()

  // Model selection
  const { selectedModel } = useModel({
    currentChat: currentChat || null,
    user,
    chatId,
  })

  // State
  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const [input, setInput] = useState(draftValue)

  // Refs (simplified - only keep essential ones)
  const hasSentPendingMessageRef = useRef(false)
  const latestChatIdRef = useRef<string | null>(chatId)
  const hasResumedStreamRef = useRef<string | null>(null)

  // Error handler
  const handleError = useCallback((error: Error) => {
    console.error("Chat error:", error)
    let errorMsg = error.message || "Something went wrong."

    if (errorMsg === "An error occurred" || errorMsg === "fetch failed") {
      errorMsg = "Something went wrong. Please try again."
    }

    toast({
      title: errorMsg,
      status: "error",
    })
  }, [])

  // Initialize useChat with Transport API
  const {
    messages: chatMessages,
    sendMessage,
    status,
    regenerate,
    stop,
    setMessages,
    resumeStream,
  } = useChat({
    id: chatId ?? undefined,
    resume: false, // Avoid duplicate resume calls under React Strict Mode; we handle resumption manually.
    transport: new DefaultChatTransport({
      api: chatId
        ? `${API_BASE}/v1/projects/${activeProjectId}/chats/${chatId}/stream`
        : "",
      credentials: "include",
      prepareReconnectToStreamRequest: ({ id }) => ({
        api: `${API_BASE}/v1/projects/${activeProjectId}/chats/${id}/stream`,
        credentials: "include",
      }),
    }),
    messages: initialMessages,
    onFinish: ({ message }) => {
      // Guard against undefined state during stream resumption
      if (message && latestChatIdRef.current) {
        appendMessage(message, latestChatIdRef.current)
      }
    },
    onError: handleError,
  })

  const messages = useMemo(
    () => dedupeMessages(chatMessages),
    [chatMessages]
  )

  useEffect(() => {
    // Keep the underlying chat state deduped so downstream handlers stay in sync
    if (chatMessages.length === 0) return

    const uniqueCount = new Set(chatMessages.map(message => message.id)).size
    if (uniqueCount !== chatMessages.length) {
      const deduped = dedupeMessages(chatMessages)
      setMessages(deduped)
    }
  }, [chatMessages, setMessages])

  // Resume stream effect (simplified)
  useEffect(() => {
    if (!chatId || areMessagesLoading || status !== "ready" || initialMessages.length === 0) {
      return
    }

    // Prevent duplicate resume attempts for the same chat
    if (hasResumedStreamRef.current === chatId) {
      return
    }

    // Only resume once when the chat is first loaded
    const hasIncompleteMessage = initialMessages.some(msg => {
      if (msg.role !== "assistant") return false
      // Check if message has no parts or empty parts
      return !msg.parts || msg.parts.length === 0 || msg.parts.every(part =>
        part.type === "text" && (!part.text || part.text === "")
      )
    })
    if (!hasIncompleteMessage) {
      return
    }

    // Mark this chat as having attempted resume
    hasResumedStreamRef.current = chatId

    // Resume any incomplete streams
    resumeStream().catch(error => {
      // Ignore known race conditions
      if (error instanceof TypeError && error.message.includes("reading 'state'")) {
        return
      }
      console.error("Failed to resume chat stream:", error)
    })
    // Only run when chatId changes or when loading completes, not on every message change
  }, [chatId, areMessagesLoading, status, resumeStream, initialMessages])

  // Message handlers (delete, edit, reload)
  const { handleEdit, handleReload } = useMessageHandlers({
    messages,
    setMessages,
    regenerate,
    userId: user?.id,
    chatId,
    selectedModel,
    isAuthenticated,
  })

  // Clear input and files
  const clearInput = useCallback(() => {
    setInput("")
    clearDraft()
  }, [clearDraft])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [setFiles])

  // Submit hook
  const { submit: submitMessage } = useChatSubmit({
    userId: user?.id,
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
    messagesLength: messages.length,
    updateChatTitle: updateTitle,
    onNavigate,
  })

  // Submit action
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await submitMessage()
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, submitMessage])

  // New chat handler (simplified)
  const handleNewChat = useCallback(async () => {
    if (!user?.id || !activeProjectId) {
      toast({
        title: "Cannot create new chat",
        status: "error",
      })
      return
    }

    try {
      const newChat = await createNewChat(
        activeProjectId,
        user.id,
        "New Chat",
        true,
        user.system_prompt || SYSTEM_PROMPT_DEFAULT
      )

      if (newChat) {
        // Clear input and files
        setInput("")
        clearDraft()
        setFiles([])

        // Clear messages immediately
        setMessages([])
        resetMessages()

        // Switch to new chat - single source of truth
        switchToChat({
          id: newChat.id,
          title: newChat.title,
          canvasId: newChat.canvasId || null,
        })
      }
    } catch (error) {
      console.error("Failed to create new chat:", error)
      toast({
        title: "Failed to create new chat",
        status: "error",
      })
    }
  }, [user, activeProjectId, createNewChat, setInput, clearDraft, setFiles, setMessages, resetMessages, switchToChat])

  // Chat selection handler (simplified)
  const handleChatSelect = useCallback((selectedChatId: string) => {
    if (selectedChatId === chatId) {
      return
    }

    const selectedChat = getChatById(selectedChatId)
    if (!selectedChat) {
      toast({
        title: "Chat not found",
        status: "error",
      })
      return
    }

    // Switch to selected chat - single source of truth
    switchToChat({
      id: selectedChat.id,
      title: selectedChat.title,
      canvasId: selectedChat.canvasId || null,
    })
  }, [chatId, getChatById, switchToChat])

  // Chat deletion handler
  const handleChatDelete = useCallback(async (chatIdToDelete: string) => {
    const isDeletingActiveChat = chatIdToDelete === chatId

    if (!activeProjectId) return

    try {
      await deleteChat(activeProjectId, chatIdToDelete, chatId ?? undefined, () => {
        // If deleting the active chat, navigate to the latest chat
        if (isDeletingActiveChat) {
          // Get the latest chat (excluding the one being deleted)
          const remainingChats = chats.filter(c => c.id !== chatIdToDelete)
          if (remainingChats.length > 0) {
            // Sort by updatedAt and get the most recent
            const latestChat = remainingChats.sort((a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )[0]
            switchToChat({
              id: latestChat.id,
              title: latestChat.title,
              canvasId: latestChat.canvasId || null,
            })
          } else {
            // No chats left, create a new one
            handleNewChat()
          }
        }
      })
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }, [deleteChat, chatId, chats, switchToChat, handleNewChat, activeProjectId])

  // Handle input change
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
      setDraftValue(value)
    },
    [setDraftValue]
  )

  // Sync input with draftValue when it changes
  useEffect(() => {
    setInput(draftValue)
  }, [draftValue])

  // Sync messages only when chatId changes (switching chats)
  useEffect(() => {
    // Don't sync if messages are still loading
    if (areMessagesLoading) {
      return
    }

    // Don't reset messages if we've already sent a pending message
    // This prevents the race condition where messages finish loading AFTER
    // the pending message is sent, which would wipe out the user's message
    if (hasSentPendingMessageRef.current) {
      return
    }

    // Set messages from database when switching to a different chat
    const dedupedMessages = dedupeMessages(initialMessages)
    setMessages(dedupedMessages)
    // Only run when chatId changes, not when initialMessages updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, areMessagesLoading, setMessages])

  useEffect(() => {
    latestChatIdRef.current = chatId
    // Reset resume ref when switching to a different chat
    if (hasResumedStreamRef.current !== chatId) {
      hasResumedStreamRef.current = null
    }
    // Reset pending message ref when switching chats
    hasSentPendingMessageRef.current = false
  }, [chatId])

  // Send pending message on mount (from home page navigation)
  useEffect(() => {
    if (
      hasPendingMessage() &&
      !hasSentPendingMessageRef.current &&
      chatId &&
      user?.id &&
      status === "ready"
    ) {
      hasSentPendingMessageRef.current = true

      // Set state from pending message
      setInput(pendingInput)
      if (pendingFiles.length > 0) {
        setFiles(pendingFiles)
      }
      setEnableSearch(pendingEnableSearch)

      // Submit the pending message
      const submitPendingMessage = async () => {
        try {
          const messagePayload = {
            role: "user" as const,
            parts: [{ type: "text" as const, text: pendingInput }],
          }

          const requestOptions = {
            body: {
              id: chatId,
              chatId,
              userId: user.id,
              model: pendingModel || selectedModel,
              isAuthenticated,
              enableSearch: pendingEnableSearch,
            },
          }

          sendMessage(messagePayload, requestOptions)

          // Generate title for first message from home page
          if (isAuthenticated && activeProjectId) {
            generateAndUpdateChatTitle(activeProjectId, chatId, user.id, pendingInput, updateTitle)
          }

          clearInput()
          clearPendingMessage()
        } catch (error) {
          console.error("Failed to send pending message:", error)
          hasSentPendingMessageRef.current = false
        }
      }

      submitPendingMessage()
    }
  }, [
    hasPendingMessage,
    chatId,
    user?.id,
    status,
    pendingInput,
    pendingFiles,
    pendingModel,
    pendingEnableSearch,
    selectedModel,
    isAuthenticated,
    sendMessage,
    clearInput,
    clearPendingMessage,
    setFiles,
    updateTitle,
  ])

  // Memoize the conversation props to prevent unnecessary rerenders
  const conversationProps = useMemo(
    () => ({
      messages,
      status,
      onEdit: handleEdit,
      onReload: handleReload,
      isLoading: areMessagesLoading,
    }),
    [messages, status, handleEdit, handleReload, areMessagesLoading]
  )

  // Memoize the chat input props
  const chatInputProps = useMemo(
    () => ({
      value: input,
      onValueChange: handleInputChange,
      onSend: handleSubmit,
      isSubmitting,
      files,
      onFileUpload: handleFileUpload,
      onFileRemove: handleFileRemove,
      isUserAuthenticated: isAuthenticated,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      hasSearchSupport: Boolean(getModelInfo(selectedModel)?.webSearch),
    }),
    [
      input,
      handleInputChange,
      handleSubmit,
      isSubmitting,
      files,
      handleFileUpload,
      handleFileRemove,
      isAuthenticated,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      selectedModel,
    ]
  )

  // Check if we should show skeleton (loading with no messages and not streaming)
  const showSkeleton = (areMessagesLoading || isChatsLoading || isUserLoading) && messages.length === 0 && status !== "streaming"

  // Filter chats by current project for chat history
  const projectChats = useMemo(
    () => chats.filter(chat => chat.projectId === activeProjectId),
    [chats, activeProjectId]
  )

  return (
    <div
      className={cn(
        "@container/main relative flex h-full w-full flex-col items-center overflow-hidden pb-1"
      )}
    >
      {/* Header */}
      <ConversationChatHeader
        title={chatTitle || activeChatData?.title || "New Chat"}
        onCollapse={onCollapse}
        onNewChat={handleNewChat}
        chatHistory={projectChats}
        activeChatId={chatId}
        onChatSelect={handleChatSelect}
        onChatDelete={handleChatDelete}
        isLoadingChats={isChatsLoading}
        isNewChat={messages.length === 0}
      />

      {/* Scrollable message area */}
      <div className="flex-1 w-full min-h-0 flex items-start justify-start overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {showSkeleton ? (
            <Conversation key="conversation" {...conversationProps} />
          ) : (
            <motion.div
              key="conversation-wrapper"
              className="h-full w-full"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Conversation key="conversation" {...conversationProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed chat input at bottom */}
      {!showSkeleton && (
        <motion.div
          className={cn(
            "relative z-50 w-full flex-shrink-0"
          )}
          layout="position"
          layoutId="chat-input-container"
          transition={{
            layout: {
              duration: messages.length === 1 ? 0.3 : 0,
            },
          }}
        >
          <ChatInput {...chatInputProps} />
        </motion.div>
      )}
    </div>
  )
}
