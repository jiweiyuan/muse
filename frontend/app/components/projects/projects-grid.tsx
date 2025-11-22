"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/lib/projects/provider"
import { useProjectStore } from "@/lib/project-store"
import { useUser } from "@/lib/user-store/provider"
import { ProjectCard, CreateProjectCard } from "./project-card"

interface ProjectsGridProps {
  limitRecent?: boolean
}

export function ProjectsGrid({ limitRecent = false }: ProjectsGridProps) {
  const router = useRouter()
  const { projects, isLoading, createProject } = useProjects()
  const { setActiveChatId } = useProjectStore()
  const { user } = useUser()
  const [maxItems, setMaxItems] = useState(6) // default to 2xl

  useEffect(() => {
    if (!limitRecent) return

    const updateMaxItems = () => {
      const width = window.innerWidth
      if (width >= 1536) {
        setMaxItems(6) // 2xl: 1 create + 5 projects
      } else if (width >= 1280) {
        setMaxItems(5) // xl: 1 create + 4 projects
      } else if (width >= 1024) {
        setMaxItems(4) // lg: 1 create + 3 projects
      } else if (width >= 768) {
        setMaxItems(3) // md: 1 create + 2 projects
      } else {
        setMaxItems(2) // sm: 1 create + 1 project
      }
    }

    updateMaxItems()
    window.addEventListener("resize", updateMaxItems)
    return () => window.removeEventListener("resize", updateMaxItems)
  }, [limitRecent])

  const handleCreateProject = async () => {
    console.log('[ProjectsGrid] handleCreateProject called')

    if (!user?.id) {
      console.error('[ProjectsGrid] No user ID available')
      return
    }

    try {
      // Create the project (backend now creates canvas AND chat automatically)
      console.log('[ProjectsGrid] Creating project...')
      const project = await createProject()

      if (!project?.id) {
        console.error('[ProjectsGrid] Failed to create project')
        return
      }

      console.log('[ProjectsGrid] Created project:', project.id)

      // Backend now returns chatId in the response
      if (project.chatId) {
        console.log('[ProjectsGrid] Setting active chat:', project.chatId)
        setActiveChatId(project.chatId)
      } else {
        console.warn('[ProjectsGrid] No chatId in project response')
      }

      // Navigate to the project page
      console.log('[ProjectsGrid] Navigating to project page')
      router.push(`/project/${project.id}`)
    } catch (error) {
      console.error('[ProjectsGrid] Error creating project:', error)
    }
  }

  // Limit projects based on screen size (maxItems includes the create card)
  const displayProjects = limitRecent
    ? projects.slice(0, maxItems - 1)
    : projects

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {Array.from({ length: limitRecent ? 4 : 6 }).map((_, i) => (
          <div
            key={i}
            className="w-full h-[180px] rounded-xl border border-border bg-muted animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {/* Create new project card */}
      <CreateProjectCard onClick={handleCreateProject} />

      {/* Existing projects */}
      {displayProjects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
