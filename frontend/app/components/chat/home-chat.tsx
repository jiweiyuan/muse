"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { useModel } from "@/app/components/chat/use-model"
import { useFileUpload } from "@/app/components/chat/use-file-upload"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { toast } from "@/components/ui/toast"
import { useChats } from "@/lib/chat-store/chats/provider"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getModelInfo } from "@/lib/models"
import { usePendingMessageStore } from "@/lib/pending-message-store"
import { useUser } from "@/lib/user-store/provider"
import { useProjects } from "@/lib/projects/provider"
import { useProjectStore } from "@/lib/project-store"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

/**
 * HomeChat Component
 *
 * Responsibility: Landing page chat interface
 * - Shows onboarding UI
 * - Collects user input and files
 * - Creates new chat and navigates to /c/[chatId]
 *
 * This component is ONLY used on the home page (/).
 * For existing chat conversations, see ConversationChat component.
 */
export function HomeChat() {
  const router = useRouter()
  const { user } = useUser()
  const { createNewChat } = useChats()
  const { createProject } = useProjects()
  const { setPendingMessage } = usePendingMessageStore()
  const { setActiveProject } = useProjectStore()

  // Draft management (persist input in localStorage)
  const { draftValue, setDraftValue } = useChatDraft(null)

  // File upload functionality
  const {
    files,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()

  // Model selection
  const { selectedModel } = useModel({
    currentChat: null,
    user,
    chatId: null,
  })

  // State
  const [input, setInput] = useState(draftValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)
  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

  // Submit action - saves to Zustand and navigates
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !user?.id) {
      if (!user?.id) {
        toast({ title: "Please sign in to send messages", status: "error" })
      }
      return
    }

    setIsSubmitting(true)
    try {
      // Save pending message to Zustand
      setPendingMessage(input, files, selectedModel, enableSearch)

      // Create a new project first (required for chat creation)
      const project = await createProject("New Project")

      if (!project) {
        toast({ title: "Failed to create project", status: "error" })
        return
      }

      // Create chat with placeholder title (AI will generate real title after first message)
      const newChat = await createNewChat(
        project.id,
        user.id,
        "New Chat",
        isAuthenticated,
        systemPrompt
      )

      if (newChat) {
        // Set the active project and chat in the store
        setActiveProject(project.id, newChat.id)

        // Navigate to project page with the new chat
        router.push(`/project/${project.id}`)
      }
    } catch (error) {
      console.error("Submit error:", error)
      toast({ title: "Failed to create chat", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, user?.id, input, files, selectedModel, enableSearch, setPendingMessage, createProject, createNewChat, isAuthenticated, systemPrompt, setActiveProject, router])

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

  // Clear draft when component unmounts after successful navigation
  useEffect(() => {
    return () => {
      // Only clear if we're navigating away (not just re-rendering)
      if (isSubmitting) {
        const storageKey = "chat-draft-new"
        localStorage.removeItem(storageKey)
      }
    }
  }, [isSubmitting])

  // Chat input props
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
      stop: () => {}, // Not used in home page
      status: "ready" as const,
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
      setEnableSearch,
      enableSearch,
      selectedModel,
    ]
  )

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center justify-end md:justify-center"
      )}
    >
      {/* Onboarding Header */}
      <motion.div
        key="onboarding"
        className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        layout="position"
        layoutId="onboarding"
        transition={{
          layout: {
            duration: 0,
          },
        }}
      >
        <h1 className="mb-6 text-3xl font-medium tracking-tight">
          What&apos;s on your mind?
        </h1>
      </motion.div>

      {/* Chat Input */}
      <motion.div
        className={cn(
          "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
        )}
        layout="position"
        layoutId="chat-input-container"
      >
        <ChatInput {...chatInputProps} />
      </motion.div>
    </div>
  )
}
