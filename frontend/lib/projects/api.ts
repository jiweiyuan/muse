import type { ProjectSchema, ChatSchema } from "@muse/shared-schemas"
import { fetchClient } from "../fetch"

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
).replace(/\/+$/, "")

// Use shared schema types
export type Project = ProjectSchema

export interface ProjectWithChats extends Project {
  chats: ChatSchema[]
}

export async function createProject(
  userId: string,
  name?: string
): Promise<Project> {
  const res = await fetchClient(`${API_BASE}/v1/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, name }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to create project")
  }

  return data.project
}

export async function listProjects(userId: string): Promise<Project[]> {
  const res = await fetchClient(
    `${API_BASE}/v1/projects?userId=${userId}&limit=50`,
    {
      method: "GET",
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to list projects")
  }

  return data.projects
}

export async function getProject(
  projectId: string,
  userId: string
): Promise<ProjectWithChats> {
  const res = await fetchClient(
    `${API_BASE}/v1/projects/${projectId}?userId=${userId}`,
    {
      method: "GET",
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to get project")
  }

  return data.project
}

export async function updateProjectName(
  projectId: string,
  userId: string,
  name: string
): Promise<Project> {
  const res = await fetchClient(`${API_BASE}/v1/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, name }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to update project name")
  }

  return data.project
}

export async function updateProjectCover(
  projectId: string,
  userId: string,
  coverUrl: string | null
): Promise<Project> {
  const res = await fetchClient(`${API_BASE}/v1/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, coverUrl }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to update project cover")
  }

  return data.project
}

export async function deleteProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  const res = await fetchClient(`${API_BASE}/v1/projects/${projectId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete project")
  }

  return data.deleted
}

export interface ProjectAsset {
  id: string
  type: "image" | "video" | "audio"
  url: string
  name?: string
  width?: number
  height?: number
  duration?: number
  x: number
  y: number
}

export async function getProjectAssets(
  projectId: string,
  userId: string
): Promise<ProjectAsset[]> {
  const res = await fetchClient(
    `${API_BASE}/v1/projects/${projectId}/assets?userId=${userId}`,
    {
      method: "GET",
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to get project assets")
  }

  return data.assets
}
