"use client"

import { useState, useEffect } from "react"
import { getProject, type ProjectWithChats } from "./api"
import { useUser } from "@/lib/user-store/provider"

export function useProject(projectId: string) {
  const { user } = useUser()
  const [project, setProject] = useState<ProjectWithChats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user?.id || !projectId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        setIsLoading(true)
        const data = await getProject(projectId, user.id)
        if (!cancelled) {
          setProject(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to load project"))
          setProject(null)
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
  }, [projectId, user?.id])

  return { project, isLoading, error }
}
