"use client"

import { toast } from "@/components/ui/toast"
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"
import { useUser } from "@/lib/user-store/provider"
import {
  createProject as createProjectAPI,
  listProjects as listProjectsAPI,
  updateProjectName as updateProjectNameAPI,
  updateProjectCover as updateProjectCoverAPI,
  deleteProject as deleteProjectAPI,
  type Project,
} from "./api"

interface ProjectsContextType {
  projects: Project[]
  isLoading: boolean
  refresh: () => Promise<void>
  createProject: (name?: string) => Promise<Project | undefined>
  updateProjectName: (projectId: string, name: string) => Promise<void>
  updateProjectCover: (projectId: string, coverUrl: string | null) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  getProjectById: (id: string) => Project | undefined
}

const ProjectsContext = createContext<ProjectsContextType | null>(null)

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects must be used within ProjectsProvider")
  }
  return context
}

export function ProjectsProvider({
  userId,
  children,
}: {
  userId?: string
  children: React.ReactNode
}) {
  const { user } = useUser()
  const resolvedUserId = userId ?? user?.id
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])

  useLayoutEffect(() => {
    setIsLoading(true)

    if (!resolvedUserId) {
      setProjects([])
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const data = await listProjectsAPI(resolvedUserId)
        if (!cancelled) {
          setProjects(data)
        }
      } catch (error) {
        console.error("Failed to load projects:", error)
        if (!cancelled) {
          setProjects([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [resolvedUserId])

  const refresh = useCallback(async () => {
    if (!resolvedUserId) return

    try {
      const data = await listProjectsAPI(resolvedUserId)
      setProjects(data)
    } catch (error) {
      console.error("Failed to refresh projects:", error)
      toast({ title: "Failed to refresh projects", status: "error" })
    }
  }, [resolvedUserId])

  const createProject = useCallback(async (name?: string): Promise<Project | undefined> => {
    if (!resolvedUserId) {
      toast({ title: "You must be logged in to create a project", status: "error" })
      return
    }

    try {
      const project = await createProjectAPI(resolvedUserId, name)
      setProjects((prev) => [project, ...prev])
      return project
    } catch (error) {
      console.error("Failed to create project:", error)
      toast({ title: "Failed to create project", status: "error" })
      return undefined
    }
  }, [resolvedUserId])

  const updateProjectName = useCallback(async (projectId: string, name: string) => {
    if (!resolvedUserId) return

    try {
      const updated = await updateProjectNameAPI(projectId, resolvedUserId, name)
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p))
      )
      toast({ title: "Project name updated", status: "success" })
    } catch (error) {
      console.error("Failed to update project name:", error)
      toast({ title: "Failed to update project name", status: "error" })
    }
  }, [resolvedUserId])

  const updateProjectCover = useCallback(async (
    projectId: string,
    coverUrl: string | null
  ) => {
    if (!resolvedUserId) return

    try {
      const updated = await updateProjectCoverAPI(projectId, resolvedUserId, coverUrl)
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p))
      )
    } catch (error) {
      console.error("Failed to update project cover:", error)
      toast({ title: "Failed to update project cover", status: "error" })
    }
  }, [resolvedUserId])

  const deleteProject = useCallback(async (projectId: string) => {
    if (!resolvedUserId) return

    try {
      await deleteProjectAPI(projectId, resolvedUserId)
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      toast({ title: "Project deleted", status: "success" })
    } catch (error) {
      console.error("Failed to delete project:", error)
      toast({ title: "Failed to delete project", status: "error" })
    }
  }, [resolvedUserId])

  const getProjectById = useCallback((id: string): Project | undefined => {
    return projects.find((p) => p.id === id)
  }, [projects])

  const value = useMemo(
    () => ({
      projects,
      isLoading,
      refresh,
      createProject,
      updateProjectName,
      updateProjectCover,
      deleteProject,
      getProjectById,
    }),
    [
      projects,
      isLoading,
      refresh,
      createProject,
      updateProjectName,
      updateProjectCover,
      deleteProject,
      getProjectById,
    ]
  )

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  )
}
