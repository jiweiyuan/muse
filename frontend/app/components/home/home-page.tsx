"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { ChatInput } from "@/app/components/chat-input/chat-input"
import { useModel } from "@/app/components/chat/use-model"
import { useFileUpload } from "@/app/components/chat/use-file-upload"
import { ProjectsGrid } from "@/app/components/projects/projects-grid"
import { toast } from "@/components/ui/toast"
import { useProjects } from "@/lib/projects/provider"
import { usePendingMessageStore } from "@/lib/pending-message-store"
import { useProjectStore } from "@/lib/project-store"
import { useUser } from "@/lib/user-store/provider"
import { MuseIcon } from "@/components/icons"

export function HomePage() {
  const router = useRouter()
  const { user } = useUser()
  const { createProject } = useProjects()
  const { setPendingMessage } = usePendingMessageStore()
  const { setActiveProject } = useProjectStore()

  // File upload functionality
  const { files, handleFileUpload, handleFileRemove } = useFileUpload()

  // Model selection (simplified: always GPT-5)
  const { selectedModel } = useModel()

  const [input, setInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !user?.id || !input.trim()) {
      if (!user?.id) {
        toast({ title: "Please sign in to send messages", status: "error" })
      }
      return
    }

    setIsSubmitting(true)
    try {
      // Create project (backend now creates canvas AND chat automatically)
      const project = await createProject()
      if (!project) throw new Error("Failed to create project")

      // Backend now returns chatId in the response
      if (!project.chatId) {
        console.error("No chatId returned from createProject")
        throw new Error("Failed to create chat")
      }

      // Set the active project, chat, and canvas in project store BEFORE navigation
      setActiveProject(project.id, project.chatId, null, project.canvasId)

      // Set pending message so it will be sent after navigation
      setPendingMessage(input, files, selectedModel, false)

      // Navigate to project page
      router.push(`/project/${project.id}`)
    } catch (error) {
      console.error("Submit error:", error)
      toast({ title: "Failed to create project", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    user?.id,
    input,
    files,
    selectedModel,
    createProject,
    setActiveProject,
    setPendingMessage,
    router,
  ])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Welcome to Muse</h2>
          <p className="text-muted-foreground">Please sign in to continue</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        {/* Greeting Section */}
        <div className="mx-auto max-w-3xl mt-20 mb-12 text-center">
          <div className="flex justify-center mb-6">
            <MuseIcon width={64} height={64} />
          </div>
          <h1 className="text-2xl text-foreground">
            What are we creating today, {user?.display_name}?
          </h1>
        </div>

        {/* Chat Input Section */}
        <div className="mx-auto max-w-3xl mb-12">
          <div className="[&_textarea]:min-h-[72px] [&_textarea]:text-lg">
            <ChatInput
              value={input}
              onValueChange={setInput}
              onSend={handleSubmit}
              isSubmitting={isSubmitting}
              files={files}
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              isUserAuthenticated={!!user}
              stop={() => {}}
              status={isSubmitting ? "submitted" : "ready"}
              enableSearch={false}
              setEnableSearch={() => {}}
              hasSearchSupport={false}
            />
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-foreground">Recent Projects</h2>
            <button
              onClick={() => router.push('/projects')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View All →
            </button>
          </div>
          <ProjectsGrid limitRecent />
        </div>
      </div>
    </div>
  )
}
