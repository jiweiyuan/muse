"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import dayjs from "dayjs"
import { memo } from "react"
import { Project } from "@/lib/projects/api"
import { cn } from "@/lib/utils"
import { useProjectStore } from "@/lib/project-store"
import { fetchProjectChats } from "@/lib/chat-store/chats/api"
import { useUser } from "@/lib/user-store/provider"

interface ProjectCardProps {
  project: Project
  chatCount?: number
}

export const ProjectCard = memo(function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()
  const { setActiveChatId } = useProjectStore()
  const { user } = useUser()

  const handleClick = async () => {
    console.log('[ProjectCard] Clicked project:', project.id)
    console.trace('[ProjectCard] Click stack trace')

    // Fetch project chats and set the most recent one as active before navigation
    // This mirrors the behavior from home page and ensures the chat component
    // has proper context when the project page loads
    if (user?.id) {
      try {
        console.log('[ProjectCard] Fetching project chats for project:', project.id)
        const projectChats = await fetchProjectChats(project.id, user.id)
        console.log('[ProjectCard] Fetched chats:', projectChats.length)

        if (projectChats.length > 0) {
          // Set the most recent chat (first in the sorted array) as active
          console.log('[ProjectCard] Setting activeChatId to:', projectChats[0].id)
          setActiveChatId(projectChats[0].id)
        } else {
          console.log('[ProjectCard] No chats found for project')
        }
      } catch (error) {
        console.error("[ProjectCard] Failed to load project chats:", error)
        // Continue with navigation even if chat loading fails
      }
    } else {
      console.log('[ProjectCard] No user ID available')
    }

    console.log('[ProjectCard] Navigating to project page')
    router.push(`/project/${project.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group w-full rounded-xl bg-card overflow-hidden",
        "border-2 border-gray-200 dark:border-gray-800",
        "transition-all duration-200",
        "text-left"
      )}
    >
      {/* Cover image or placeholder */}
      <div className="w-full h-[140px] bg-gray-100 flex items-center justify-center p-3">
        {project.coverUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={project.coverUrl}
              alt={project.name}
              fill
              className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        ) : null}
      </div>

      {/* Project info */}
      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-1 mb-1">{project.name}</h3>
        <p className="text-xs text-muted-foreground">
          Updated {dayjs(project.lastEditAt).format('YYYY-MM-DD')}
        </p>
      </div>
    </button>
  )
})

export const CreateProjectCard = memo(function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full h-[220px] rounded-xl sm:rounded-2xl bg-card p-3 font-medium",
        "border-2 border-gray-200 dark:border-gray-800",
        "transition-all duration-300",
        "backdrop-blur-[16px]"
      )}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl bg-[#526D871A] hover:bg-[#526D8726] active:bg-[#526D8740] transition-all">
        <div className="relative flex items-center justify-center overflow-hidden rounded-full border border-foreground/10 bg-[#0E1014] p-2.5 text-white transition-all duration-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
            className="z-10 h-5 w-5"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M6.417 2.917a.583.583 0 0 1 1.166 0v3.5h3.5a.583.583 0 0 1 0 1.166h-3.5v3.5a.583.583 0 1 1-1.166 0v-3.5h-3.5a.583.583 0 1 1 0-1.166h3.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="text-foreground/90 text-sm font-semibold">New Project</div>
      </div>
    </button>
  )
})
