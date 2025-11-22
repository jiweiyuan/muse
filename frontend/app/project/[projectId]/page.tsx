"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ConversationChat } from "@/app/components/chat/conversation-chat"
import { CanvasContainer } from "@/app/components/canvas/canvas-container"
import { NoHeaderLayout } from "@/app/components/layout/no-header-layout"
import { ProjectHeader } from "@/app/components/projects/project-header"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useProjects } from "@/lib/projects/provider"
import { useProjectStore } from "@/lib/project-store"
import { useUser } from "@/lib/user-store/provider"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { API_BASE } from "@/lib/routes"

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { getChatById, chats, isLoading: isChatsLoading, loadProjectChats } = useChats()
  const { getProjectById } = useProjects()
  const {
    activeChatId,
    activeChatData,
    activeCanvasId,
    setActiveProject,
    clearActiveProject,
    setActiveChatId,
    setActiveChatData,
    setActiveCanvasId,
  } = useProjectStore()
  const { toggleChatVisible } = useCanvasStore()
  const { user } = useUser()

  // Track canvasId (might need to be created if project doesn't have one)
  const [ensuredCanvasId, setEnsuredCanvasId] = useState<string | null>(null)

  // Track which project we've loaded to prevent duplicate requests
  const loadedProjectIdRef = useRef<string | null>(null)
  const canvasCreationAttemptedRef = useRef(false)

  // In project context, chatId comes from the project store
  const chatId = activeChatId

  // Get project chats
  const projectChats = useMemo(
    () => chats.filter(chat => chat.projectId === projectId),
    [chats, projectId]
  )

  // Load project-specific chats on mount or when projectId changes
  useEffect(() => {
    if (!user?.id || !projectId) return

    // Only load if we haven't already loaded this project
    if (loadedProjectIdRef.current === projectId) return

    loadedProjectIdRef.current = projectId
    loadProjectChats(projectId, user.id)
  }, [projectId, user?.id, loadProjectChats])

  // Set active project when entering this page
  useEffect(() => {
    setActiveProject(projectId, activeChatId)

    // Cleanup: clear active project when leaving
    return () => {
      clearActiveProject()
    }
  }, [projectId, activeChatId, setActiveProject, clearActiveProject])

  // Auto-select the most recent chat when chats are loaded
  const mostRecentChatId = projectChats.length > 0 ? projectChats[0].id : null

  useEffect(() => {
    // Wait for chats to load
    if (isChatsLoading) return

    // If no active chat is set but project has chats, select the most recent one
    if (!activeChatId && mostRecentChatId) {
      setActiveChatId(mostRecentChatId)
    }
  }, [isChatsLoading, activeChatId, mostRecentChatId, setActiveChatId])

  // Get project and chat data - memoize to re-compute when dependencies change
  const project = useMemo(
    () => getProjectById(projectId),
    [projectId, getProjectById]
  )

  const currentChat = useMemo(
    () => (chatId ? getChatById(chatId) : null),
    [chatId, getChatById]
  )

  // Sync current chat data to Zustand store when it changes
  useEffect(() => {
    if (currentChat && currentChat.id === activeChatId) {
      setActiveChatData({
        id: currentChat.id,
        title: currentChat.title || "New Chat",
        canvasId: currentChat.canvasId,
      })
    }
  }, [currentChat, activeChatId, setActiveChatData])

  // Use canvas from Zustand store first (most reliable), then project, chat, or ensured canvas
  const canvasId = activeCanvasId || project?.canvasId || currentChat?.canvasId || ensuredCanvasId

  // Sync canvasId to Zustand store
  useEffect(() => {
    const resolvedCanvasId = project?.canvasId || currentChat?.canvasId || ensuredCanvasId
    if (resolvedCanvasId && resolvedCanvasId !== activeCanvasId) {
      setActiveCanvasId(resolvedCanvasId)
    }
  }, [project?.canvasId, currentChat?.canvasId, ensuredCanvasId, activeCanvasId, setActiveCanvasId])

  // Debug logging
  useEffect(() => {
    console.log('[ProjectPage] State:', {
      projectId,
      activeChatId,
      chatId,
      activeChatTitle: activeChatData?.title,
      projectCanvasId: project?.canvasId,
      chatCanvasId: currentChat?.canvasId,
      activeCanvasId,
      ensuredCanvasId,
      finalCanvasId: canvasId,
      isChatsLoading,
      projectChatsCount: projectChats.length
    })
  }, [projectId, activeChatId, chatId, activeChatData?.title, project?.canvasId, currentChat?.canvasId, activeCanvasId, ensuredCanvasId, canvasId, isChatsLoading, projectChats.length, project, currentChat])

  // Create canvas if project doesn't have one
  useEffect(() => {
    if (!projectId || !user?.id) return
    if (canvasCreationAttemptedRef.current) return

    // Check if we need to create a canvas
    const needsCanvas = project && !project.canvasId && !ensuredCanvasId

    if (needsCanvas) {
      canvasCreationAttemptedRef.current = true

      const createCanvasForProject = async () => {
        try {
          const response = await fetch(`${API_BASE}/v1/canvases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ projectId }),
          })

          if (!response.ok) {
            throw new Error("Failed to create canvas")
          }

          const canvas = await response.json()
          setEnsuredCanvasId(canvas.id)
        } catch (error) {
          console.error("Failed to create canvas for project:", error)
          canvasCreationAttemptedRef.current = false // Allow retry
        }
      }

      createCanvasForProject()
    }
  }, [projectId, project, user?.id, ensuredCanvasId])

  // Reset canvas creation flag when project changes
  useEffect(() => {
    canvasCreationAttemptedRef.current = false
    setEnsuredCanvasId(null)
  }, [projectId])

  // Handler for navigation - in project context, we don't navigate away
  // but we ensure the chat stays active in the project store
  const handleNavigate = useCallback((newChatId: string) => {
    // The chat ID is already set via setActiveChatId in useChatSubmit
    // This callback is just to satisfy the ConversationChat interface
    // and prevent any unwanted navigation
    console.log(`Chat ${newChatId} created in project ${projectId}`)
  }, [projectId])

  return (
    <MessagesProvider>
      <NoHeaderLayout>
        <ProjectHeader />

        {canvasId && (
          <CanvasContainer canvasId={canvasId}>
            <ConversationChat
              chatTitle={activeChatData?.title}
              onCollapse={toggleChatVisible}
              onNavigate={handleNavigate}
            />
          </CanvasContainer>
        )}
      </NoHeaderLayout>
    </MessagesProvider>
  )
}
